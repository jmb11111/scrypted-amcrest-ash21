// @ts-nocheck
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnvifServer = void 0;
const http = __importStar(require("http"));
const dgram = __importStar(require("dgram"));
const crypto = __importStar(require("crypto"));
const events_1 = require("events");
class OnvifServer extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.httpServer = null;
        this.discoverySocket = null;
        this.running = false;
        // Event proxy state
        this.pendingEvents = [];
        this.pullWaiters = [];
        this.nativeSubscriptionUrl = null;
        this.nativeProxyRunning = false;
        this.nativeRetryTimer = null;
        // ONVIF namespaces
        this.NS = {
            soap: 'http://www.w3.org/2003/05/soap-envelope',
            wsa: 'http://schemas.xmlsoap.org/ws/2004/08/addressing',
            wsd: 'http://schemas.xmlsoap.org/ws/2005/04/discovery',
            tds: 'http://www.onvif.org/ver10/device/wsdl',
            trt: 'http://www.onvif.org/ver10/media/wsdl',
            tptz: 'http://www.onvif.org/ver20/ptz/wsdl',
            tt: 'http://www.onvif.org/ver10/schema',
        };
        this.config = config;
        this.console = config.console || console;
    }
    async start() {
        if (this.running)
            return;
        await this.startHttpServer();
        await this.startDiscovery();
        this.running = true;
        this.console.log(`[ONVIF Server] Started on port ${this.config.httpPort}`);
        if (this.config.nativeCameraHost) {
            this.startNativeEventProxy();
        }
    }
    async stop() {
        this.running = false;
        this.nativeProxyRunning = false;
        if (this.nativeRetryTimer) {
            clearTimeout(this.nativeRetryTimer);
            this.nativeRetryTimer = null;
        }
        // Reject all waiting pull requests
        for (const waiter of this.pullWaiters) {
            clearTimeout(waiter.timer);
            waiter.resolve([]);
        }
        this.pullWaiters = [];
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }
        if (this.discoverySocket) {
            this.discoverySocket.close();
            this.discoverySocket = null;
        }
        this.console.log('[ONVIF Server] Stopped');
    }
    // ── Native camera event proxy ────────────────────────────────────────────
    startNativeEventProxy() {
        if (this.nativeProxyRunning)
            return;
        this.nativeProxyRunning = true;
        this.nativeEventProxyLoop();
    }
    async nativeEventProxyLoop() {
        if (!this.running || !this.config.nativeCameraHost)
            return;
        const host = this.config.nativeCameraHost;
        const username = this.config.nativeCameraUsername || 'admin';
        const password = this.config.nativeCameraPassword || '';
        try {
            const subscribeBody = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
  <s:Header>
    <wsa:Action>http://www.onvif.org/ver10/events/wsdl/EventPortType/CreatePullPointSubscriptionRequest</wsa:Action>
  </s:Header>
  <s:Body>
    <CreatePullPointSubscription xmlns="http://www.onvif.org/ver10/events/wsdl">
      <InitialTerminationTime>PT1H</InitialTerminationTime>
    </CreatePullPointSubscription>
  </s:Body>
</s:Envelope>`;
            const response = await this.httpDigestPost(`http://${host}/onvif/event_service`, username, password, subscribeBody);
            const urlMatch = response.match(/<(?:[^:>]+:)?Address[^>]*>\s*(http[^<\s]+)\s*<\/(?:[^:>]+:)?Address>/);
            if (!urlMatch)
                throw new Error('No subscription URL in response');
            this.nativeSubscriptionUrl = urlMatch[1].trim();
            this.console.log('[ONVIF Events] Subscribed to native camera:', this.nativeSubscriptionUrl);
            while (this.running) {
                await this.pollNativeEvents(username, password);
            }
        }
        catch (e) {
            this.console.error('[ONVIF Events] Proxy error:', e.message, '— retrying in 30s');
        }
        this.nativeSubscriptionUrl = null;
        if (this.running) {
            this.nativeRetryTimer = setTimeout(() => {
                this.nativeRetryTimer = null;
                this.nativeEventProxyLoop();
            }, 30000);
        }
    }
    async pollNativeEvents(username, password) {
        if (!this.nativeSubscriptionUrl)
            return;
        const pollBody = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <PullMessages xmlns="http://www.onvif.org/ver10/events/wsdl">
      <Timeout>PT30S</Timeout>
      <MessageLimit>100</MessageLimit>
    </PullMessages>
  </s:Body>
</s:Envelope>`;
        const response = await this.httpDigestPost(this.nativeSubscriptionUrl, username, password, pollBody, 35000);
        const notifications = response.match(/<(?:[^:>]+:)?NotificationMessage[\s\S]*?<\/(?:[^:>]+:)?NotificationMessage>/g) || [];
        for (const xml of notifications) {
            this.queueEvent({ xml, timestamp: new Date() });
        }
    }
    queueEvent(event) {
        this.pendingEvents.push(event);
        // Deliver to any waiting PullMessages requests
        while (this.pullWaiters.length > 0 && this.pendingEvents.length > 0) {
            const waiter = this.pullWaiters.shift();
            clearTimeout(waiter.timer);
            waiter.resolve(this.pendingEvents.splice(0));
        }
        // Bound queue size
        if (this.pendingEvents.length > 100) {
            this.pendingEvents.splice(0, this.pendingEvents.length - 100);
        }
    }
    // ── HTTP Digest auth helper ──────────────────────────────────────────────
    async httpDigestPost(url, username, password, body, timeoutMs = 10000) {
        const first = await this.httpPost(url, body, undefined, timeoutMs);
        if (first.status === 200)
            return first.body;
        if (first.status !== 401) {
            throw new Error(`HTTP ${first.status} from ${url}`);
        }
        const authHeader = first.headers['www-authenticate'] || '';
        const realm = authHeader.match(/realm="([^"]+)"/)?.[1];
        const nonce = authHeader.match(/nonce="([^"]+)"/)?.[1];
        const qop = authHeader.match(/qop="([^"]+)"/)?.[1];
        const opaque = authHeader.match(/opaque="([^"]+)"/)?.[1];
        if (!realm || !nonce)
            throw new Error(`Invalid WWW-Authenticate: ${authHeader}`);
        const parsedUrl = new URL(url);
        const uri = parsedUrl.pathname + parsedUrl.search;
        const nc = '00000001';
        const cnonce = crypto.randomBytes(4).toString('hex');
        const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
        const ha2 = crypto.createHash('md5').update(`POST:${uri}`).digest('hex');
        let digestResp;
        if (qop === 'auth' || qop === 'auth,auth-int') {
            digestResp = crypto.createHash('md5')
                .update(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`).digest('hex');
        }
        else {
            digestResp = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
        }
        let authValue = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${digestResp}"`;
        if (qop)
            authValue += `, qop=auth, nc=${nc}, cnonce="${cnonce}"`;
        if (opaque)
            authValue += `, opaque="${opaque}"`;
        const second = await this.httpPost(url, body, authValue, timeoutMs);
        if (second.status !== 200)
            throw new Error(`HTTP ${second.status} after digest auth`);
        return second.body;
    }
    httpPost(url, body, authorizationHeader, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const options = {
                hostname: parsedUrl.hostname,
                port: parseInt(parsedUrl.port) || 80,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(body),
                    ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
                },
                timeout: timeoutMs,
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => resolve({
                    status: res.statusCode || 0,
                    headers: res.headers,
                    body: data,
                }));
            });
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`HTTP timeout after ${timeoutMs}ms: ${url}`));
            });
            req.write(body);
            req.end();
        });
    }
    // ── HTTP server ──────────────────────────────────────────────────────────
    async startHttpServer() {
        return new Promise((resolve, reject) => {
            this.httpServer = http.createServer((req, res) => {
                this.handleHttpRequest(req, res);
            });
            this.httpServer.on('error', (err) => {
                this.console.error('[ONVIF Server] HTTP error:', err.message);
                reject(err);
            });
            this.httpServer.listen(this.config.httpPort, '0.0.0.0', () => resolve());
        });
    }
    async handleHttpRequest(req, res) {
        let body = '';
        req.on('data', (chunk) => (body += chunk.toString()));
        req.on('end', async () => {
            try {
                const response = await this.handleSoapRequest(req.url || '/', body);
                res.writeHead(200, {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(response),
                });
                res.end(response);
            }
            catch (err) {
                this.console.error('[ONVIF Server] Request error:', err.message);
                const fault = this.createSoapFault('Server', err.message);
                res.writeHead(500, { 'Content-Type': 'application/soap+xml; charset=utf-8' });
                res.end(fault);
            }
        });
    }
    async handleSoapRequest(path, body) {
        const action = this.extractSoapAction(body);
        this.console.log(`[ONVIF Server] ${path} → ${action}`);
        if (action.includes('GetSystemDateAndTime'))
            return this.handleGetSystemDateAndTime();
        if (action.includes('GetCapabilities'))
            return this.handleGetCapabilities();
        if (action.includes('GetServices'))
            return this.handleGetServices();
        if (action.includes('GetDeviceInformation'))
            return this.handleGetDeviceInformation();
        if (action.includes('GetScopes'))
            return this.handleGetScopes();
        if (action.includes('GetServiceCapabilities'))
            return this.handleGetServiceCapabilities(path);
        if (action.includes('GetNetworkInterfaces'))
            return this.handleGetNetworkInterfaces();
        if (action.includes('GetProfiles'))
            return this.handleGetProfiles();
        if (action.includes('GetStreamUri'))
            return this.handleGetStreamUri(body);
        if (action.includes('GetSnapshotUri'))
            return this.handleGetSnapshotUri();
        if (action.includes('GetVideoSources'))
            return this.handleGetVideoSources();
        if (action.includes('GetNodes') || action.includes('GetNode'))
            return this.handleGetNodes();
        if (action.includes('GetConfigurations') && action.includes('PTZ'))
            return this.handleGetPTZConfigurations();
        if (action.includes('GetConfiguration') && action.includes('PTZ'))
            return this.handleGetPTZConfiguration();
        if (action.includes('GetStatus'))
            return this.handleGetPTZStatus();
        if (action.includes('ContinuousMove'))
            return this.handleContinuousMove(body);
        if (action.includes('RelativeMove'))
            return this.handleRelativeMove(body);
        if (action.includes('AbsoluteMove'))
            return this.handleAbsoluteMove(body);
        if (action.includes('Stop'))
            return this.handlePTZStop();
        if (action.includes('GetPresets'))
            return this.handleGetPresets();
        if (action.includes('GotoPreset'))
            return this.handleGotoPreset(body);
        if (action.includes('SetPreset'))
            return this.handleSetPreset(body);
        if (action.includes('RemovePreset'))
            return this.handleRemovePreset(body);
        if (action.includes('GotoHomePosition'))
            return this.handleGotoHomePosition();
        if (action.includes('SetHomePosition'))
            return this.handleSetHomePosition();
        // Event service
        if (action.includes('GetEventProperties'))
            return this.handleGetEventProperties();
        if (action.includes('CreatePullPointSubscription'))
            return this.handleCreatePullPointSubscription();
        if (action.includes('PullMessages'))
            return this.handlePullMessages(body);
        if (action.includes('Renew'))
            return this.handleRenew();
        if (action.includes('Unsubscribe'))
            return this.handleUnsubscribe();
        this.console.log(`[ONVIF Server] Unhandled action: ${action}`);
        return this.handleGetCapabilities();
    }
    extractSoapAction(body) {
        const bodyMatch = body.match(/<[^:]*:?Body[^>]*>([\s\S]*?)<\/[^:]*:?Body>/i);
        if (bodyMatch) {
            const actionMatch = bodyMatch[1].match(/<([^\s>\/]+)/);
            if (actionMatch)
                return actionMatch[1].replace(/^[^:]+:/, '');
        }
        return 'Unknown';
    }
    // ── Device service ───────────────────────────────────────────────────────
    handleGetSystemDateAndTime() {
        const now = new Date();
        return this.wrapSoapResponse(`
            <tds:GetSystemDateAndTimeResponse>
                <tds:SystemDateAndTime>
                    <tt:DateTimeType>NTP</tt:DateTimeType>
                    <tt:DaylightSavings>false</tt:DaylightSavings>
                    <tt:TimeZone><tt:TZ>UTC0</tt:TZ></tt:TimeZone>
                    <tt:UTCDateTime>
                        <tt:Time>
                            <tt:Hour>${now.getUTCHours()}</tt:Hour>
                            <tt:Minute>${now.getUTCMinutes()}</tt:Minute>
                            <tt:Second>${now.getUTCSeconds()}</tt:Second>
                        </tt:Time>
                        <tt:Date>
                            <tt:Year>${now.getUTCFullYear()}</tt:Year>
                            <tt:Month>${now.getUTCMonth() + 1}</tt:Month>
                            <tt:Day>${now.getUTCDate()}</tt:Day>
                        </tt:Date>
                    </tt:UTCDateTime>
                </tds:SystemDateAndTime>
            </tds:GetSystemDateAndTimeResponse>`);
    }
    handleGetCapabilities() {
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        const eventsXml = this.config.nativeCameraHost ? `
                    <tt:Events>
                        <tt:XAddr>${baseUrl}/onvif/event_service</tt:XAddr>
                        <tt:WSSubscriptionPolicySupport>false</tt:WSSubscriptionPolicySupport>
                        <tt:WSPullPointSupport>true</tt:WSPullPointSupport>
                        <tt:WSPausableSubscriptionManagerInterfaceSupport>false</tt:WSPausableSubscriptionManagerInterfaceSupport>
                    </tt:Events>` : '';
        return this.wrapSoapResponse(`
            <tds:GetCapabilitiesResponse>
                <tds:Capabilities>
                    <tt:Device>
                        <tt:XAddr>${baseUrl}/onvif/device_service</tt:XAddr>
                        <tt:Network>
                            <tt:IPFilter>false</tt:IPFilter>
                            <tt:ZeroConfiguration>false</tt:ZeroConfiguration>
                            <tt:IPVersion6>false</tt:IPVersion6>
                            <tt:DynDNS>false</tt:DynDNS>
                        </tt:Network>
                        <tt:System>
                            <tt:DiscoveryResolve>false</tt:DiscoveryResolve>
                            <tt:DiscoveryBye>true</tt:DiscoveryBye>
                            <tt:RemoteDiscovery>false</tt:RemoteDiscovery>
                            <tt:SystemBackup>false</tt:SystemBackup>
                            <tt:SystemLogging>false</tt:SystemLogging>
                            <tt:FirmwareUpgrade>false</tt:FirmwareUpgrade>
                        </tt:System>
                    </tt:Device>${eventsXml}
                    <tt:Media>
                        <tt:XAddr>${baseUrl}/onvif/media_service</tt:XAddr>
                        <tt:StreamingCapabilities>
                            <tt:RTPMulticast>false</tt:RTPMulticast>
                            <tt:RTP_TCP>true</tt:RTP_TCP>
                            <tt:RTP_RTSP_TCP>true</tt:RTP_RTSP_TCP>
                        </tt:StreamingCapabilities>
                    </tt:Media>
                    <tt:PTZ>
                        <tt:XAddr>${baseUrl}/onvif/ptz_service</tt:XAddr>
                    </tt:PTZ>
                </tds:Capabilities>
            </tds:GetCapabilitiesResponse>`);
    }
    handleGetServices() {
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        const eventsService = this.config.nativeCameraHost ? `
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver10/events/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/event_service</tds:XAddr>
                    <tds:Version><tt:Major>2</tt:Major><tt:Minor>0</tt:Minor></tds:Version>
                </tds:Service>` : '';
        return this.wrapSoapResponse(`
            <tds:GetServicesResponse>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/device_service</tds:XAddr>
                    <tds:Version><tt:Major>2</tt:Major><tt:Minor>0</tt:Minor></tds:Version>
                </tds:Service>${eventsService}
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/media_service</tds:XAddr>
                    <tds:Version><tt:Major>2</tt:Major><tt:Minor>0</tt:Minor></tds:Version>
                </tds:Service>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver20/ptz/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/ptz_service</tds:XAddr>
                    <tds:Version><tt:Major>2</tt:Major><tt:Minor>0</tt:Minor></tds:Version>
                </tds:Service>
            </tds:GetServicesResponse>`);
    }
    handleGetDeviceInformation() {
        return this.wrapSoapResponse(`
            <tds:GetDeviceInformationResponse>
                <tds:Manufacturer>${this.config.manufacturer}</tds:Manufacturer>
                <tds:Model>${this.config.model}</tds:Model>
                <tds:FirmwareVersion>1.0.0</tds:FirmwareVersion>
                <tds:SerialNumber>${this.config.serialNumber}</tds:SerialNumber>
                <tds:HardwareId>${this.config.hardwareId}</tds:HardwareId>
            </tds:GetDeviceInformationResponse>`);
    }
    handleGetScopes() {
        return this.wrapSoapResponse(`
            <tds:GetScopesResponse>
                <tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/type/video_encoder</tt:ScopeItem></tds:Scopes>
                <tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/type/ptz</tt:ScopeItem></tds:Scopes>
                <tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/Profile/Streaming</tt:ScopeItem></tds:Scopes>
                <tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/name/${encodeURIComponent(this.config.deviceName)}</tt:ScopeItem></tds:Scopes>
                <tds:Scopes><tt:ScopeDef>Fixed</tt:ScopeDef><tt:ScopeItem>onvif://www.onvif.org/hardware/${encodeURIComponent(this.config.model)}</tt:ScopeItem></tds:Scopes>
            </tds:GetScopesResponse>`);
    }
    handleGetServiceCapabilities(path) {
        if (path.includes('ptz')) {
            return this.wrapSoapResponse(`
                <tptz:GetServiceCapabilitiesResponse>
                    <tptz:Capabilities EFlip="false" Reverse="false" GetCompatibleConfigurations="false" MoveStatus="true" StatusPosition="true"/>
                </tptz:GetServiceCapabilitiesResponse>`);
        }
        if (path.includes('event')) {
            return this.wrapSoapResponse(`
                <tev:GetServiceCapabilitiesResponse xmlns:tev="http://www.onvif.org/ver10/events/wsdl">
                    <tev:Capabilities WSSubscriptionPolicySupport="false" WSPullPointSupport="true" WSPausableSubscriptionManagerInterfaceSupport="false"/>
                </tev:GetServiceCapabilitiesResponse>`);
        }
        return this.wrapSoapResponse(`<tds:GetServiceCapabilitiesResponse><tds:Capabilities/></tds:GetServiceCapabilitiesResponse>`);
    }
    handleGetNetworkInterfaces() {
        return this.wrapSoapResponse(`
            <tds:GetNetworkInterfacesResponse>
                <tds:NetworkInterfaces token="eth0">
                    <tt:Enabled>true</tt:Enabled>
                    <tt:Info><tt:Name>eth0</tt:Name><tt:HwAddress>${this.config.macAddress}</tt:HwAddress></tt:Info>
                    <tt:IPv4>
                        <tt:Enabled>true</tt:Enabled>
                        <tt:Config>
                            <tt:Manual><tt:Address>${this.config.ipAddress}</tt:Address><tt:PrefixLength>24</tt:PrefixLength></tt:Manual>
                            <tt:DHCP>false</tt:DHCP>
                        </tt:Config>
                    </tt:IPv4>
                </tds:NetworkInterfaces>
            </tds:GetNetworkInterfacesResponse>`);
    }
    // ── Event service ────────────────────────────────────────────────────────
    handleGetEventProperties() {
        return this.wrapSoapResponse(`
            <tev:GetEventPropertiesResponse xmlns:tev="http://www.onvif.org/ver10/events/wsdl">
                <tev:TopicNamespaceLocation>http://www.onvif.org/onvif/ver10/topicns/topicns.xml</tev:TopicNamespaceLocation>
                <tev:FixedTopicSet>false</tev:FixedTopicSet>
                <tev:TopicSet/>
            </tev:GetEventPropertiesResponse>`);
    }
    handleCreatePullPointSubscription() {
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        const termTime = new Date(Date.now() + 3600000).toISOString();
        return this.wrapSoapResponse(`
            <tev:CreatePullPointSubscriptionResponse
                xmlns:tev="http://www.onvif.org/ver10/events/wsdl"
                xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2"
                xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
                <tev:SubscriptionReference>
                    <wsa:Address>${baseUrl}/onvif/pullpoint</wsa:Address>
                </tev:SubscriptionReference>
                <tev:CurrentTime>${new Date().toISOString()}</tev:CurrentTime>
                <tev:TerminationTime>${termTime}</tev:TerminationTime>
            </tev:CreatePullPointSubscriptionResponse>`);
    }
    handlePullMessages(body) {
        const timeoutMatch = body.match(/<[^:>]*:?Timeout[^>]*>PT(\d+)S/);
        const timeoutSec = Math.min(timeoutMatch ? parseInt(timeoutMatch[1]) : 10, 60);
        return new Promise((resolve) => {
            if (this.pendingEvents.length > 0) {
                resolve(this.buildPullMessagesResponse(this.pendingEvents.splice(0)));
                return;
            }
            const timer = setTimeout(() => {
                const idx = this.pullWaiters.findIndex(w => w.timer === timer);
                if (idx >= 0)
                    this.pullWaiters.splice(idx, 1);
                resolve(this.buildPullMessagesResponse([]));
            }, timeoutSec * 1000);
            this.pullWaiters.push({ resolve: (events) => resolve(this.buildPullMessagesResponse(events)), timer });
        });
    }
    buildPullMessagesResponse(events) {
        const now = new Date().toISOString();
        const termTime = new Date(Date.now() + 3600000).toISOString();
        const messages = events.map(e => `<wsnt:NotificationMessage>${e.xml}</wsnt:NotificationMessage>`).join('\n');
        return this.wrapSoapResponse(`
            <tev:PullMessagesResponse
                xmlns:tev="http://www.onvif.org/ver10/events/wsdl"
                xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2">
                <tev:CurrentTime>${now}</tev:CurrentTime>
                <tev:TerminationTime>${termTime}</tev:TerminationTime>
                ${messages}
            </tev:PullMessagesResponse>`);
    }
    handleRenew() {
        const termTime = new Date(Date.now() + 3600000).toISOString();
        return this.wrapSoapResponse(`
            <wsnt:RenewResponse xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2">
                <wsnt:TerminationTime>${termTime}</wsnt:TerminationTime>
                <wsnt:CurrentTime>${new Date().toISOString()}</wsnt:CurrentTime>
            </wsnt:RenewResponse>`);
    }
    handleUnsubscribe() {
        return this.wrapSoapResponse(`<wsnt:UnsubscribeResponse xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2"/>`);
    }
    // ── Media service ────────────────────────────────────────────────────────
    handleGetProfiles() {
        return this.wrapSoapResponse(`
            <trt:GetProfilesResponse>
                <trt:Profiles token="MainProfile" fixed="true">
                    <tt:Name>MainStream</tt:Name>
                    <tt:VideoSourceConfiguration token="VideoSource1">
                        <tt:Name>VideoSource1</tt:Name><tt:UseCount>1</tt:UseCount>
                        <tt:SourceToken>VideoSource1</tt:SourceToken>
                        <tt:Bounds x="0" y="0" width="1920" height="1080"/>
                    </tt:VideoSourceConfiguration>
                    <tt:VideoEncoderConfiguration token="VideoEncoder1">
                        <tt:Name>VideoEncoder1</tt:Name><tt:UseCount>1</tt:UseCount>
                        <tt:Encoding>H264</tt:Encoding>
                        <tt:Resolution><tt:Width>1920</tt:Width><tt:Height>1080</tt:Height></tt:Resolution>
                        <tt:Quality>5</tt:Quality>
                        <tt:RateControl><tt:FrameRateLimit>30</tt:FrameRateLimit><tt:EncodingInterval>1</tt:EncodingInterval><tt:BitrateLimit>4096</tt:BitrateLimit></tt:RateControl>
                        <tt:H264><tt:GovLength>30</tt:GovLength><tt:H264Profile>High</tt:H264Profile></tt:H264>
                        <tt:Multicast><tt:Address><tt:Type>IPv4</tt:Type><tt:IPv4Address>0.0.0.0</tt:IPv4Address></tt:Address><tt:Port>0</tt:Port><tt:TTL>0</tt:TTL><tt:AutoStart>false</tt:AutoStart></tt:Multicast>
                        <tt:SessionTimeout>PT60S</tt:SessionTimeout>
                    </tt:VideoEncoderConfiguration>
                    <tt:PTZConfiguration token="PTZ1">
                        <tt:Name>PTZ1</tt:Name><tt:UseCount>1</tt:UseCount><tt:NodeToken>PTZNode1</tt:NodeToken>
                        <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                        <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                        <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                        <tt:PanTiltLimits><tt:Range><tt:URI>http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace</tt:URI><tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange><tt:YRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:YRange></tt:Range></tt:PanTiltLimits>
                        <tt:ZoomLimits><tt:Range><tt:URI>http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace</tt:URI><tt:XRange><tt:Min>0</tt:Min><tt:Max>1</tt:Max></tt:XRange></tt:Range></tt:ZoomLimits>
                    </tt:PTZConfiguration>
                </trt:Profiles>
                <trt:Profiles token="SubProfile" fixed="true">
                    <tt:Name>SubStream</tt:Name>
                    <tt:VideoSourceConfiguration token="VideoSource1">
                        <tt:Name>VideoSource1</tt:Name><tt:UseCount>1</tt:UseCount>
                        <tt:SourceToken>VideoSource1</tt:SourceToken>
                        <tt:Bounds x="0" y="0" width="640" height="480"/>
                    </tt:VideoSourceConfiguration>
                    <tt:VideoEncoderConfiguration token="VideoEncoder2">
                        <tt:Name>VideoEncoder2</tt:Name><tt:UseCount>1</tt:UseCount>
                        <tt:Encoding>H264</tt:Encoding>
                        <tt:Resolution><tt:Width>640</tt:Width><tt:Height>480</tt:Height></tt:Resolution>
                        <tt:Quality>3</tt:Quality>
                        <tt:RateControl><tt:FrameRateLimit>15</tt:FrameRateLimit><tt:EncodingInterval>1</tt:EncodingInterval><tt:BitrateLimit>512</tt:BitrateLimit></tt:RateControl>
                        <tt:H264><tt:GovLength>30</tt:GovLength><tt:H264Profile>Main</tt:H264Profile></tt:H264>
                        <tt:Multicast><tt:Address><tt:Type>IPv4</tt:Type><tt:IPv4Address>0.0.0.0</tt:IPv4Address></tt:Address><tt:Port>0</tt:Port><tt:TTL>0</tt:TTL><tt:AutoStart>false</tt:AutoStart></tt:Multicast>
                        <tt:SessionTimeout>PT60S</tt:SessionTimeout>
                    </tt:VideoEncoderConfiguration>
                    <tt:PTZConfiguration token="PTZ1">
                        <tt:Name>PTZ1</tt:Name><tt:UseCount>1</tt:UseCount><tt:NodeToken>PTZNode1</tt:NodeToken>
                    </tt:PTZConfiguration>
                </trt:Profiles>
            </trt:GetProfilesResponse>`);
    }
    handleGetStreamUri(body) {
        const isSubstream = body.includes('SubProfile');
        const rtspUrl = this.config.rtspUrl.replace('subtype=0', isSubstream ? 'subtype=1' : 'subtype=0');
        return this.wrapSoapResponse(`
            <trt:GetStreamUriResponse>
                <trt:MediaUri>
                    <tt:Uri>${rtspUrl}</tt:Uri>
                    <tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>
                    <tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>
                    <tt:Timeout>PT60S</tt:Timeout>
                </trt:MediaUri>
            </trt:GetStreamUriResponse>`);
    }
    handleGetSnapshotUri() {
        return this.wrapSoapResponse(`
            <trt:GetSnapshotUriResponse>
                <trt:MediaUri>
                    <tt:Uri>${this.config.rtspUrl}</tt:Uri>
                    <tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>
                    <tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>
                    <tt:Timeout>PT60S</tt:Timeout>
                </trt:MediaUri>
            </trt:GetSnapshotUriResponse>`);
    }
    handleGetVideoSources() {
        return this.wrapSoapResponse(`
            <trt:GetVideoSourcesResponse>
                <trt:VideoSources token="VideoSource1">
                    <tt:Framerate>30</tt:Framerate>
                    <tt:Resolution><tt:Width>1920</tt:Width><tt:Height>1080</tt:Height></tt:Resolution>
                </trt:VideoSources>
            </trt:GetVideoSourcesResponse>`);
    }
    // ── PTZ service ──────────────────────────────────────────────────────────
    handleGetNodes() {
        return this.wrapSoapResponse(`
            <tptz:GetNodesResponse>
                <tptz:PTZNode token="PTZNode1" FixedHomePosition="false">
                    <tt:Name>PTZ Node</tt:Name>
                    <tt:SupportedPTZSpaces>
                        <tt:ContinuousPanTiltVelocitySpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                            <tt:YRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:YRange>
                        </tt:ContinuousPanTiltVelocitySpace>
                        <tt:ContinuousZoomVelocitySpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                        </tt:ContinuousZoomVelocitySpace>
                        <tt:RelativePanTiltTranslationSpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/PanTiltSpaces/TranslationGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                            <tt:YRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:YRange>
                        </tt:RelativePanTiltTranslationSpace>
                        <tt:RelativeZoomTranslationSpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/ZoomSpaces/TranslationGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                        </tt:RelativeZoomTranslationSpace>
                    </tt:SupportedPTZSpaces>
                    <tt:MaximumNumberOfPresets>16</tt:MaximumNumberOfPresets>
                    <tt:HomeSupported>false</tt:HomeSupported>
                </tptz:PTZNode>
            </tptz:GetNodesResponse>`);
    }
    handleGetPTZConfigurations() {
        return this.wrapSoapResponse(`
            <tptz:GetConfigurationsResponse>
                <tptz:PTZConfiguration token="PTZ1">
                    <tt:Name>PTZ Configuration</tt:Name><tt:UseCount>2</tt:UseCount><tt:NodeToken>PTZNode1</tt:NodeToken>
                    <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                    <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                    <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                </tptz:PTZConfiguration>
            </tptz:GetConfigurationsResponse>`);
    }
    handleGetPTZConfiguration() {
        return this.wrapSoapResponse(`
            <tptz:GetConfigurationResponse>
                <tptz:PTZConfiguration token="PTZ1">
                    <tt:Name>PTZ Configuration</tt:Name><tt:UseCount>2</tt:UseCount><tt:NodeToken>PTZNode1</tt:NodeToken>
                    <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                    <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                    <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                </tptz:PTZConfiguration>
            </tptz:GetConfigurationResponse>`);
    }
    handleGetPTZStatus() {
        return this.wrapSoapResponse(`
            <tptz:GetStatusResponse>
                <tptz:PTZStatus>
                    <tt:Position>
                        <tt:PanTilt x="0" y="0" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace"/>
                        <tt:Zoom x="0" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace"/>
                    </tt:Position>
                    <tt:MoveStatus><tt:PanTilt>IDLE</tt:PanTilt><tt:Zoom>IDLE</tt:Zoom></tt:MoveStatus>
                    <tt:UtcTime>${new Date().toISOString()}</tt:UtcTime>
                </tptz:PTZStatus>
            </tptz:GetStatusResponse>`);
    }
    handleContinuousMove(body) {
        const ptz = this.extractPTZVelocity(body);
        this.emit('ptz', { type: 'continuous', ...ptz });
        return this.wrapSoapResponse(`<tptz:ContinuousMoveResponse/>`);
    }
    handleRelativeMove(body) {
        const ptz = this.extractPTZTranslation(body);
        this.emit('ptz', { type: 'relative', ...ptz });
        return this.wrapSoapResponse(`<tptz:RelativeMoveResponse/>`);
    }
    handleAbsoluteMove(body) {
        const ptz = this.extractPTZPosition(body);
        this.emit('ptz', { type: 'absolute', ...ptz });
        return this.wrapSoapResponse(`<tptz:AbsoluteMoveResponse/>`);
    }
    handlePTZStop() {
        this.emit('ptz', { type: 'stop' });
        return this.wrapSoapResponse(`<tptz:StopResponse/>`);
    }
    handleGetPresets() {
        return this.wrapSoapResponse(`<tptz:GetPresetsResponse/>`);
    }
    handleGotoPreset(body) {
        const presetMatch = body.match(/PresetToken[^>]*>([^<]*)</i);
        this.emit('ptz', { type: 'preset', preset: presetMatch ? presetMatch[1] : 'unknown' });
        return this.wrapSoapResponse(`<tptz:GotoPresetResponse/>`);
    }
    handleSetPreset(_body) {
        return this.wrapSoapResponse(`<tptz:SetPresetResponse><tptz:PresetToken>preset_1</tptz:PresetToken></tptz:SetPresetResponse>`);
    }
    handleRemovePreset(_body) {
        return this.wrapSoapResponse(`<tptz:RemovePresetResponse/>`);
    }
    handleGotoHomePosition() {
        this.emit('ptz', { type: 'home' });
        return this.wrapSoapResponse(`<tptz:GotoHomePositionResponse/>`);
    }
    handleSetHomePosition() {
        return this.wrapSoapResponse(`<tptz:SetHomePositionResponse/>`);
    }
    extractPTZVelocity(body) {
        const result = {};
        const panTiltMatch = body.match(/PanTilt[^>]*x="([^"]*)"[^>]*y="([^"]*)"/i);
        if (panTiltMatch) {
            result.pan = parseFloat(panTiltMatch[1]) || 0;
            result.tilt = parseFloat(panTiltMatch[2]) || 0;
        }
        const zoomMatch = body.match(/Zoom[^>]*x="([^"]*)"/i);
        if (zoomMatch)
            result.zoom = parseFloat(zoomMatch[1]) || 0;
        return result;
    }
    extractPTZTranslation(body) { return this.extractPTZVelocity(body); }
    extractPTZPosition(body) { return this.extractPTZVelocity(body); }
    // ── WS-Discovery ─────────────────────────────────────────────────────────
    async startDiscovery() {
        return new Promise((resolve) => {
            this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.discoverySocket.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    this.console.log('[ONVIF Server] WS-Discovery port 3702 already in use (another camera has it)');
                    this.discoverySocket?.close();
                    this.discoverySocket = null;
                }
                else {
                    this.console.error('[ONVIF Server] Discovery error:', err.message);
                }
            });
            this.discoverySocket.on('message', (msg, rinfo) => {
                const message = msg.toString();
                if (message.includes('Probe') && message.includes('NetworkVideoTransmitter')) {
                    this.sendProbeMatch(rinfo.address, rinfo.port);
                }
            });
            this.discoverySocket.bind(3702, '0.0.0.0', () => {
                try {
                    this.discoverySocket.addMembership('239.255.255.250');
                    this.console.log('[ONVIF Server] WS-Discovery listening on 239.255.255.250:3702');
                }
                catch (e) {
                    this.console.log('[ONVIF Server] Could not join multicast group:', e.message);
                }
                resolve();
            });
        });
    }
    sendProbeMatch(address, port) {
        const messageId = `urn:uuid:${this.generateUUID()}`;
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        const response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
               xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery"
               xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
    <soap:Header>
        <wsa:MessageID>${messageId}</wsa:MessageID>
        <wsa:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:To>
        <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/ProbeMatches</wsa:Action>
    </soap:Header>
    <soap:Body>
        <wsd:ProbeMatches>
            <wsd:ProbeMatch>
                <wsa:EndpointReference><wsa:Address>urn:uuid:${this.config.serialNumber}</wsa:Address></wsa:EndpointReference>
                <wsd:Types>dn:NetworkVideoTransmitter</wsd:Types>
                <wsd:Scopes>
                    onvif://www.onvif.org/type/video_encoder
                    onvif://www.onvif.org/type/ptz
                    onvif://www.onvif.org/Profile/Streaming
                    onvif://www.onvif.org/name/${encodeURIComponent(this.config.deviceName)}
                    onvif://www.onvif.org/hardware/${encodeURIComponent(this.config.model)}
                </wsd:Scopes>
                <wsd:XAddrs>${baseUrl}/onvif/device_service</wsd:XAddrs>
                <wsd:MetadataVersion>1</wsd:MetadataVersion>
            </wsd:ProbeMatch>
        </wsd:ProbeMatches>
    </soap:Body>
</soap:Envelope>`;
        const buffer = Buffer.from(response);
        this.discoverySocket?.send(buffer, 0, buffer.length, port, address);
    }
    // ── Utilities ────────────────────────────────────────────────────────────
    wrapSoapResponse(content) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
               xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
               xmlns:tt="http://www.onvif.org/ver10/schema">
    <soap:Body>
        ${content.trim()}
    </soap:Body>
</soap:Envelope>`;
    }
    createSoapFault(code, message) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
    <soap:Body>
        <soap:Fault>
            <soap:Code><soap:Value>soap:${code}</soap:Value></soap:Code>
            <soap:Reason><soap:Text xml:lang="en">${message}</soap:Text></soap:Reason>
        </soap:Fault>
    </soap:Body>
</soap:Envelope>`;
    }
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}
exports.OnvifServer = OnvifServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib252aWYtc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL29udmlmLXNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLCtDQUFpQztBQUNqQyxtQ0FBc0M7QUFtQ3RDLE1BQWEsV0FBWSxTQUFRLHFCQUFZO0lBeUJ6QyxZQUFZLE1BQXlCO1FBQ2pDLEtBQUssRUFBRSxDQUFDO1FBeEJKLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBQ3RDLG9CQUFlLEdBQXdCLElBQUksQ0FBQztRQUU1QyxZQUFPLEdBQVksS0FBSyxDQUFDO1FBRWpDLG9CQUFvQjtRQUNaLGtCQUFhLEdBQWtCLEVBQUUsQ0FBQztRQUNsQyxnQkFBVyxHQUFpQixFQUFFLENBQUM7UUFDL0IsMEJBQXFCLEdBQWtCLElBQUksQ0FBQztRQUM1Qyx1QkFBa0IsR0FBWSxLQUFLLENBQUM7UUFDcEMscUJBQWdCLEdBQTBCLElBQUksQ0FBQztRQUV2RCxtQkFBbUI7UUFDRixPQUFFLEdBQUc7WUFDbEIsSUFBSSxFQUFFLHlDQUF5QztZQUMvQyxHQUFHLEVBQUUsa0RBQWtEO1lBQ3ZELEdBQUcsRUFBRSxpREFBaUQ7WUFDdEQsR0FBRyxFQUFFLHdDQUF3QztZQUM3QyxHQUFHLEVBQUUsdUNBQXVDO1lBQzVDLElBQUksRUFBRSxxQ0FBcUM7WUFDM0MsRUFBRSxFQUFFLG1DQUFtQztTQUMxQyxDQUFDO1FBSUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQztJQUM3QyxDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUs7UUFDUCxJQUFJLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTztRQUV6QixNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUM3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ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGRncmFtIGZyb20gJ2RncmFtJztcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcblxuZXhwb3J0IGludGVyZmFjZSBPbnZpZlNlcnZlckNvbmZpZyB7XG4gICAgaHR0cFBvcnQ6IG51bWJlcjtcbiAgICBydHNwVXJsOiBzdHJpbmc7XG4gICAgZGV2aWNlTmFtZTogc3RyaW5nO1xuICAgIG1hbnVmYWN0dXJlcjogc3RyaW5nO1xuICAgIG1vZGVsOiBzdHJpbmc7XG4gICAgc2VyaWFsTnVtYmVyOiBzdHJpbmc7XG4gICAgaGFyZHdhcmVJZDogc3RyaW5nO1xuICAgIG1hY0FkZHJlc3M6IHN0cmluZztcbiAgICBpcEFkZHJlc3M6IHN0cmluZztcbiAgICAvLyBOYXRpdmUgY2FtZXJhIGRldGFpbHMgZm9yIGV2ZW50IHByb3h5XG4gICAgbmF0aXZlQ2FtZXJhSG9zdD86IHN0cmluZztcbiAgICBuYXRpdmVDYW1lcmFVc2VybmFtZT86IHN0cmluZztcbiAgICBuYXRpdmVDYW1lcmFQYXNzd29yZD86IHN0cmluZztcbiAgICBjb25zb2xlPzogQ29uc29sZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQVFpDb21tYW5kIHtcbiAgICBwYW4/OiBudW1iZXI7XG4gICAgdGlsdD86IG51bWJlcjtcbiAgICB6b29tPzogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgUXVldWVkRXZlbnQge1xuICAgIHhtbDogc3RyaW5nO1xuICAgIHRpbWVzdGFtcDogRGF0ZTtcbn1cblxuaW50ZXJmYWNlIFB1bGxXYWl0ZXIge1xuICAgIHJlc29sdmU6IChldmVudHM6IFF1ZXVlZEV2ZW50W10pID0+IHZvaWQ7XG4gICAgdGltZXI6IE5vZGVKUy5UaW1lb3V0O1xufVxuXG5leHBvcnQgY2xhc3MgT252aWZTZXJ2ZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIHByaXZhdGUgY29uZmlnOiBPbnZpZlNlcnZlckNvbmZpZztcbiAgICBwcml2YXRlIGh0dHBTZXJ2ZXI6IGh0dHAuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBkaXNjb3ZlcnlTb2NrZXQ6IGRncmFtLlNvY2tldCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY29uc29sZTogQ29uc29sZTtcbiAgICBwcml2YXRlIHJ1bm5pbmc6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIC8vIEV2ZW50IHByb3h5IHN0YXRlXG4gICAgcHJpdmF0ZSBwZW5kaW5nRXZlbnRzOiBRdWV1ZWRFdmVudFtdID0gW107XG4gICAgcHJpdmF0ZSBwdWxsV2FpdGVyczogUHVsbFdhaXRlcltdID0gW107XG4gICAgcHJpdmF0ZSBuYXRpdmVTdWJzY3JpcHRpb25Vcmw6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgbmF0aXZlUHJveHlSdW5uaW5nOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBuYXRpdmVSZXRyeVRpbWVyOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xuXG4gICAgLy8gT05WSUYgbmFtZXNwYWNlc1xuICAgIHByaXZhdGUgcmVhZG9ubHkgTlMgPSB7XG4gICAgICAgIHNvYXA6ICdodHRwOi8vd3d3LnczLm9yZy8yMDAzLzA1L3NvYXAtZW52ZWxvcGUnLFxuICAgICAgICB3c2E6ICdodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA0LzA4L2FkZHJlc3NpbmcnLFxuICAgICAgICB3c2Q6ICdodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA0L2Rpc2NvdmVyeScsXG4gICAgICAgIHRkczogJ2h0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL2RldmljZS93c2RsJyxcbiAgICAgICAgdHJ0OiAnaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvbWVkaWEvd3NkbCcsXG4gICAgICAgIHRwdHo6ICdodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIyMC9wdHovd3NkbCcsXG4gICAgICAgIHR0OiAnaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvc2NoZW1hJyxcbiAgICB9O1xuXG4gICAgY29uc3RydWN0b3IoY29uZmlnOiBPbnZpZlNlcnZlckNvbmZpZykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgdGhpcy5jb25zb2xlID0gY29uZmlnLmNvbnNvbGUgfHwgY29uc29sZTtcbiAgICB9XG5cbiAgICBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMucnVubmluZykgcmV0dXJuO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuc3RhcnRIdHRwU2VydmVyKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc3RhcnREaXNjb3ZlcnkoKTtcblxuICAgICAgICB0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbT05WSUYgU2VydmVyXSBTdGFydGVkIG9uIHBvcnQgJHt0aGlzLmNvbmZpZy5odHRwUG9ydH1gKTtcblxuICAgICAgICBpZiAodGhpcy5jb25maWcubmF0aXZlQ2FtZXJhSG9zdCkge1xuICAgICAgICAgICAgdGhpcy5zdGFydE5hdGl2ZUV2ZW50UHJveHkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLm5hdGl2ZVByb3h5UnVubmluZyA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh0aGlzLm5hdGl2ZVJldHJ5VGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5hdGl2ZVJldHJ5VGltZXIpO1xuICAgICAgICAgICAgdGhpcy5uYXRpdmVSZXRyeVRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlamVjdCBhbGwgd2FpdGluZyBwdWxsIHJlcXVlc3RzXG4gICAgICAgIGZvciAoY29uc3Qgd2FpdGVyIG9mIHRoaXMucHVsbFdhaXRlcnMpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh3YWl0ZXIudGltZXIpO1xuICAgICAgICAgICAgd2FpdGVyLnJlc29sdmUoW10pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHVsbFdhaXRlcnMgPSBbXTtcblxuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5kaXNjb3ZlcnlTb2NrZXQpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzY292ZXJ5U29ja2V0LmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyeVNvY2tldCA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKCdbT05WSUYgU2VydmVyXSBTdG9wcGVkJyk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIE5hdGl2ZSBjYW1lcmEgZXZlbnQgcHJveHkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIHN0YXJ0TmF0aXZlRXZlbnRQcm94eSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMubmF0aXZlUHJveHlSdW5uaW5nKSByZXR1cm47XG4gICAgICAgIHRoaXMubmF0aXZlUHJveHlSdW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5uYXRpdmVFdmVudFByb3h5TG9vcCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbmF0aXZlRXZlbnRQcm94eUxvb3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICghdGhpcy5ydW5uaW5nIHx8ICF0aGlzLmNvbmZpZy5uYXRpdmVDYW1lcmFIb3N0KSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgaG9zdCA9IHRoaXMuY29uZmlnLm5hdGl2ZUNhbWVyYUhvc3Q7XG4gICAgICAgIGNvbnN0IHVzZXJuYW1lID0gdGhpcy5jb25maWcubmF0aXZlQ2FtZXJhVXNlcm5hbWUgfHwgJ2FkbWluJztcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSB0aGlzLmNvbmZpZy5uYXRpdmVDYW1lcmFQYXNzd29yZCB8fCAnJztcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3Vic2NyaWJlQm9keSA9IGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz5cbjxzOkVudmVsb3BlIHhtbG5zOnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAzLzA1L3NvYXAtZW52ZWxvcGVcIlxuICAgICAgICAgICAgeG1sbnM6d3NhPVwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNC8wOC9hZGRyZXNzaW5nXCI+XG4gIDxzOkhlYWRlcj5cbiAgICA8d3NhOkFjdGlvbj5odHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9ldmVudHMvd3NkbC9FdmVudFBvcnRUeXBlL0NyZWF0ZVB1bGxQb2ludFN1YnNjcmlwdGlvblJlcXVlc3Q8L3dzYTpBY3Rpb24+XG4gIDwvczpIZWFkZXI+XG4gIDxzOkJvZHk+XG4gICAgPENyZWF0ZVB1bGxQb2ludFN1YnNjcmlwdGlvbiB4bWxucz1cImh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL2V2ZW50cy93c2RsXCI+XG4gICAgICA8SW5pdGlhbFRlcm1pbmF0aW9uVGltZT5QVDFIPC9Jbml0aWFsVGVybWluYXRpb25UaW1lPlxuICAgIDwvQ3JlYXRlUHVsbFBvaW50U3Vic2NyaXB0aW9uPlxuICA8L3M6Qm9keT5cbjwvczpFbnZlbG9wZT5gO1xuXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaHR0cERpZ2VzdFBvc3QoXG4gICAgICAgICAgICAgICAgYGh0dHA6Ly8ke2hvc3R9L29udmlmL2V2ZW50X3NlcnZpY2VgLFxuICAgICAgICAgICAgICAgIHVzZXJuYW1lLCBwYXNzd29yZCwgc3Vic2NyaWJlQm9keVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgY29uc3QgdXJsTWF0Y2ggPSByZXNwb25zZS5tYXRjaCgvPCg/OlteOj5dKzopP0FkZHJlc3NbXj5dKj5cXHMqKGh0dHBbXjxcXHNdKylcXHMqPFxcLyg/OlteOj5dKzopP0FkZHJlc3M+Lyk7XG4gICAgICAgICAgICBpZiAoIXVybE1hdGNoKSB0aHJvdyBuZXcgRXJyb3IoJ05vIHN1YnNjcmlwdGlvbiBVUkwgaW4gcmVzcG9uc2UnKTtcblxuICAgICAgICAgICAgdGhpcy5uYXRpdmVTdWJzY3JpcHRpb25VcmwgPSB1cmxNYXRjaFsxXS50cmltKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGUubG9nKCdbT05WSUYgRXZlbnRzXSBTdWJzY3JpYmVkIHRvIG5hdGl2ZSBjYW1lcmE6JywgdGhpcy5uYXRpdmVTdWJzY3JpcHRpb25VcmwpO1xuXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5ydW5uaW5nKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wb2xsTmF0aXZlRXZlbnRzKHVzZXJuYW1lLCBwYXNzd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgdGhpcy5jb25zb2xlLmVycm9yKCdbT05WSUYgRXZlbnRzXSBQcm94eSBlcnJvcjonLCBlLm1lc3NhZ2UsICfigJQgcmV0cnlpbmcgaW4gMzBzJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm5hdGl2ZVN1YnNjcmlwdGlvblVybCA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLnJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHRoaXMubmF0aXZlUmV0cnlUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMubmF0aXZlUmV0cnlUaW1lciA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5uYXRpdmVFdmVudFByb3h5TG9vcCgpO1xuICAgICAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBwb2xsTmF0aXZlRXZlbnRzKHVzZXJuYW1lOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLm5hdGl2ZVN1YnNjcmlwdGlvblVybCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHBvbGxCb2R5ID0gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPHM6RW52ZWxvcGUgeG1sbnM6cz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDMvMDUvc29hcC1lbnZlbG9wZVwiPlxuICA8czpCb2R5PlxuICAgIDxQdWxsTWVzc2FnZXMgeG1sbnM9XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9ldmVudHMvd3NkbFwiPlxuICAgICAgPFRpbWVvdXQ+UFQzMFM8L1RpbWVvdXQ+XG4gICAgICA8TWVzc2FnZUxpbWl0PjEwMDwvTWVzc2FnZUxpbWl0PlxuICAgIDwvUHVsbE1lc3NhZ2VzPlxuICA8L3M6Qm9keT5cbjwvczpFbnZlbG9wZT5gO1xuXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5odHRwRGlnZXN0UG9zdChcbiAgICAgICAgICAgIHRoaXMubmF0aXZlU3Vic2NyaXB0aW9uVXJsLCB1c2VybmFtZSwgcGFzc3dvcmQsIHBvbGxCb2R5LCAzNTAwMFxuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbnMgPSByZXNwb25zZS5tYXRjaCgvPCg/OlteOj5dKzopP05vdGlmaWNhdGlvbk1lc3NhZ2VbXFxzXFxTXSo/PFxcLyg/OlteOj5dKzopP05vdGlmaWNhdGlvbk1lc3NhZ2U+L2cpIHx8IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHhtbCBvZiBub3RpZmljYXRpb25zKSB7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlRXZlbnQoeyB4bWwsIHRpbWVzdGFtcDogbmV3IERhdGUoKSB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgcXVldWVFdmVudChldmVudDogUXVldWVkRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wZW5kaW5nRXZlbnRzLnB1c2goZXZlbnQpO1xuXG4gICAgICAgIC8vIERlbGl2ZXIgdG8gYW55IHdhaXRpbmcgUHVsbE1lc3NhZ2VzIHJlcXVlc3RzXG4gICAgICAgIHdoaWxlICh0aGlzLnB1bGxXYWl0ZXJzLmxlbmd0aCA+IDAgJiYgdGhpcy5wZW5kaW5nRXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHdhaXRlciA9IHRoaXMucHVsbFdhaXRlcnMuc2hpZnQoKSE7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQod2FpdGVyLnRpbWVyKTtcbiAgICAgICAgICAgIHdhaXRlci5yZXNvbHZlKHRoaXMucGVuZGluZ0V2ZW50cy5zcGxpY2UoMCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQm91bmQgcXVldWUgc2l6ZVxuICAgICAgICBpZiAodGhpcy5wZW5kaW5nRXZlbnRzLmxlbmd0aCA+IDEwMCkge1xuICAgICAgICAgICAgdGhpcy5wZW5kaW5nRXZlbnRzLnNwbGljZSgwLCB0aGlzLnBlbmRpbmdFdmVudHMubGVuZ3RoIC0gMTAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIOKUgOKUgCBIVFRQIERpZ2VzdCBhdXRoIGhlbHBlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgYXN5bmMgaHR0cERpZ2VzdFBvc3QoXG4gICAgICAgIHVybDogc3RyaW5nLCB1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBib2R5OiBzdHJpbmcsIHRpbWVvdXRNcyA9IDEwMDAwXG4gICAgKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgY29uc3QgZmlyc3QgPSBhd2FpdCB0aGlzLmh0dHBQb3N0KHVybCwgYm9keSwgdW5kZWZpbmVkLCB0aW1lb3V0TXMpO1xuXG4gICAgICAgIGlmIChmaXJzdC5zdGF0dXMgPT09IDIwMCkgcmV0dXJuIGZpcnN0LmJvZHk7XG5cbiAgICAgICAgaWYgKGZpcnN0LnN0YXR1cyAhPT0gNDAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtmaXJzdC5zdGF0dXN9IGZyb20gJHt1cmx9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhdXRoSGVhZGVyID0gZmlyc3QuaGVhZGVyc1snd3d3LWF1dGhlbnRpY2F0ZSddIHx8ICcnO1xuICAgICAgICBjb25zdCByZWFsbSAgPSBhdXRoSGVhZGVyLm1hdGNoKC9yZWFsbT1cIihbXlwiXSspXCIvKT8uWzFdO1xuICAgICAgICBjb25zdCBub25jZSAgPSBhdXRoSGVhZGVyLm1hdGNoKC9ub25jZT1cIihbXlwiXSspXCIvKT8uWzFdO1xuICAgICAgICBjb25zdCBxb3AgICAgPSBhdXRoSGVhZGVyLm1hdGNoKC9xb3A9XCIoW15cIl0rKVwiLyk/LlsxXTtcbiAgICAgICAgY29uc3Qgb3BhcXVlID0gYXV0aEhlYWRlci5tYXRjaCgvb3BhcXVlPVwiKFteXCJdKylcIi8pPy5bMV07XG5cbiAgICAgICAgaWYgKCFyZWFsbSB8fCAhbm9uY2UpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBXV1ctQXV0aGVudGljYXRlOiAke2F1dGhIZWFkZXJ9YCk7XG5cbiAgICAgICAgY29uc3QgcGFyc2VkVXJsID0gbmV3IFVSTCh1cmwpO1xuICAgICAgICBjb25zdCB1cmkgPSBwYXJzZWRVcmwucGF0aG5hbWUgKyBwYXJzZWRVcmwuc2VhcmNoO1xuICAgICAgICBjb25zdCBuYyA9ICcwMDAwMDAwMSc7XG4gICAgICAgIGNvbnN0IGNub25jZSA9IGNyeXB0by5yYW5kb21CeXRlcyg0KS50b1N0cmluZygnaGV4Jyk7XG5cbiAgICAgICAgY29uc3QgaGExID0gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShgJHt1c2VybmFtZX06JHtyZWFsbX06JHtwYXNzd29yZH1gKS5kaWdlc3QoJ2hleCcpO1xuICAgICAgICBjb25zdCBoYTIgPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKGBQT1NUOiR7dXJpfWApLmRpZ2VzdCgnaGV4Jyk7XG5cbiAgICAgICAgbGV0IGRpZ2VzdFJlc3A6IHN0cmluZztcbiAgICAgICAgaWYgKHFvcCA9PT0gJ2F1dGgnIHx8IHFvcCA9PT0gJ2F1dGgsYXV0aC1pbnQnKSB7XG4gICAgICAgICAgICBkaWdlc3RSZXNwID0gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpXG4gICAgICAgICAgICAgICAgLnVwZGF0ZShgJHtoYTF9OiR7bm9uY2V9OiR7bmN9OiR7Y25vbmNlfTphdXRoOiR7aGEyfWApLmRpZ2VzdCgnaGV4Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkaWdlc3RSZXNwID0gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShgJHtoYTF9OiR7bm9uY2V9OiR7aGEyfWApLmRpZ2VzdCgnaGV4Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYXV0aFZhbHVlID0gYERpZ2VzdCB1c2VybmFtZT1cIiR7dXNlcm5hbWV9XCIsIHJlYWxtPVwiJHtyZWFsbX1cIiwgbm9uY2U9XCIke25vbmNlfVwiLCB1cmk9XCIke3VyaX1cIiwgcmVzcG9uc2U9XCIke2RpZ2VzdFJlc3B9XCJgO1xuICAgICAgICBpZiAocW9wKSBhdXRoVmFsdWUgKz0gYCwgcW9wPWF1dGgsIG5jPSR7bmN9LCBjbm9uY2U9XCIke2Nub25jZX1cImA7XG4gICAgICAgIGlmIChvcGFxdWUpIGF1dGhWYWx1ZSArPSBgLCBvcGFxdWU9XCIke29wYXF1ZX1cImA7XG5cbiAgICAgICAgY29uc3Qgc2Vjb25kID0gYXdhaXQgdGhpcy5odHRwUG9zdCh1cmwsIGJvZHksIGF1dGhWYWx1ZSwgdGltZW91dE1zKTtcbiAgICAgICAgaWYgKHNlY29uZC5zdGF0dXMgIT09IDIwMCkgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7c2Vjb25kLnN0YXR1c30gYWZ0ZXIgZGlnZXN0IGF1dGhgKTtcbiAgICAgICAgcmV0dXJuIHNlY29uZC5ib2R5O1xuICAgIH1cblxuICAgIHByaXZhdGUgaHR0cFBvc3QoXG4gICAgICAgIHVybDogc3RyaW5nLCBib2R5OiBzdHJpbmcsIGF1dGhvcml6YXRpb25IZWFkZXI/OiBzdHJpbmcsIHRpbWVvdXRNcyA9IDEwMDAwXG4gICAgKTogUHJvbWlzZTx7IHN0YXR1czogbnVtYmVyOyBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+OyBib2R5OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkVXJsID0gbmV3IFVSTCh1cmwpO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogaHR0cC5SZXF1ZXN0T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBob3N0bmFtZTogcGFyc2VkVXJsLmhvc3RuYW1lLFxuICAgICAgICAgICAgICAgIHBvcnQ6IHBhcnNlSW50KHBhcnNlZFVybC5wb3J0KSB8fCA4MCxcbiAgICAgICAgICAgICAgICBwYXRoOiBwYXJzZWRVcmwucGF0aG5hbWUgKyBwYXJzZWRVcmwuc2VhcmNoLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9zb2FwK3htbDsgY2hhcnNldD11dGYtOCcsXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LUxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKGJvZHkpLFxuICAgICAgICAgICAgICAgICAgICAuLi4oYXV0aG9yaXphdGlvbkhlYWRlciA/IHsgQXV0aG9yaXphdGlvbjogYXV0aG9yaXphdGlvbkhlYWRlciB9IDoge30pLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGltZW91dDogdGltZW91dE1zLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgcmVxID0gaHR0cC5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZGF0YSA9ICcnO1xuICAgICAgICAgICAgICAgIHJlcy5vbignZGF0YScsIGNodW5rID0+IChkYXRhICs9IGNodW5rKSk7XG4gICAgICAgICAgICAgICAgcmVzLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiByZXMuc3RhdHVzQ29kZSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiByZXMuaGVhZGVycyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICAgICAgICAgICAgICBib2R5OiBkYXRhLFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXEub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgICAgICAgIHJlcS5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXEuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYEhUVFAgdGltZW91dCBhZnRlciAke3RpbWVvdXRNc31tczogJHt1cmx9YCkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS53cml0ZShib2R5KTtcbiAgICAgICAgICAgIHJlcS5lbmQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEhUVFAgc2VydmVyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBhc3luYyBzdGFydEh0dHBTZXJ2ZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcigocmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUh0dHBSZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uc29sZS5lcnJvcignW09OVklGIFNlcnZlcl0gSFRUUCBlcnJvcjonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmxpc3Rlbih0aGlzLmNvbmZpZy5odHRwUG9ydCwgJzAuMC4wLjAnLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBsZXQgYm9keSA9ICcnO1xuICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bmspID0+IChib2R5ICs9IGNodW5rLnRvU3RyaW5nKCkpKTtcbiAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVTb2FwUmVxdWVzdChyZXEudXJsIHx8ICcvJywgYm9keSk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9zb2FwK3htbDsgY2hhcnNldD11dGYtOCcsXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LUxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKHJlc3BvbnNlKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25zb2xlLmVycm9yKCdbT05WSUYgU2VydmVyXSBSZXF1ZXN0IGVycm9yOicsIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmYXVsdCA9IHRoaXMuY3JlYXRlU29hcEZhdWx0KCdTZXJ2ZXInLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9zb2FwK3htbDsgY2hhcnNldD11dGYtOCcgfSk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChmYXVsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU29hcFJlcXVlc3QocGF0aDogc3RyaW5nLCBib2R5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSB0aGlzLmV4dHJhY3RTb2FwQWN0aW9uKGJvZHkpO1xuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbT05WSUYgU2VydmVyXSAke3BhdGh9IOKGkiAke2FjdGlvbn1gKTtcblxuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXRTeXN0ZW1EYXRlQW5kVGltZScpKSAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR2V0U3lzdGVtRGF0ZUFuZFRpbWUoKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0Q2FwYWJpbGl0aWVzJykpICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldENhcGFiaWxpdGllcygpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXRTZXJ2aWNlcycpKSAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR2V0U2VydmljZXMoKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0RGV2aWNlSW5mb3JtYXRpb24nKSkgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldERldmljZUluZm9ybWF0aW9uKCk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFNjb3BlcycpKSAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRTY29wZXMoKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0U2VydmljZUNhcGFiaWxpdGllcycpKSAgIHJldHVybiB0aGlzLmhhbmRsZUdldFNlcnZpY2VDYXBhYmlsaXRpZXMocGF0aCk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldE5ldHdvcmtJbnRlcmZhY2VzJykpICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXROZXR3b3JrSW50ZXJmYWNlcygpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXRQcm9maWxlcycpKSAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR2V0UHJvZmlsZXMoKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0U3RyZWFtVXJpJykpICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldFN0cmVhbVVyaShib2R5KTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0U25hcHNob3RVcmknKSkgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldFNuYXBzaG90VXJpKCk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFZpZGVvU291cmNlcycpKSAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRWaWRlb1NvdXJjZXMoKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0Tm9kZXMnKSB8fCBhY3Rpb24uaW5jbHVkZXMoJ0dldE5vZGUnKSkgcmV0dXJuIHRoaXMuaGFuZGxlR2V0Tm9kZXMoKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0Q29uZmlndXJhdGlvbnMnKSAmJiBhY3Rpb24uaW5jbHVkZXMoJ1BUWicpKSByZXR1cm4gdGhpcy5oYW5kbGVHZXRQVFpDb25maWd1cmF0aW9ucygpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXRDb25maWd1cmF0aW9uJykgICYmIGFjdGlvbi5pbmNsdWRlcygnUFRaJykpIHJldHVybiB0aGlzLmhhbmRsZUdldFBUWkNvbmZpZ3VyYXRpb24oKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0U3RhdHVzJykpICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldFBUWlN0YXR1cygpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdDb250aW51b3VzTW92ZScpKSAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlQ29udGludW91c01vdmUoYm9keSk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ1JlbGF0aXZlTW92ZScpKSAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVSZWxhdGl2ZU1vdmUoYm9keSk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0Fic29sdXRlTW92ZScpKSAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVBYnNvbHV0ZU1vdmUoYm9keSk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ1N0b3AnKSkgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVQVFpTdG9wKCk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFByZXNldHMnKSkgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRQcmVzZXRzKCk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dvdG9QcmVzZXQnKSkgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHb3RvUHJlc2V0KGJvZHkpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdTZXRQcmVzZXQnKSkgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU2V0UHJlc2V0KGJvZHkpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdSZW1vdmVQcmVzZXQnKSkgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlUmVtb3ZlUHJlc2V0KGJvZHkpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHb3RvSG9tZVBvc2l0aW9uJykpICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR290b0hvbWVQb3NpdGlvbigpO1xuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdTZXRIb21lUG9zaXRpb24nKSkgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU2V0SG9tZVBvc2l0aW9uKCk7XG5cbiAgICAgICAgLy8gRXZlbnQgc2VydmljZVxuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXRFdmVudFByb3BlcnRpZXMnKSkgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR2V0RXZlbnRQcm9wZXJ0aWVzKCk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0NyZWF0ZVB1bGxQb2ludFN1YnNjcmlwdGlvbicpKSByZXR1cm4gdGhpcy5oYW5kbGVDcmVhdGVQdWxsUG9pbnRTdWJzY3JpcHRpb24oKTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnUHVsbE1lc3NhZ2VzJykpICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVB1bGxNZXNzYWdlcyhib2R5KTtcbiAgICAgICAgaWYgKGFjdGlvbi5pbmNsdWRlcygnUmVuZXcnKSkgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVJlbmV3KCk7XG4gICAgICAgIGlmIChhY3Rpb24uaW5jbHVkZXMoJ1Vuc3Vic2NyaWJlJykpICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVVbnN1YnNjcmliZSgpO1xuXG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coYFtPTlZJRiBTZXJ2ZXJdIFVuaGFuZGxlZCBhY3Rpb246ICR7YWN0aW9ufWApO1xuICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRDYXBhYmlsaXRpZXMoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RTb2FwQWN0aW9uKGJvZHk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGJvZHlNYXRjaCA9IGJvZHkubWF0Y2goLzxbXjpdKjo/Qm9keVtePl0qPihbXFxzXFxTXSo/KTxcXC9bXjpdKjo/Qm9keT4vaSk7XG4gICAgICAgIGlmIChib2R5TWF0Y2gpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbk1hdGNoID0gYm9keU1hdGNoWzFdLm1hdGNoKC88KFteXFxzPlxcL10rKS8pO1xuICAgICAgICAgICAgaWYgKGFjdGlvbk1hdGNoKSByZXR1cm4gYWN0aW9uTWF0Y2hbMV0ucmVwbGFjZSgvXlteOl0rOi8sICcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1Vua25vd24nO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBEZXZpY2Ugc2VydmljZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgaGFuZGxlR2V0U3lzdGVtRGF0ZUFuZFRpbWUoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dGRzOkdldFN5c3RlbURhdGVBbmRUaW1lUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRkczpTeXN0ZW1EYXRlQW5kVGltZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRhdGVUaW1lVHlwZT5OVFA8L3R0OkRhdGVUaW1lVHlwZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRheWxpZ2h0U2F2aW5ncz5mYWxzZTwvdHQ6RGF5bGlnaHRTYXZpbmdzPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VGltZVpvbmU+PHR0OlRaPlVUQzA8L3R0OlRaPjwvdHQ6VGltZVpvbmU+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpVVENEYXRlVGltZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpUaW1lPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpIb3VyPiR7bm93LmdldFVUQ0hvdXJzKCl9PC90dDpIb3VyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpNaW51dGU+JHtub3cuZ2V0VVRDTWludXRlcygpfTwvdHQ6TWludXRlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpTZWNvbmQ+JHtub3cuZ2V0VVRDU2Vjb25kcygpfTwvdHQ6U2Vjb25kPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpUaW1lPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkRhdGU+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlllYXI+JHtub3cuZ2V0VVRDRnVsbFllYXIoKX08L3R0OlllYXI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok1vbnRoPiR7bm93LmdldFVUQ01vbnRoKCkgKyAxfTwvdHQ6TW9udGg+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkRheT4ke25vdy5nZXRVVENEYXRlKCl9PC90dDpEYXk+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0OkRhdGU+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6VVRDRGF0ZVRpbWU+XG4gICAgICAgICAgICAgICAgPC90ZHM6U3lzdGVtRGF0ZUFuZFRpbWU+XG4gICAgICAgICAgICA8L3RkczpHZXRTeXN0ZW1EYXRlQW5kVGltZVJlc3BvbnNlPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2V0Q2FwYWJpbGl0aWVzKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSBgaHR0cDovLyR7dGhpcy5jb25maWcuaXBBZGRyZXNzfToke3RoaXMuY29uZmlnLmh0dHBQb3J0fWA7XG4gICAgICAgIGNvbnN0IGV2ZW50c1htbCA9IHRoaXMuY29uZmlnLm5hdGl2ZUNhbWVyYUhvc3QgPyBgXG4gICAgICAgICAgICAgICAgICAgIDx0dDpFdmVudHM+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9ldmVudF9zZXJ2aWNlPC90dDpYQWRkcj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpXU1N1YnNjcmlwdGlvblBvbGljeVN1cHBvcnQ+ZmFsc2U8L3R0OldTU3Vic2NyaXB0aW9uUG9saWN5U3VwcG9ydD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpXU1B1bGxQb2ludFN1cHBvcnQ+dHJ1ZTwvdHQ6V1NQdWxsUG9pbnRTdXBwb3J0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OldTUGF1c2FibGVTdWJzY3JpcHRpb25NYW5hZ2VySW50ZXJmYWNlU3VwcG9ydD5mYWxzZTwvdHQ6V1NQYXVzYWJsZVN1YnNjcmlwdGlvbk1hbmFnZXJJbnRlcmZhY2VTdXBwb3J0PlxuICAgICAgICAgICAgICAgICAgICA8L3R0OkV2ZW50cz5gIDogJyc7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRkczpHZXRDYXBhYmlsaXRpZXNSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dGRzOkNhcGFiaWxpdGllcz5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRldmljZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpYQWRkcj4ke2Jhc2VVcmx9L29udmlmL2RldmljZV9zZXJ2aWNlPC90dDpYQWRkcj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOZXR3b3JrPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpJUEZpbHRlcj5mYWxzZTwvdHQ6SVBGaWx0ZXI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0Olplcm9Db25maWd1cmF0aW9uPmZhbHNlPC90dDpaZXJvQ29uZmlndXJhdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SVBWZXJzaW9uNj5mYWxzZTwvdHQ6SVBWZXJzaW9uNj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6RHluRE5TPmZhbHNlPC90dDpEeW5ETlM+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0Ok5ldHdvcms+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6U3lzdGVtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEaXNjb3ZlcnlSZXNvbHZlPmZhbHNlPC90dDpEaXNjb3ZlcnlSZXNvbHZlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEaXNjb3ZlcnlCeWU+dHJ1ZTwvdHQ6RGlzY292ZXJ5QnllPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSZW1vdGVEaXNjb3Zlcnk+ZmFsc2U8L3R0OlJlbW90ZURpc2NvdmVyeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6U3lzdGVtQmFja3VwPmZhbHNlPC90dDpTeXN0ZW1CYWNrdXA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlN5c3RlbUxvZ2dpbmc+ZmFsc2U8L3R0OlN5c3RlbUxvZ2dpbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkZpcm13YXJlVXBncmFkZT5mYWxzZTwvdHQ6RmlybXdhcmVVcGdyYWRlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpTeXN0ZW0+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6RGV2aWNlPiR7ZXZlbnRzWG1sfVxuICAgICAgICAgICAgICAgICAgICA8dHQ6TWVkaWE+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9tZWRpYV9zZXJ2aWNlPC90dDpYQWRkcj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpTdHJlYW1pbmdDYXBhYmlsaXRpZXM+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlJUUE11bHRpY2FzdD5mYWxzZTwvdHQ6UlRQTXVsdGljYXN0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSVFBfVENQPnRydWU8L3R0OlJUUF9UQ1A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlJUUF9SVFNQX1RDUD50cnVlPC90dDpSVFBfUlRTUF9UQ1A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0OlN0cmVhbWluZ0NhcGFiaWxpdGllcz5cbiAgICAgICAgICAgICAgICAgICAgPC90dDpNZWRpYT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlBUWj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpYQWRkcj4ke2Jhc2VVcmx9L29udmlmL3B0el9zZXJ2aWNlPC90dDpYQWRkcj5cbiAgICAgICAgICAgICAgICAgICAgPC90dDpQVFo+XG4gICAgICAgICAgICAgICAgPC90ZHM6Q2FwYWJpbGl0aWVzPlxuICAgICAgICAgICAgPC90ZHM6R2V0Q2FwYWJpbGl0aWVzUmVzcG9uc2U+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRTZXJ2aWNlcygpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gYGh0dHA6Ly8ke3RoaXMuY29uZmlnLmlwQWRkcmVzc306JHt0aGlzLmNvbmZpZy5odHRwUG9ydH1gO1xuICAgICAgICBjb25zdCBldmVudHNTZXJ2aWNlID0gdGhpcy5jb25maWcubmF0aXZlQ2FtZXJhSG9zdCA/IGBcbiAgICAgICAgICAgICAgICA8dGRzOlNlcnZpY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6TmFtZXNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL2V2ZW50cy93c2RsPC90ZHM6TmFtZXNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8dGRzOlhBZGRyPiR7YmFzZVVybH0vb252aWYvZXZlbnRfc2VydmljZTwvdGRzOlhBZGRyPlxuICAgICAgICAgICAgICAgICAgICA8dGRzOlZlcnNpb24+PHR0Ok1ham9yPjI8L3R0Ok1ham9yPjx0dDpNaW5vcj4wPC90dDpNaW5vcj48L3RkczpWZXJzaW9uPlxuICAgICAgICAgICAgICAgIDwvdGRzOlNlcnZpY2U+YCA6ICcnO1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0ZHM6R2V0U2VydmljZXNSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dGRzOlNlcnZpY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6TmFtZXNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL2RldmljZS93c2RsPC90ZHM6TmFtZXNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8dGRzOlhBZGRyPiR7YmFzZVVybH0vb252aWYvZGV2aWNlX3NlcnZpY2U8L3RkczpYQWRkcj5cbiAgICAgICAgICAgICAgICAgICAgPHRkczpWZXJzaW9uPjx0dDpNYWpvcj4yPC90dDpNYWpvcj48dHQ6TWlub3I+MDwvdHQ6TWlub3I+PC90ZHM6VmVyc2lvbj5cbiAgICAgICAgICAgICAgICA8L3RkczpTZXJ2aWNlPiR7ZXZlbnRzU2VydmljZX1cbiAgICAgICAgICAgICAgICA8dGRzOlNlcnZpY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6TmFtZXNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL21lZGlhL3dzZGw8L3RkczpOYW1lc3BhY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9tZWRpYV9zZXJ2aWNlPC90ZHM6WEFkZHI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6VmVyc2lvbj48dHQ6TWFqb3I+MjwvdHQ6TWFqb3I+PHR0Ok1pbm9yPjA8L3R0Ok1pbm9yPjwvdGRzOlZlcnNpb24+XG4gICAgICAgICAgICAgICAgPC90ZHM6U2VydmljZT5cbiAgICAgICAgICAgICAgICA8dGRzOlNlcnZpY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6TmFtZXNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjIwL3B0ei93c2RsPC90ZHM6TmFtZXNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8dGRzOlhBZGRyPiR7YmFzZVVybH0vb252aWYvcHR6X3NlcnZpY2U8L3RkczpYQWRkcj5cbiAgICAgICAgICAgICAgICAgICAgPHRkczpWZXJzaW9uPjx0dDpNYWpvcj4yPC90dDpNYWpvcj48dHQ6TWlub3I+MDwvdHQ6TWlub3I+PC90ZHM6VmVyc2lvbj5cbiAgICAgICAgICAgICAgICA8L3RkczpTZXJ2aWNlPlxuICAgICAgICAgICAgPC90ZHM6R2V0U2VydmljZXNSZXNwb25zZT5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldERldmljZUluZm9ybWF0aW9uKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRkczpHZXREZXZpY2VJbmZvcm1hdGlvblJlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0ZHM6TWFudWZhY3R1cmVyPiR7dGhpcy5jb25maWcubWFudWZhY3R1cmVyfTwvdGRzOk1hbnVmYWN0dXJlcj5cbiAgICAgICAgICAgICAgICA8dGRzOk1vZGVsPiR7dGhpcy5jb25maWcubW9kZWx9PC90ZHM6TW9kZWw+XG4gICAgICAgICAgICAgICAgPHRkczpGaXJtd2FyZVZlcnNpb24+MS4wLjA8L3RkczpGaXJtd2FyZVZlcnNpb24+XG4gICAgICAgICAgICAgICAgPHRkczpTZXJpYWxOdW1iZXI+JHt0aGlzLmNvbmZpZy5zZXJpYWxOdW1iZXJ9PC90ZHM6U2VyaWFsTnVtYmVyPlxuICAgICAgICAgICAgICAgIDx0ZHM6SGFyZHdhcmVJZD4ke3RoaXMuY29uZmlnLmhhcmR3YXJlSWR9PC90ZHM6SGFyZHdhcmVJZD5cbiAgICAgICAgICAgIDwvdGRzOkdldERldmljZUluZm9ybWF0aW9uUmVzcG9uc2U+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRTY29wZXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dGRzOkdldFNjb3Blc1Jlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0ZHM6U2NvcGVzPjx0dDpTY29wZURlZj5GaXhlZDwvdHQ6U2NvcGVEZWY+PHR0OlNjb3BlSXRlbT5vbnZpZjovL3d3dy5vbnZpZi5vcmcvdHlwZS92aWRlb19lbmNvZGVyPC90dDpTY29wZUl0ZW0+PC90ZHM6U2NvcGVzPlxuICAgICAgICAgICAgICAgIDx0ZHM6U2NvcGVzPjx0dDpTY29wZURlZj5GaXhlZDwvdHQ6U2NvcGVEZWY+PHR0OlNjb3BlSXRlbT5vbnZpZjovL3d3dy5vbnZpZi5vcmcvdHlwZS9wdHo8L3R0OlNjb3BlSXRlbT48L3RkczpTY29wZXM+XG4gICAgICAgICAgICAgICAgPHRkczpTY29wZXM+PHR0OlNjb3BlRGVmPkZpeGVkPC90dDpTY29wZURlZj48dHQ6U2NvcGVJdGVtPm9udmlmOi8vd3d3Lm9udmlmLm9yZy9Qcm9maWxlL1N0cmVhbWluZzwvdHQ6U2NvcGVJdGVtPjwvdGRzOlNjb3Blcz5cbiAgICAgICAgICAgICAgICA8dGRzOlNjb3Blcz48dHQ6U2NvcGVEZWY+Rml4ZWQ8L3R0OlNjb3BlRGVmPjx0dDpTY29wZUl0ZW0+b252aWY6Ly93d3cub252aWYub3JnL25hbWUvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuZGV2aWNlTmFtZSl9PC90dDpTY29wZUl0ZW0+PC90ZHM6U2NvcGVzPlxuICAgICAgICAgICAgICAgIDx0ZHM6U2NvcGVzPjx0dDpTY29wZURlZj5GaXhlZDwvdHQ6U2NvcGVEZWY+PHR0OlNjb3BlSXRlbT5vbnZpZjovL3d3dy5vbnZpZi5vcmcvaGFyZHdhcmUvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcubW9kZWwpfTwvdHQ6U2NvcGVJdGVtPjwvdGRzOlNjb3Blcz5cbiAgICAgICAgICAgIDwvdGRzOkdldFNjb3Blc1Jlc3BvbnNlPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2V0U2VydmljZUNhcGFiaWxpdGllcyhwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBpZiAocGF0aC5pbmNsdWRlcygncHR6JykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgICAgIDx0cHR6OkdldFNlcnZpY2VDYXBhYmlsaXRpZXNSZXNwb25zZT5cbiAgICAgICAgICAgICAgICAgICAgPHRwdHo6Q2FwYWJpbGl0aWVzIEVGbGlwPVwiZmFsc2VcIiBSZXZlcnNlPVwiZmFsc2VcIiBHZXRDb21wYXRpYmxlQ29uZmlndXJhdGlvbnM9XCJmYWxzZVwiIE1vdmVTdGF0dXM9XCJ0cnVlXCIgU3RhdHVzUG9zaXRpb249XCJ0cnVlXCIvPlxuICAgICAgICAgICAgICAgIDwvdHB0ejpHZXRTZXJ2aWNlQ2FwYWJpbGl0aWVzUmVzcG9uc2U+YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGguaW5jbHVkZXMoJ2V2ZW50JykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgICAgIDx0ZXY6R2V0U2VydmljZUNhcGFiaWxpdGllc1Jlc3BvbnNlIHhtbG5zOnRldj1cImh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL2V2ZW50cy93c2RsXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXY6Q2FwYWJpbGl0aWVzIFdTU3Vic2NyaXB0aW9uUG9saWN5U3VwcG9ydD1cImZhbHNlXCIgV1NQdWxsUG9pbnRTdXBwb3J0PVwidHJ1ZVwiIFdTUGF1c2FibGVTdWJzY3JpcHRpb25NYW5hZ2VySW50ZXJmYWNlU3VwcG9ydD1cImZhbHNlXCIvPlxuICAgICAgICAgICAgICAgIDwvdGV2OkdldFNlcnZpY2VDYXBhYmlsaXRpZXNSZXNwb25zZT5gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGA8dGRzOkdldFNlcnZpY2VDYXBhYmlsaXRpZXNSZXNwb25zZT48dGRzOkNhcGFiaWxpdGllcy8+PC90ZHM6R2V0U2VydmljZUNhcGFiaWxpdGllc1Jlc3BvbnNlPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2V0TmV0d29ya0ludGVyZmFjZXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dGRzOkdldE5ldHdvcmtJbnRlcmZhY2VzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRkczpOZXR3b3JrSW50ZXJmYWNlcyB0b2tlbj1cImV0aDBcIj5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkVuYWJsZWQ+dHJ1ZTwvdHQ6RW5hYmxlZD5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkluZm8+PHR0Ok5hbWU+ZXRoMDwvdHQ6TmFtZT48dHQ6SHdBZGRyZXNzPiR7dGhpcy5jb25maWcubWFjQWRkcmVzc308L3R0Okh3QWRkcmVzcz48L3R0OkluZm8+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpJUHY0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkVuYWJsZWQ+dHJ1ZTwvdHQ6RW5hYmxlZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpDb25maWc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok1hbnVhbD48dHQ6QWRkcmVzcz4ke3RoaXMuY29uZmlnLmlwQWRkcmVzc308L3R0OkFkZHJlc3M+PHR0OlByZWZpeExlbmd0aD4yNDwvdHQ6UHJlZml4TGVuZ3RoPjwvdHQ6TWFudWFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpESENQPmZhbHNlPC90dDpESENQPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpDb25maWc+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6SVB2ND5cbiAgICAgICAgICAgICAgICA8L3RkczpOZXR3b3JrSW50ZXJmYWNlcz5cbiAgICAgICAgICAgIDwvdGRzOkdldE5ldHdvcmtJbnRlcmZhY2VzUmVzcG9uc2U+YCk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEV2ZW50IHNlcnZpY2Ug4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIGhhbmRsZUdldEV2ZW50UHJvcGVydGllcygpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0ZXY6R2V0RXZlbnRQcm9wZXJ0aWVzUmVzcG9uc2UgeG1sbnM6dGV2PVwiaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvZXZlbnRzL3dzZGxcIj5cbiAgICAgICAgICAgICAgICA8dGV2OlRvcGljTmFtZXNwYWNlTG9jYXRpb24+aHR0cDovL3d3dy5vbnZpZi5vcmcvb252aWYvdmVyMTAvdG9waWNucy90b3BpY25zLnhtbDwvdGV2OlRvcGljTmFtZXNwYWNlTG9jYXRpb24+XG4gICAgICAgICAgICAgICAgPHRldjpGaXhlZFRvcGljU2V0PmZhbHNlPC90ZXY6Rml4ZWRUb3BpY1NldD5cbiAgICAgICAgICAgICAgICA8dGV2OlRvcGljU2V0Lz5cbiAgICAgICAgICAgIDwvdGV2OkdldEV2ZW50UHJvcGVydGllc1Jlc3BvbnNlPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlQ3JlYXRlUHVsbFBvaW50U3Vic2NyaXB0aW9uKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSBgaHR0cDovLyR7dGhpcy5jb25maWcuaXBBZGRyZXNzfToke3RoaXMuY29uZmlnLmh0dHBQb3J0fWA7XG4gICAgICAgIGNvbnN0IHRlcm1UaW1lID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDM2MDAwMDApLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRldjpDcmVhdGVQdWxsUG9pbnRTdWJzY3JpcHRpb25SZXNwb25zZVxuICAgICAgICAgICAgICAgIHhtbG5zOnRldj1cImh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL2V2ZW50cy93c2RsXCJcbiAgICAgICAgICAgICAgICB4bWxuczp3c250PVwiaHR0cDovL2RvY3Mub2FzaXMtb3Blbi5vcmcvd3NuL2ItMlwiXG4gICAgICAgICAgICAgICAgeG1sbnM6d3NhPVwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNC8wOC9hZGRyZXNzaW5nXCI+XG4gICAgICAgICAgICAgICAgPHRldjpTdWJzY3JpcHRpb25SZWZlcmVuY2U+XG4gICAgICAgICAgICAgICAgICAgIDx3c2E6QWRkcmVzcz4ke2Jhc2VVcmx9L29udmlmL3B1bGxwb2ludDwvd3NhOkFkZHJlc3M+XG4gICAgICAgICAgICAgICAgPC90ZXY6U3Vic2NyaXB0aW9uUmVmZXJlbmNlPlxuICAgICAgICAgICAgICAgIDx0ZXY6Q3VycmVudFRpbWU+JHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9PC90ZXY6Q3VycmVudFRpbWU+XG4gICAgICAgICAgICAgICAgPHRldjpUZXJtaW5hdGlvblRpbWU+JHt0ZXJtVGltZX08L3RldjpUZXJtaW5hdGlvblRpbWU+XG4gICAgICAgICAgICA8L3RldjpDcmVhdGVQdWxsUG9pbnRTdWJzY3JpcHRpb25SZXNwb25zZT5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVB1bGxNZXNzYWdlcyhib2R5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCB0aW1lb3V0TWF0Y2ggPSBib2R5Lm1hdGNoKC88W146Pl0qOj9UaW1lb3V0W14+XSo+UFQoXFxkKylTLyk7XG4gICAgICAgIGNvbnN0IHRpbWVvdXRTZWMgPSBNYXRoLm1pbih0aW1lb3V0TWF0Y2ggPyBwYXJzZUludCh0aW1lb3V0TWF0Y2hbMV0pIDogMTAsIDYwKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBlbmRpbmdFdmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5idWlsZFB1bGxNZXNzYWdlc1Jlc3BvbnNlKHRoaXMucGVuZGluZ0V2ZW50cy5zcGxpY2UoMCkpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5wdWxsV2FpdGVycy5maW5kSW5kZXgodyA9PiB3LnRpbWVyID09PSB0aW1lcik7XG4gICAgICAgICAgICAgICAgaWYgKGlkeCA+PSAwKSB0aGlzLnB1bGxXYWl0ZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5idWlsZFB1bGxNZXNzYWdlc1Jlc3BvbnNlKFtdKSk7XG4gICAgICAgICAgICB9LCB0aW1lb3V0U2VjICogMTAwMCk7XG5cbiAgICAgICAgICAgIHRoaXMucHVsbFdhaXRlcnMucHVzaCh7IHJlc29sdmU6IChldmVudHMpID0+IHJlc29sdmUodGhpcy5idWlsZFB1bGxNZXNzYWdlc1Jlc3BvbnNlKGV2ZW50cykpLCB0aW1lciB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZFB1bGxNZXNzYWdlc1Jlc3BvbnNlKGV2ZW50czogUXVldWVkRXZlbnRbXSk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgY29uc3QgdGVybVRpbWUgPSBuZXcgRGF0ZShEYXRlLm5vdygpICsgMzYwMDAwMCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZXMgPSBldmVudHMubWFwKGUgPT4gYDx3c250Ok5vdGlmaWNhdGlvbk1lc3NhZ2U+JHtlLnhtbH08L3dzbnQ6Tm90aWZpY2F0aW9uTWVzc2FnZT5gKS5qb2luKCdcXG4nKTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dGV2OlB1bGxNZXNzYWdlc1Jlc3BvbnNlXG4gICAgICAgICAgICAgICAgeG1sbnM6dGV2PVwiaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvZXZlbnRzL3dzZGxcIlxuICAgICAgICAgICAgICAgIHhtbG5zOndzbnQ9XCJodHRwOi8vZG9jcy5vYXNpcy1vcGVuLm9yZy93c24vYi0yXCI+XG4gICAgICAgICAgICAgICAgPHRldjpDdXJyZW50VGltZT4ke25vd308L3RldjpDdXJyZW50VGltZT5cbiAgICAgICAgICAgICAgICA8dGV2OlRlcm1pbmF0aW9uVGltZT4ke3Rlcm1UaW1lfTwvdGV2OlRlcm1pbmF0aW9uVGltZT5cbiAgICAgICAgICAgICAgICAke21lc3NhZ2VzfVxuICAgICAgICAgICAgPC90ZXY6UHVsbE1lc3NhZ2VzUmVzcG9uc2U+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVSZW5ldygpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB0ZXJtVGltZSA9IG5ldyBEYXRlKERhdGUubm93KCkgKyAzNjAwMDAwKS50b0lTT1N0cmluZygpO1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx3c250OlJlbmV3UmVzcG9uc2UgeG1sbnM6d3NudD1cImh0dHA6Ly9kb2NzLm9hc2lzLW9wZW4ub3JnL3dzbi9iLTJcIj5cbiAgICAgICAgICAgICAgICA8d3NudDpUZXJtaW5hdGlvblRpbWU+JHt0ZXJtVGltZX08L3dzbnQ6VGVybWluYXRpb25UaW1lPlxuICAgICAgICAgICAgICAgIDx3c250OkN1cnJlbnRUaW1lPiR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfTwvd3NudDpDdXJyZW50VGltZT5cbiAgICAgICAgICAgIDwvd3NudDpSZW5ld1Jlc3BvbnNlPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlVW5zdWJzY3JpYmUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHdzbnQ6VW5zdWJzY3JpYmVSZXNwb25zZSB4bWxuczp3c250PVwiaHR0cDovL2RvY3Mub2FzaXMtb3Blbi5vcmcvd3NuL2ItMlwiLz5gKTtcbiAgICB9XG5cbiAgICAvLyDilIDilIAgTWVkaWEgc2VydmljZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgaGFuZGxlR2V0UHJvZmlsZXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dHJ0OkdldFByb2ZpbGVzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRydDpQcm9maWxlcyB0b2tlbj1cIk1haW5Qcm9maWxlXCIgZml4ZWQ9XCJ0cnVlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPk1haW5TdHJlYW08L3R0Ok5hbWU+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpWaWRlb1NvdXJjZUNvbmZpZ3VyYXRpb24gdG9rZW49XCJWaWRlb1NvdXJjZTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlZpZGVvU291cmNlMTwvdHQ6TmFtZT48dHQ6VXNlQ291bnQ+MTwvdHQ6VXNlQ291bnQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6U291cmNlVG9rZW4+VmlkZW9Tb3VyY2UxPC90dDpTb3VyY2VUb2tlbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpCb3VuZHMgeD1cIjBcIiB5PVwiMFwiIHdpZHRoPVwiMTkyMFwiIGhlaWdodD1cIjEwODBcIi8+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6VmlkZW9Tb3VyY2VDb25maWd1cmF0aW9uPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VmlkZW9FbmNvZGVyQ29uZmlndXJhdGlvbiB0b2tlbj1cIlZpZGVvRW5jb2RlcjFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlZpZGVvRW5jb2RlcjE8L3R0Ok5hbWU+PHR0OlVzZUNvdW50PjE8L3R0OlVzZUNvdW50PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkVuY29kaW5nPkgyNjQ8L3R0OkVuY29kaW5nPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlJlc29sdXRpb24+PHR0OldpZHRoPjE5MjA8L3R0OldpZHRoPjx0dDpIZWlnaHQ+MTA4MDwvdHQ6SGVpZ2h0PjwvdHQ6UmVzb2x1dGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpRdWFsaXR5PjU8L3R0OlF1YWxpdHk+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UmF0ZUNvbnRyb2w+PHR0OkZyYW1lUmF0ZUxpbWl0PjMwPC90dDpGcmFtZVJhdGVMaW1pdD48dHQ6RW5jb2RpbmdJbnRlcnZhbD4xPC90dDpFbmNvZGluZ0ludGVydmFsPjx0dDpCaXRyYXRlTGltaXQ+NDA5NjwvdHQ6Qml0cmF0ZUxpbWl0PjwvdHQ6UmF0ZUNvbnRyb2w+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SDI2ND48dHQ6R292TGVuZ3RoPjMwPC90dDpHb3ZMZW5ndGg+PHR0OkgyNjRQcm9maWxlPkhpZ2g8L3R0OkgyNjRQcm9maWxlPjwvdHQ6SDI2ND5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpNdWx0aWNhc3Q+PHR0OkFkZHJlc3M+PHR0OlR5cGU+SVB2NDwvdHQ6VHlwZT48dHQ6SVB2NEFkZHJlc3M+MC4wLjAuMDwvdHQ6SVB2NEFkZHJlc3M+PC90dDpBZGRyZXNzPjx0dDpQb3J0PjA8L3R0OlBvcnQ+PHR0OlRUTD4wPC90dDpUVEw+PHR0OkF1dG9TdGFydD5mYWxzZTwvdHQ6QXV0b1N0YXJ0PjwvdHQ6TXVsdGljYXN0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlNlc3Npb25UaW1lb3V0PlBUNjBTPC90dDpTZXNzaW9uVGltZW91dD5cbiAgICAgICAgICAgICAgICAgICAgPC90dDpWaWRlb0VuY29kZXJDb25maWd1cmF0aW9uPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6UFRaQ29uZmlndXJhdGlvbiB0b2tlbj1cIlBUWjFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlBUWjE8L3R0Ok5hbWU+PHR0OlVzZUNvdW50PjE8L3R0OlVzZUNvdW50Pjx0dDpOb2RlVG9rZW4+UFRaTm9kZTE8L3R0Ok5vZGVUb2tlbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0Q29udGludW91c1BhblRpbHRWZWxvY2l0eVNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovUGFuVGlsdFNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6RGVmYXVsdENvbnRpbnVvdXNQYW5UaWx0VmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0Q29udGludW91c1pvb21WZWxvY2l0eVNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovWm9vbVNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6RGVmYXVsdENvbnRpbnVvdXNab29tVmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0UFRaVGltZW91dD5QVDEwUzwvdHQ6RGVmYXVsdFBUWlRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UGFuVGlsdExpbWl0cz48dHQ6UmFuZ2U+PHR0OlVSST5odHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC90cHR6L1BhblRpbHRTcGFjZXMvUG9zaXRpb25HZW5lcmljU3BhY2U8L3R0OlVSST48dHQ6WFJhbmdlPjx0dDpNaW4+LTE8L3R0Ok1pbj48dHQ6TWF4PjE8L3R0Ok1heD48L3R0OlhSYW5nZT48dHQ6WVJhbmdlPjx0dDpNaW4+LTE8L3R0Ok1pbj48dHQ6TWF4PjE8L3R0Ok1heD48L3R0OllSYW5nZT48L3R0OlJhbmdlPjwvdHQ6UGFuVGlsdExpbWl0cz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpab29tTGltaXRzPjx0dDpSYW5nZT48dHQ6VVJJPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovWm9vbVNwYWNlcy9Qb3NpdGlvbkdlbmVyaWNTcGFjZTwvdHQ6VVJJPjx0dDpYUmFuZ2U+PHR0Ok1pbj4wPC90dDpNaW4+PHR0Ok1heD4xPC90dDpNYXg+PC90dDpYUmFuZ2U+PC90dDpSYW5nZT48L3R0Olpvb21MaW1pdHM+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6UFRaQ29uZmlndXJhdGlvbj5cbiAgICAgICAgICAgICAgICA8L3RydDpQcm9maWxlcz5cbiAgICAgICAgICAgICAgICA8dHJ0OlByb2ZpbGVzIHRva2VuPVwiU3ViUHJvZmlsZVwiIGZpeGVkPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6TmFtZT5TdWJTdHJlYW08L3R0Ok5hbWU+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpWaWRlb1NvdXJjZUNvbmZpZ3VyYXRpb24gdG9rZW49XCJWaWRlb1NvdXJjZTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlZpZGVvU291cmNlMTwvdHQ6TmFtZT48dHQ6VXNlQ291bnQ+MTwvdHQ6VXNlQ291bnQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6U291cmNlVG9rZW4+VmlkZW9Tb3VyY2UxPC90dDpTb3VyY2VUb2tlbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpCb3VuZHMgeD1cIjBcIiB5PVwiMFwiIHdpZHRoPVwiNjQwXCIgaGVpZ2h0PVwiNDgwXCIvPlxuICAgICAgICAgICAgICAgICAgICA8L3R0OlZpZGVvU291cmNlQ29uZmlndXJhdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlZpZGVvRW5jb2RlckNvbmZpZ3VyYXRpb24gdG9rZW49XCJWaWRlb0VuY29kZXIyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TmFtZT5WaWRlb0VuY29kZXIyPC90dDpOYW1lPjx0dDpVc2VDb3VudD4xPC90dDpVc2VDb3VudD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpFbmNvZGluZz5IMjY0PC90dDpFbmNvZGluZz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSZXNvbHV0aW9uPjx0dDpXaWR0aD42NDA8L3R0OldpZHRoPjx0dDpIZWlnaHQ+NDgwPC90dDpIZWlnaHQ+PC90dDpSZXNvbHV0aW9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlF1YWxpdHk+MzwvdHQ6UXVhbGl0eT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSYXRlQ29udHJvbD48dHQ6RnJhbWVSYXRlTGltaXQ+MTU8L3R0OkZyYW1lUmF0ZUxpbWl0Pjx0dDpFbmNvZGluZ0ludGVydmFsPjE8L3R0OkVuY29kaW5nSW50ZXJ2YWw+PHR0OkJpdHJhdGVMaW1pdD41MTI8L3R0OkJpdHJhdGVMaW1pdD48L3R0OlJhdGVDb250cm9sPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkgyNjQ+PHR0Okdvdkxlbmd0aD4zMDwvdHQ6R292TGVuZ3RoPjx0dDpIMjY0UHJvZmlsZT5NYWluPC90dDpIMjY0UHJvZmlsZT48L3R0OkgyNjQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TXVsdGljYXN0Pjx0dDpBZGRyZXNzPjx0dDpUeXBlPklQdjQ8L3R0OlR5cGU+PHR0OklQdjRBZGRyZXNzPjAuMC4wLjA8L3R0OklQdjRBZGRyZXNzPjwvdHQ6QWRkcmVzcz48dHQ6UG9ydD4wPC90dDpQb3J0Pjx0dDpUVEw+MDwvdHQ6VFRMPjx0dDpBdXRvU3RhcnQ+ZmFsc2U8L3R0OkF1dG9TdGFydD48L3R0Ok11bHRpY2FzdD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpTZXNzaW9uVGltZW91dD5QVDYwUzwvdHQ6U2Vzc2lvblRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6VmlkZW9FbmNvZGVyQ29uZmlndXJhdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlBUWkNvbmZpZ3VyYXRpb24gdG9rZW49XCJQVFoxXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TmFtZT5QVFoxPC90dDpOYW1lPjx0dDpVc2VDb3VudD4xPC90dDpVc2VDb3VudD48dHQ6Tm9kZVRva2VuPlBUWk5vZGUxPC90dDpOb2RlVG9rZW4+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6UFRaQ29uZmlndXJhdGlvbj5cbiAgICAgICAgICAgICAgICA8L3RydDpQcm9maWxlcz5cbiAgICAgICAgICAgIDwvdHJ0OkdldFByb2ZpbGVzUmVzcG9uc2U+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRTdHJlYW1VcmkoYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaXNTdWJzdHJlYW0gPSBib2R5LmluY2x1ZGVzKCdTdWJQcm9maWxlJyk7XG4gICAgICAgIGNvbnN0IHJ0c3BVcmwgPSB0aGlzLmNvbmZpZy5ydHNwVXJsLnJlcGxhY2UoJ3N1YnR5cGU9MCcsIGlzU3Vic3RyZWFtID8gJ3N1YnR5cGU9MScgOiAnc3VidHlwZT0wJyk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRydDpHZXRTdHJlYW1VcmlSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dHJ0Ok1lZGlhVXJpPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VXJpPiR7cnRzcFVybH08L3R0OlVyaT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkludmFsaWRBZnRlckNvbm5lY3Q+ZmFsc2U8L3R0OkludmFsaWRBZnRlckNvbm5lY3Q+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpJbnZhbGlkQWZ0ZXJSZWJvb3Q+ZmFsc2U8L3R0OkludmFsaWRBZnRlclJlYm9vdD5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlRpbWVvdXQ+UFQ2MFM8L3R0OlRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgPC90cnQ6TWVkaWFVcmk+XG4gICAgICAgICAgICA8L3RydDpHZXRTdHJlYW1VcmlSZXNwb25zZT5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldFNuYXBzaG90VXJpKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRydDpHZXRTbmFwc2hvdFVyaVJlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0cnQ6TWVkaWFVcmk+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpVcmk+JHt0aGlzLmNvbmZpZy5ydHNwVXJsfTwvdHQ6VXJpPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6SW52YWxpZEFmdGVyQ29ubmVjdD5mYWxzZTwvdHQ6SW52YWxpZEFmdGVyQ29ubmVjdD5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkludmFsaWRBZnRlclJlYm9vdD5mYWxzZTwvdHQ6SW52YWxpZEFmdGVyUmVib290PlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VGltZW91dD5QVDYwUzwvdHQ6VGltZW91dD5cbiAgICAgICAgICAgICAgICA8L3RydDpNZWRpYVVyaT5cbiAgICAgICAgICAgIDwvdHJ0OkdldFNuYXBzaG90VXJpUmVzcG9uc2U+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRWaWRlb1NvdXJjZXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dHJ0OkdldFZpZGVvU291cmNlc1Jlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0cnQ6VmlkZW9Tb3VyY2VzIHRva2VuPVwiVmlkZW9Tb3VyY2UxXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpGcmFtZXJhdGU+MzA8L3R0OkZyYW1lcmF0ZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlJlc29sdXRpb24+PHR0OldpZHRoPjE5MjA8L3R0OldpZHRoPjx0dDpIZWlnaHQ+MTA4MDwvdHQ6SGVpZ2h0PjwvdHQ6UmVzb2x1dGlvbj5cbiAgICAgICAgICAgICAgICA8L3RydDpWaWRlb1NvdXJjZXM+XG4gICAgICAgICAgICA8L3RydDpHZXRWaWRlb1NvdXJjZXNSZXNwb25zZT5gKTtcbiAgICB9XG5cbiAgICAvLyDilIDilIAgUFRaIHNlcnZpY2Ug4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIGhhbmRsZUdldE5vZGVzKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRwdHo6R2V0Tm9kZXNSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dHB0ejpQVFpOb2RlIHRva2VuPVwiUFRaTm9kZTFcIiBGaXhlZEhvbWVQb3NpdGlvbj1cImZhbHNlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlBUWiBOb2RlPC90dDpOYW1lPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6U3VwcG9ydGVkUFRaU3BhY2VzPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkNvbnRpbnVvdXNQYW5UaWx0VmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VVJJPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovUGFuVGlsdFNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6VVJJPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpYUmFuZ2U+PHR0Ok1pbj4tMTwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WFJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpZUmFuZ2U+PHR0Ok1pbj4tMTwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WVJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpDb250aW51b3VzUGFuVGlsdFZlbG9jaXR5U3BhY2U+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6Q29udGludW91c1pvb21WZWxvY2l0eVNwYWNlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpVUkk+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9ab29tU3BhY2VzL1ZlbG9jaXR5R2VuZXJpY1NwYWNlPC90dDpVUkk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlhSYW5nZT48dHQ6TWluPi0xPC90dDpNaW4+PHR0Ok1heD4xPC90dDpNYXg+PC90dDpYUmFuZ2U+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0OkNvbnRpbnVvdXNab29tVmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSZWxhdGl2ZVBhblRpbHRUcmFuc2xhdGlvblNwYWNlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpVUkk+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9QYW5UaWx0U3BhY2VzL1RyYW5zbGF0aW9uR2VuZXJpY1NwYWNlPC90dDpVUkk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlhSYW5nZT48dHQ6TWluPi0xPC90dDpNaW4+PHR0Ok1heD4xPC90dDpNYXg+PC90dDpYUmFuZ2U+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OllSYW5nZT48dHQ6TWluPi0xPC90dDpNaW4+PHR0Ok1heD4xPC90dDpNYXg+PC90dDpZUmFuZ2U+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0OlJlbGF0aXZlUGFuVGlsdFRyYW5zbGF0aW9uU3BhY2U+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UmVsYXRpdmVab29tVHJhbnNsYXRpb25TcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VVJJPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovWm9vbVNwYWNlcy9UcmFuc2xhdGlvbkdlbmVyaWNTcGFjZTwvdHQ6VVJJPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpYUmFuZ2U+PHR0Ok1pbj4tMTwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WFJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpSZWxhdGl2ZVpvb21UcmFuc2xhdGlvblNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8L3R0OlN1cHBvcnRlZFBUWlNwYWNlcz5cbiAgICAgICAgICAgICAgICAgICAgPHR0Ok1heGltdW1OdW1iZXJPZlByZXNldHM+MTY8L3R0Ok1heGltdW1OdW1iZXJPZlByZXNldHM+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpIb21lU3VwcG9ydGVkPmZhbHNlPC90dDpIb21lU3VwcG9ydGVkPlxuICAgICAgICAgICAgICAgIDwvdHB0ejpQVFpOb2RlPlxuICAgICAgICAgICAgPC90cHR6OkdldE5vZGVzUmVzcG9uc2U+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRQVFpDb25maWd1cmF0aW9ucygpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0cHR6OkdldENvbmZpZ3VyYXRpb25zUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRwdHo6UFRaQ29uZmlndXJhdGlvbiB0b2tlbj1cIlBUWjFcIj5cbiAgICAgICAgICAgICAgICAgICAgPHR0Ok5hbWU+UFRaIENvbmZpZ3VyYXRpb248L3R0Ok5hbWU+PHR0OlVzZUNvdW50PjI8L3R0OlVzZUNvdW50Pjx0dDpOb2RlVG9rZW4+UFRaTm9kZTE8L3R0Ok5vZGVUb2tlbj5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRlZmF1bHRDb250aW51b3VzUGFuVGlsdFZlbG9jaXR5U3BhY2U+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9QYW5UaWx0U3BhY2VzL1ZlbG9jaXR5R2VuZXJpY1NwYWNlPC90dDpEZWZhdWx0Q29udGludW91c1BhblRpbHRWZWxvY2l0eVNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6RGVmYXVsdENvbnRpbnVvdXNab29tVmVsb2NpdHlTcGFjZT5odHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC90cHR6L1pvb21TcGFjZXMvVmVsb2NpdHlHZW5lcmljU3BhY2U8L3R0OkRlZmF1bHRDb250aW51b3VzWm9vbVZlbG9jaXR5U3BhY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0UFRaVGltZW91dD5QVDEwUzwvdHQ6RGVmYXVsdFBUWlRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgPC90cHR6OlBUWkNvbmZpZ3VyYXRpb24+XG4gICAgICAgICAgICA8L3RwdHo6R2V0Q29uZmlndXJhdGlvbnNSZXNwb25zZT5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldFBUWkNvbmZpZ3VyYXRpb24oKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dHB0ejpHZXRDb25maWd1cmF0aW9uUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRwdHo6UFRaQ29uZmlndXJhdGlvbiB0b2tlbj1cIlBUWjFcIj5cbiAgICAgICAgICAgICAgICAgICAgPHR0Ok5hbWU+UFRaIENvbmZpZ3VyYXRpb248L3R0Ok5hbWU+PHR0OlVzZUNvdW50PjI8L3R0OlVzZUNvdW50Pjx0dDpOb2RlVG9rZW4+UFRaTm9kZTE8L3R0Ok5vZGVUb2tlbj5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRlZmF1bHRDb250aW51b3VzUGFuVGlsdFZlbG9jaXR5U3BhY2U+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9QYW5UaWx0U3BhY2VzL1ZlbG9jaXR5R2VuZXJpY1NwYWNlPC90dDpEZWZhdWx0Q29udGludW91c1BhblRpbHRWZWxvY2l0eVNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6RGVmYXVsdENvbnRpbnVvdXNab29tVmVsb2NpdHlTcGFjZT5odHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC90cHR6L1pvb21TcGFjZXMvVmVsb2NpdHlHZW5lcmljU3BhY2U8L3R0OkRlZmF1bHRDb250aW51b3VzWm9vbVZlbG9jaXR5U3BhY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0UFRaVGltZW91dD5QVDEwUzwvdHQ6RGVmYXVsdFBUWlRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgPC90cHR6OlBUWkNvbmZpZ3VyYXRpb24+XG4gICAgICAgICAgICA8L3RwdHo6R2V0Q29uZmlndXJhdGlvblJlc3BvbnNlPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2V0UFRaU3RhdHVzKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRwdHo6R2V0U3RhdHVzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRwdHo6UFRaU3RhdHVzPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6UG9zaXRpb24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UGFuVGlsdCB4PVwiMFwiIHk9XCIwXCIgc3BhY2U9XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC90cHR6L1BhblRpbHRTcGFjZXMvUG9zaXRpb25HZW5lcmljU3BhY2VcIi8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6Wm9vbSB4PVwiMFwiIHNwYWNlPVwiaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9ab29tU3BhY2VzL1Bvc2l0aW9uR2VuZXJpY1NwYWNlXCIvPlxuICAgICAgICAgICAgICAgICAgICA8L3R0OlBvc2l0aW9uPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6TW92ZVN0YXR1cz48dHQ6UGFuVGlsdD5JRExFPC90dDpQYW5UaWx0Pjx0dDpab29tPklETEU8L3R0Olpvb20+PC90dDpNb3ZlU3RhdHVzPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VXRjVGltZT4ke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX08L3R0OlV0Y1RpbWU+XG4gICAgICAgICAgICAgICAgPC90cHR6OlBUWlN0YXR1cz5cbiAgICAgICAgICAgIDwvdHB0ejpHZXRTdGF0dXNSZXNwb25zZT5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUNvbnRpbnVvdXNNb3ZlKGJvZHk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHB0eiA9IHRoaXMuZXh0cmFjdFBUWlZlbG9jaXR5KGJvZHkpO1xuICAgICAgICB0aGlzLmVtaXQoJ3B0eicsIHsgdHlwZTogJ2NvbnRpbnVvdXMnLCAuLi5wdHogfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYDx0cHR6OkNvbnRpbnVvdXNNb3ZlUmVzcG9uc2UvPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlUmVsYXRpdmVNb3ZlKGJvZHk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHB0eiA9IHRoaXMuZXh0cmFjdFBUWlRyYW5zbGF0aW9uKGJvZHkpO1xuICAgICAgICB0aGlzLmVtaXQoJ3B0eicsIHsgdHlwZTogJ3JlbGF0aXZlJywgLi4ucHR6IH0pO1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGA8dHB0ejpSZWxhdGl2ZU1vdmVSZXNwb25zZS8+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVBYnNvbHV0ZU1vdmUoYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgcHR6ID0gdGhpcy5leHRyYWN0UFRaUG9zaXRpb24oYm9keSk7XG4gICAgICAgIHRoaXMuZW1pdCgncHR6JywgeyB0eXBlOiAnYWJzb2x1dGUnLCAuLi5wdHogfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYDx0cHR6OkFic29sdXRlTW92ZVJlc3BvbnNlLz5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVBUWlN0b3AoKTogc3RyaW5nIHtcbiAgICAgICAgdGhpcy5lbWl0KCdwdHonLCB7IHR5cGU6ICdzdG9wJyB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6U3RvcFJlc3BvbnNlLz5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldFByZXNldHMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6R2V0UHJlc2V0c1Jlc3BvbnNlLz5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdvdG9QcmVzZXQoYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgcHJlc2V0TWF0Y2ggPSBib2R5Lm1hdGNoKC9QcmVzZXRUb2tlbltePl0qPihbXjxdKik8L2kpO1xuICAgICAgICB0aGlzLmVtaXQoJ3B0eicsIHsgdHlwZTogJ3ByZXNldCcsIHByZXNldDogcHJlc2V0TWF0Y2ggPyBwcmVzZXRNYXRjaFsxXSA6ICd1bmtub3duJyB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6R290b1ByZXNldFJlc3BvbnNlLz5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVNldFByZXNldChfYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6U2V0UHJlc2V0UmVzcG9uc2U+PHRwdHo6UHJlc2V0VG9rZW4+cHJlc2V0XzE8L3RwdHo6UHJlc2V0VG9rZW4+PC90cHR6OlNldFByZXNldFJlc3BvbnNlPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlUmVtb3ZlUHJlc2V0KF9ib2R5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGA8dHB0ejpSZW1vdmVQcmVzZXRSZXNwb25zZS8+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHb3RvSG9tZVBvc2l0aW9uKCk6IHN0cmluZyB7XG4gICAgICAgIHRoaXMuZW1pdCgncHR6JywgeyB0eXBlOiAnaG9tZScgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYDx0cHR6OkdvdG9Ib21lUG9zaXRpb25SZXNwb25zZS8+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVTZXRIb21lUG9zaXRpb24oKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6U2V0SG9tZVBvc2l0aW9uUmVzcG9uc2UvPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXh0cmFjdFBUWlZlbG9jaXR5KGJvZHk6IHN0cmluZyk6IFBUWkNvbW1hbmQge1xuICAgICAgICBjb25zdCByZXN1bHQ6IFBUWkNvbW1hbmQgPSB7fTtcbiAgICAgICAgY29uc3QgcGFuVGlsdE1hdGNoID0gYm9keS5tYXRjaCgvUGFuVGlsdFtePl0qeD1cIihbXlwiXSopXCJbXj5dKnk9XCIoW15cIl0qKVwiL2kpO1xuICAgICAgICBpZiAocGFuVGlsdE1hdGNoKSB7IHJlc3VsdC5wYW4gPSBwYXJzZUZsb2F0KHBhblRpbHRNYXRjaFsxXSkgfHwgMDsgcmVzdWx0LnRpbHQgPSBwYXJzZUZsb2F0KHBhblRpbHRNYXRjaFsyXSkgfHwgMDsgfVxuICAgICAgICBjb25zdCB6b29tTWF0Y2ggPSBib2R5Lm1hdGNoKC9ab29tW14+XSp4PVwiKFteXCJdKilcIi9pKTtcbiAgICAgICAgaWYgKHpvb21NYXRjaCkgcmVzdWx0Lnpvb20gPSBwYXJzZUZsb2F0KHpvb21NYXRjaFsxXSkgfHwgMDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RQVFpUcmFuc2xhdGlvbihib2R5OiBzdHJpbmcpOiBQVFpDb21tYW5kIHsgcmV0dXJuIHRoaXMuZXh0cmFjdFBUWlZlbG9jaXR5KGJvZHkpOyB9XG4gICAgcHJpdmF0ZSBleHRyYWN0UFRaUG9zaXRpb24oYm9keTogc3RyaW5nKTogUFRaQ29tbWFuZCB7IHJldHVybiB0aGlzLmV4dHJhY3RQVFpWZWxvY2l0eShib2R5KTsgfVxuXG4gICAgLy8g4pSA4pSAIFdTLURpc2NvdmVyeSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgYXN5bmMgc3RhcnREaXNjb3ZlcnkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcnlTb2NrZXQgPSBkZ3JhbS5jcmVhdGVTb2NrZXQoeyB0eXBlOiAndWRwNCcsIHJldXNlQWRkcjogdHJ1ZSB9KTtcblxuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcnlTb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VBRERSSU5VU0UnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uc29sZS5sb2coJ1tPTlZJRiBTZXJ2ZXJdIFdTLURpc2NvdmVyeSBwb3J0IDM3MDIgYWxyZWFkeSBpbiB1c2UgKGFub3RoZXIgY2FtZXJhIGhhcyBpdCknKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcnlTb2NrZXQ/LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzY292ZXJ5U29ja2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoJ1tPTlZJRiBTZXJ2ZXJdIERpc2NvdmVyeSBlcnJvcjonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuZGlzY292ZXJ5U29ja2V0Lm9uKCdtZXNzYWdlJywgKG1zZywgcmluZm8pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gbXNnLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ1Byb2JlJykgJiYgbWVzc2FnZS5pbmNsdWRlcygnTmV0d29ya1ZpZGVvVHJhbnNtaXR0ZXInKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRQcm9iZU1hdGNoKHJpbmZvLmFkZHJlc3MsIHJpbmZvLnBvcnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyeVNvY2tldC5iaW5kKDM3MDIsICcwLjAuMC4wJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzY292ZXJ5U29ja2V0IS5hZGRNZW1iZXJzaGlwKCcyMzkuMjU1LjI1NS4yNTAnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25zb2xlLmxvZygnW09OVklGIFNlcnZlcl0gV1MtRGlzY292ZXJ5IGxpc3RlbmluZyBvbiAyMzkuMjU1LjI1NS4yNTA6MzcwMicpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUubG9nKCdbT05WSUYgU2VydmVyXSBDb3VsZCBub3Qgam9pbiBtdWx0aWNhc3QgZ3JvdXA6JywgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2VuZFByb2JlTWF0Y2goYWRkcmVzczogc3RyaW5nLCBwb3J0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZUlkID0gYHVybjp1dWlkOiR7dGhpcy5nZW5lcmF0ZVVVSUQoKX1gO1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gYGh0dHA6Ly8ke3RoaXMuY29uZmlnLmlwQWRkcmVzc306JHt0aGlzLmNvbmZpZy5odHRwUG9ydH1gO1xuXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPHNvYXA6RW52ZWxvcGUgeG1sbnM6c29hcD1cImh0dHA6Ly93d3cudzMub3JnLzIwMDMvMDUvc29hcC1lbnZlbG9wZVwiXG4gICAgICAgICAgICAgICB4bWxuczp3c2E9XCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA0LzA4L2FkZHJlc3NpbmdcIlxuICAgICAgICAgICAgICAgeG1sbnM6d3NkPVwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNC9kaXNjb3ZlcnlcIlxuICAgICAgICAgICAgICAgeG1sbnM6ZG49XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9uZXR3b3JrL3dzZGxcIj5cbiAgICA8c29hcDpIZWFkZXI+XG4gICAgICAgIDx3c2E6TWVzc2FnZUlEPiR7bWVzc2FnZUlkfTwvd3NhOk1lc3NhZ2VJRD5cbiAgICAgICAgPHdzYTpUbz5odHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA0LzA4L2FkZHJlc3Npbmcvcm9sZS9hbm9ueW1vdXM8L3dzYTpUbz5cbiAgICAgICAgPHdzYTpBY3Rpb24+aHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNC9kaXNjb3ZlcnkvUHJvYmVNYXRjaGVzPC93c2E6QWN0aW9uPlxuICAgIDwvc29hcDpIZWFkZXI+XG4gICAgPHNvYXA6Qm9keT5cbiAgICAgICAgPHdzZDpQcm9iZU1hdGNoZXM+XG4gICAgICAgICAgICA8d3NkOlByb2JlTWF0Y2g+XG4gICAgICAgICAgICAgICAgPHdzYTpFbmRwb2ludFJlZmVyZW5jZT48d3NhOkFkZHJlc3M+dXJuOnV1aWQ6JHt0aGlzLmNvbmZpZy5zZXJpYWxOdW1iZXJ9PC93c2E6QWRkcmVzcz48L3dzYTpFbmRwb2ludFJlZmVyZW5jZT5cbiAgICAgICAgICAgICAgICA8d3NkOlR5cGVzPmRuOk5ldHdvcmtWaWRlb1RyYW5zbWl0dGVyPC93c2Q6VHlwZXM+XG4gICAgICAgICAgICAgICAgPHdzZDpTY29wZXM+XG4gICAgICAgICAgICAgICAgICAgIG9udmlmOi8vd3d3Lm9udmlmLm9yZy90eXBlL3ZpZGVvX2VuY29kZXJcbiAgICAgICAgICAgICAgICAgICAgb252aWY6Ly93d3cub252aWYub3JnL3R5cGUvcHR6XG4gICAgICAgICAgICAgICAgICAgIG9udmlmOi8vd3d3Lm9udmlmLm9yZy9Qcm9maWxlL1N0cmVhbWluZ1xuICAgICAgICAgICAgICAgICAgICBvbnZpZjovL3d3dy5vbnZpZi5vcmcvbmFtZS8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5kZXZpY2VOYW1lKX1cbiAgICAgICAgICAgICAgICAgICAgb252aWY6Ly93d3cub252aWYub3JnL2hhcmR3YXJlLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLm1vZGVsKX1cbiAgICAgICAgICAgICAgICA8L3dzZDpTY29wZXM+XG4gICAgICAgICAgICAgICAgPHdzZDpYQWRkcnM+JHtiYXNlVXJsfS9vbnZpZi9kZXZpY2Vfc2VydmljZTwvd3NkOlhBZGRycz5cbiAgICAgICAgICAgICAgICA8d3NkOk1ldGFkYXRhVmVyc2lvbj4xPC93c2Q6TWV0YWRhdGFWZXJzaW9uPlxuICAgICAgICAgICAgPC93c2Q6UHJvYmVNYXRjaD5cbiAgICAgICAgPC93c2Q6UHJvYmVNYXRjaGVzPlxuICAgIDwvc29hcDpCb2R5PlxuPC9zb2FwOkVudmVsb3BlPmA7XG5cbiAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20ocmVzcG9uc2UpO1xuICAgICAgICB0aGlzLmRpc2NvdmVyeVNvY2tldD8uc2VuZChidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIHBvcnQsIGFkZHJlc3MpO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBVdGlsaXRpZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIHdyYXBTb2FwUmVzcG9uc2UoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz5cbjxzb2FwOkVudmVsb3BlIHhtbG5zOnNvYXA9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAzLzA1L3NvYXAtZW52ZWxvcGVcIlxuICAgICAgICAgICAgICAgeG1sbnM6dGRzPVwiaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvZGV2aWNlL3dzZGxcIlxuICAgICAgICAgICAgICAgeG1sbnM6dHJ0PVwiaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvbWVkaWEvd3NkbFwiXG4gICAgICAgICAgICAgICB4bWxuczp0cHR6PVwiaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMjAvcHR6L3dzZGxcIlxuICAgICAgICAgICAgICAgeG1sbnM6dHQ9XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9zY2hlbWFcIj5cbiAgICA8c29hcDpCb2R5PlxuICAgICAgICAke2NvbnRlbnQudHJpbSgpfVxuICAgIDwvc29hcDpCb2R5PlxuPC9zb2FwOkVudmVsb3BlPmA7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjcmVhdGVTb2FwRmF1bHQoY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPHNvYXA6RW52ZWxvcGUgeG1sbnM6c29hcD1cImh0dHA6Ly93d3cudzMub3JnLzIwMDMvMDUvc29hcC1lbnZlbG9wZVwiPlxuICAgIDxzb2FwOkJvZHk+XG4gICAgICAgIDxzb2FwOkZhdWx0PlxuICAgICAgICAgICAgPHNvYXA6Q29kZT48c29hcDpWYWx1ZT5zb2FwOiR7Y29kZX08L3NvYXA6VmFsdWU+PC9zb2FwOkNvZGU+XG4gICAgICAgICAgICA8c29hcDpSZWFzb24+PHNvYXA6VGV4dCB4bWw6bGFuZz1cImVuXCI+JHttZXNzYWdlfTwvc29hcDpUZXh0Pjwvc29hcDpSZWFzb24+XG4gICAgICAgIDwvc29hcDpGYXVsdD5cbiAgICA8L3NvYXA6Qm9keT5cbjwvc29hcDpFbnZlbG9wZT5gO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVVVUlEKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIChjKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gTWF0aC5yYW5kb20oKSAqIDE2IHwgMDtcbiAgICAgICAgICAgIHJldHVybiAoYyA9PT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KSkudG9TdHJpbmcoMTYpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4iXX0=