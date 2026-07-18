import * as http from 'http';
import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface OnvifServerConfig {
    httpPort: number;
    rtspUrl: string;
    deviceName: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    hardwareId: string;
    macAddress: string;
    ipAddress: string;
    // Native camera event proxy (optional): subscribe to the camera's own ONVIF
    // events and re-serve them via this server's PullPoint endpoint.
    nativeCameraHost?: string;
    nativeCameraUsername?: string;
    nativeCameraPassword?: string;
    console?: Console;
}

export type PTZCommandType = 'continuous' | 'relative' | 'absolute' | 'stop' | 'preset' | 'home';

interface ProxiedEvent {
    xml: string;
    timestamp: Date;
}

interface PullWaiter {
    resolve: (events: ProxiedEvent[]) => void;
    timer: NodeJS.Timeout;
}

export interface PTZCommand {
    type?: PTZCommandType;
    pan?: number;
    tilt?: number;
    zoom?: number;
    preset?: string;
}

export class OnvifServer extends EventEmitter {
    private config: OnvifServerConfig;
    private httpServer: http.Server | null = null;
    private discoverySocket: dgram.Socket | null = null;
    private console: Console;
    private running: boolean = false;

    // Native camera event proxy state
    private pendingEvents: ProxiedEvent[] = [];
    private pullWaiters: PullWaiter[] = [];
    private nativeSubscriptionUrl: string | null = null;
    private nativeProxyRunning: boolean = false;
    private nativeRetryTimer: NodeJS.Timeout | null = null;

    // ONVIF namespaces
    private readonly NS = {
        soap: 'http://www.w3.org/2003/05/soap-envelope',
        wsa: 'http://schemas.xmlsoap.org/ws/2004/08/addressing',
        wsd: 'http://schemas.xmlsoap.org/ws/2005/04/discovery',
        tds: 'http://www.onvif.org/ver10/device/wsdl',
        trt: 'http://www.onvif.org/ver10/media/wsdl',
        tptz: 'http://www.onvif.org/ver20/ptz/wsdl',
        tt: 'http://www.onvif.org/ver10/schema',
    };

    constructor(config: OnvifServerConfig) {
        super();
        this.config = config;
        this.console = config.console || console;
    }

    async start(): Promise<void> {
        if (this.running) return;

        // Start HTTP server for SOAP requests
        await this.startHttpServer();

        // Start WS-Discovery listener
        await this.startDiscovery();

        this.running = true;
        this.console.log(`[ONVIF Server] Started on port ${this.config.httpPort}`);

        if (this.config.nativeCameraHost) {
            this.startNativeEventProxy();
        }
    }

    async stop(): Promise<void> {
        this.running = false;
        this.nativeProxyRunning = false;

        if (this.nativeRetryTimer) {
            clearTimeout(this.nativeRetryTimer);
            this.nativeRetryTimer = null;
        }
        for (const waiter of this.pullWaiters) {
            clearTimeout(waiter.timer);
            waiter.resolve([]);
        }
        this.pullWaiters = [];

        if (this.httpServer) {
            const server = this.httpServer;
            this.httpServer = null;
            // Destroy keep-alive connections and wait for close, otherwise a
            // quick stop/start on a settings change can hit EADDRINUSE.
            server.closeAllConnections();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }

        if (this.discoverySocket) {
            try {
                this.discoverySocket.close();
            } catch (e) {
                // Socket may already be closed
            }
            this.discoverySocket = null;
        }

        this.console.log('[ONVIF Server] Stopped');
    }

    // ── Native camera event proxy ────────────────────────────────────────────
    // Subscribes to the Amcrest camera's own ONVIF event service and re-serves
    // those events on this server's PullPoint endpoint (consumed by Frigate).
    private startNativeEventProxy(): void {
        if (this.nativeProxyRunning) return;
        this.nativeProxyRunning = true;
        this.nativeEventProxyLoop();
    }

    private async nativeEventProxyLoop(): Promise<void> {
        if (!this.running || !this.config.nativeCameraHost) return;
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
            if (!urlMatch) throw new Error('No subscription URL in response');
            this.nativeSubscriptionUrl = urlMatch[1].trim();
            this.console.log('[ONVIF Events] Subscribed to native camera:', this.nativeSubscriptionUrl);
            while (this.running) {
                await this.pollNativeEvents(username, password);
            }
        } catch (e: any) {
            this.console.error('[ONVIF Events] Proxy error:', e?.message, '— retrying in 30s');
        }
        this.nativeSubscriptionUrl = null;
        if (this.running) {
            this.nativeRetryTimer = setTimeout(() => {
                this.nativeRetryTimer = null;
                this.nativeEventProxyLoop();
            }, 30000);
        }
    }

    private async pollNativeEvents(username: string, password: string): Promise<void> {
        if (!this.nativeSubscriptionUrl) return;
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

    private queueEvent(event: ProxiedEvent): void {
        this.pendingEvents.push(event);
        // Deliver to any waiting PullMessages requests
        while (this.pullWaiters.length > 0 && this.pendingEvents.length > 0) {
            const waiter = this.pullWaiters.shift()!;
            clearTimeout(waiter.timer);
            waiter.resolve(this.pendingEvents.splice(0));
        }
        // Bound queue size
        if (this.pendingEvents.length > 100) {
            this.pendingEvents.splice(0, this.pendingEvents.length - 100);
        }
    }

    // ── HTTP Digest auth helper ──────────────────────────────────────────────
    private async httpDigestPost(url: string, username: string, password: string, body: string, timeoutMs = 10000): Promise<string> {
        const first = await this.httpPost(url, body, undefined, timeoutMs);
        if (first.status === 200) return first.body;
        if (first.status !== 401) throw new Error(`HTTP ${first.status} from ${url}`);
        const authHeader = (first.headers['www-authenticate'] as string) || '';
        const realm = authHeader.match(/realm="([^"]+)"/)?.[1];
        const nonce = authHeader.match(/nonce="([^"]+)"/)?.[1];
        const qop = authHeader.match(/qop="([^"]+)"/)?.[1];
        const opaque = authHeader.match(/opaque="([^"]+)"/)?.[1];
        if (!realm || !nonce) throw new Error(`Invalid WWW-Authenticate: ${authHeader}`);
        const parsedUrl = new URL(url);
        const uri = parsedUrl.pathname + parsedUrl.search;
        const nc = '00000001';
        const cnonce = crypto.randomBytes(4).toString('hex');
        const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
        const ha2 = crypto.createHash('md5').update(`POST:${uri}`).digest('hex');
        let digestResp: string;
        if (qop === 'auth' || qop === 'auth,auth-int') {
            digestResp = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`).digest('hex');
        } else {
            digestResp = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
        }
        let authValue = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${digestResp}"`;
        if (qop) authValue += `, qop=auth, nc=${nc}, cnonce="${cnonce}"`;
        if (opaque) authValue += `, opaque="${opaque}"`;
        const second = await this.httpPost(url, body, authValue, timeoutMs);
        if (second.status !== 200) throw new Error(`HTTP ${second.status} after digest auth`);
        return second.body;
    }

    private httpPost(url: string, body: string, authorizationHeader?: string, timeoutMs = 10000): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const options: http.RequestOptions = {
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

    // ── Event service handlers (served to Frigate/HomeKit) ───────────────────
    private handleGetEventProperties(): string {
        return this.wrapSoapResponse(`
            <tev:GetEventPropertiesResponse xmlns:tev="http://www.onvif.org/ver10/events/wsdl">
                <tev:TopicNamespaceLocation>http://www.onvif.org/onvif/ver10/topicns/topicns.xml</tev:TopicNamespaceLocation>
                <tev:FixedTopicSet>false</tev:FixedTopicSet>
                <tev:TopicSet/>
            </tev:GetEventPropertiesResponse>`);
    }

    private handleCreatePullPointSubscription(): string {
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

    private handlePullMessages(body: string): Promise<string> {
        const timeoutMatch = body.match(/<[^:>]*:?Timeout[^>]*>PT(\d+)S/);
        const timeoutSec = Math.min(timeoutMatch ? parseInt(timeoutMatch[1]) : 10, 60);
        return new Promise((resolve) => {
            if (this.pendingEvents.length > 0) {
                resolve(this.buildPullMessagesResponse(this.pendingEvents.splice(0)));
                return;
            }
            const timer = setTimeout(() => {
                const idx = this.pullWaiters.findIndex(w => w.timer === timer);
                if (idx >= 0) this.pullWaiters.splice(idx, 1);
                resolve(this.buildPullMessagesResponse([]));
            }, timeoutSec * 1000);
            this.pullWaiters.push({ resolve: (events) => resolve(this.buildPullMessagesResponse(events)), timer });
        });
    }

    private buildPullMessagesResponse(events: ProxiedEvent[]): string {
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

    private handleRenew(): string {
        const termTime = new Date(Date.now() + 3600000).toISOString();
        return this.wrapSoapResponse(`
            <wsnt:RenewResponse xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2">
                <wsnt:TerminationTime>${termTime}</wsnt:TerminationTime>
                <wsnt:CurrentTime>${new Date().toISOString()}</wsnt:CurrentTime>
            </wsnt:RenewResponse>`);
    }

    private handleUnsubscribe(): string {
        return this.wrapSoapResponse(`<wsnt:UnsubscribeResponse xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2"/>`);
    }

    private async startHttpServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.httpServer = http.createServer((req, res) => {
                this.handleHttpRequest(req, res);
            });

            this.httpServer.on('error', (err) => {
                this.console.error('[ONVIF Server] HTTP error:', err.message);
                reject(err);
            });

            this.httpServer.listen(this.config.httpPort, '0.0.0.0', () => {
                resolve();
            });
        });
    }

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        this.console.log(`[ONVIF Server] HTTP ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                this.console.log(`[ONVIF Server] Request body length: ${body.length}`);
                const response = await this.handleSoapRequest(req.url || '/', body);
                res.writeHead(200, {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(response),
                });
                res.end(response);
            } catch (err: any) {
                this.console.error('[ONVIF Server] Request error:', err.message);
                const fault = this.createSoapFault('Server', err.message);
                res.writeHead(500, {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                });
                res.end(fault);
            }
        });
    }

    private async handleSoapRequest(path: string, body: string): Promise<string> {
        // Extract action from SOAP body
        const action = this.extractSoapAction(body);
        this.console.log(`[ONVIF Server] Request: ${path} Action: ${action}`);

        // Route to appropriate handler
        if (action.includes('GetSystemDateAndTime')) {
            return this.handleGetSystemDateAndTime();
        } else if (action.includes('GetCapabilities')) {
            return this.handleGetCapabilities();
        } else if (action.includes('GetServices')) {
            return this.handleGetServices();
        } else if (action.includes('GetDeviceInformation')) {
            return this.handleGetDeviceInformation();
        } else if (action.includes('GetProfiles')) {
            return this.handleGetProfiles();
        } else if (action.includes('GetStreamUri')) {
            return this.handleGetStreamUri(body);
        } else if (action.includes('GetSnapshotUri')) {
            return this.handleGetSnapshotUri();
        } else if (action.includes('GetNodes') || action.includes('GetNode')) {
            return this.handleGetNodes();
        } else if (action.includes('GetConfigurations')) {
            // PTZ GetConfigurations (only PTZ has this action among served services)
            return this.handleGetPTZConfigurations();
        } else if (action.includes('GetConfiguration')) {
            return this.handleGetPTZConfiguration();
        } else if (action.includes('GetStatus')) {
            return this.handleGetPTZStatus();
        } else if (action.includes('ContinuousMove')) {
            return this.handleContinuousMove(body);
        } else if (action.includes('RelativeMove')) {
            return this.handleRelativeMove(body);
        } else if (action.includes('AbsoluteMove')) {
            return this.handleAbsoluteMove(body);
        } else if (action.includes('Stop')) {
            return this.handlePTZStop();
        } else if (action.includes('GetPresets')) {
            return this.handleGetPresets();
        } else if (action.includes('GotoPreset')) {
            return this.handleGotoPreset(body);
        } else if (action.includes('SetPreset')) {
            return this.handleSetPreset(body);
        } else if (action.includes('RemovePreset')) {
            return this.handleRemovePreset(body);
        } else if (action.includes('GotoHomePosition')) {
            return this.handleGotoHomePosition();
        } else if (action.includes('SetHomePosition')) {
            return this.handleSetHomePosition();
        } else if (action.includes('GetScopes')) {
            return this.handleGetScopes();
        } else if (action.includes('GetServiceCapabilities')) {
            return this.handleGetServiceCapabilities(path);
        } else if (action.includes('GetVideoSources')) {
            return this.handleGetVideoSources();
        } else if (action.includes('GetNetworkInterfaces')) {
            return this.handleGetNetworkInterfaces();
        } else if (action.includes('GetEventProperties')) {
            return this.handleGetEventProperties();
        } else if (action.includes('CreatePullPointSubscription')) {
            return this.handleCreatePullPointSubscription();
        } else if (action.includes('PullMessages')) {
            return this.handlePullMessages(body);
        } else if (action.includes('Renew')) {
            return this.handleRenew();
        } else if (action.includes('Unsubscribe')) {
            return this.handleUnsubscribe();
        } else {
            // A SOAP fault is far easier to debug client-side than a
            // well-formed-but-wrong default response.
            this.console.log(`[ONVIF Server] Unsupported action: ${action}`);
            throw new Error(`Unsupported ONVIF action: ${action}`);
        }
    }

    private extractSoapAction(body: string): string {
        // Try to extract from Body element
        const bodyMatch = body.match(/<[^:]*:?Body[^>]*>([\s\S]*?)<\/[^:]*:?Body>/i);
        if (bodyMatch) {
            const innerContent = bodyMatch[1];
            const actionMatch = innerContent.match(/<([^\s>\/]+)/);
            if (actionMatch) {
                return actionMatch[1].replace(/^[^:]+:/, '');
            }
        }
        return 'Unknown';
    }

    // Device Service handlers
    private handleGetSystemDateAndTime(): string {
        const now = new Date();
        return this.wrapSoapResponse(`
            <tds:GetSystemDateAndTimeResponse>
                <tds:SystemDateAndTime>
                    <tt:DateTimeType>NTP</tt:DateTimeType>
                    <tt:DaylightSavings>false</tt:DaylightSavings>
                    <tt:TimeZone>
                        <tt:TZ>UTC0</tt:TZ>
                    </tt:TimeZone>
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
            </tds:GetSystemDateAndTimeResponse>
        `);
    }

    private handleGetCapabilities(): string {
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
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
                    </tt:Device>
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
            </tds:GetCapabilitiesResponse>
        `);
    }

    private handleGetServices(): string {
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        return this.wrapSoapResponse(`
            <tds:GetServicesResponse>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/device_service</tds:XAddr>
                    <tds:Version>
                        <tt:Major>2</tt:Major>
                        <tt:Minor>0</tt:Minor>
                    </tds:Version>
                </tds:Service>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/media_service</tds:XAddr>
                    <tds:Version>
                        <tt:Major>2</tt:Major>
                        <tt:Minor>0</tt:Minor>
                    </tds:Version>
                </tds:Service>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver20/ptz/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/ptz_service</tds:XAddr>
                    <tds:Version>
                        <tt:Major>2</tt:Major>
                        <tt:Minor>0</tt:Minor>
                    </tds:Version>
                </tds:Service>
            </tds:GetServicesResponse>
        `);
    }

    private handleGetDeviceInformation(): string {
        return this.wrapSoapResponse(`
            <tds:GetDeviceInformationResponse>
                <tds:Manufacturer>${this.config.manufacturer}</tds:Manufacturer>
                <tds:Model>${this.config.model}</tds:Model>
                <tds:FirmwareVersion>1.0.0</tds:FirmwareVersion>
                <tds:SerialNumber>${this.config.serialNumber}</tds:SerialNumber>
                <tds:HardwareId>${this.config.hardwareId}</tds:HardwareId>
            </tds:GetDeviceInformationResponse>
        `);
    }

    private handleGetScopes(): string {
        return this.wrapSoapResponse(`
            <tds:GetScopesResponse>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/type/video_encoder</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/type/ptz</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/Profile/Streaming</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/name/${encodeURIComponent(this.config.deviceName)}</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/hardware/${encodeURIComponent(this.config.model)}</tt:ScopeItem>
                </tds:Scopes>
            </tds:GetScopesResponse>
        `);
    }

    private handleGetServiceCapabilities(path: string): string {
        if (path.includes('ptz')) {
            return this.wrapSoapResponse(`
                <tptz:GetServiceCapabilitiesResponse>
                    <tptz:Capabilities EFlip="false" Reverse="false" GetCompatibleConfigurations="false" MoveStatus="true" StatusPosition="true"/>
                </tptz:GetServiceCapabilitiesResponse>
            `);
        }
        return this.wrapSoapResponse(`
            <tds:GetServiceCapabilitiesResponse>
                <tds:Capabilities/>
            </tds:GetServiceCapabilitiesResponse>
        `);
    }

    private handleGetNetworkInterfaces(): string {
        return this.wrapSoapResponse(`
            <tds:GetNetworkInterfacesResponse>
                <tds:NetworkInterfaces token="eth0">
                    <tt:Enabled>true</tt:Enabled>
                    <tt:Info>
                        <tt:Name>eth0</tt:Name>
                        <tt:HwAddress>${this.config.macAddress}</tt:HwAddress>
                    </tt:Info>
                    <tt:IPv4>
                        <tt:Enabled>true</tt:Enabled>
                        <tt:Config>
                            <tt:Manual>
                                <tt:Address>${this.config.ipAddress}</tt:Address>
                                <tt:PrefixLength>24</tt:PrefixLength>
                            </tt:Manual>
                            <tt:DHCP>false</tt:DHCP>
                        </tt:Config>
                    </tt:IPv4>
                </tds:NetworkInterfaces>
            </tds:GetNetworkInterfacesResponse>
        `);
    }

    // Media Service handlers
    private handleGetProfiles(): string {
        return this.wrapSoapResponse(`
            <trt:GetProfilesResponse>
                <trt:Profiles token="MainProfile" fixed="true">
                    <tt:Name>MainStream</tt:Name>
                    <tt:VideoSourceConfiguration token="VideoSource1">
                        <tt:Name>VideoSource1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:SourceToken>VideoSource1</tt:SourceToken>
                        <tt:Bounds x="0" y="0" width="1920" height="1080"/>
                    </tt:VideoSourceConfiguration>
                    <tt:VideoEncoderConfiguration token="VideoEncoder1">
                        <tt:Name>VideoEncoder1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:Encoding>H264</tt:Encoding>
                        <tt:Resolution>
                            <tt:Width>1920</tt:Width>
                            <tt:Height>1080</tt:Height>
                        </tt:Resolution>
                        <tt:Quality>5</tt:Quality>
                        <tt:RateControl>
                            <tt:FrameRateLimit>30</tt:FrameRateLimit>
                            <tt:EncodingInterval>1</tt:EncodingInterval>
                            <tt:BitrateLimit>4096</tt:BitrateLimit>
                        </tt:RateControl>
                        <tt:H264>
                            <tt:GovLength>30</tt:GovLength>
                            <tt:H264Profile>High</tt:H264Profile>
                        </tt:H264>
                        <tt:Multicast>
                            <tt:Address>
                                <tt:Type>IPv4</tt:Type>
                                <tt:IPv4Address>0.0.0.0</tt:IPv4Address>
                            </tt:Address>
                            <tt:Port>0</tt:Port>
                            <tt:TTL>0</tt:TTL>
                            <tt:AutoStart>false</tt:AutoStart>
                        </tt:Multicast>
                        <tt:SessionTimeout>PT60S</tt:SessionTimeout>
                    </tt:VideoEncoderConfiguration>
                    <tt:PTZConfiguration token="PTZ1">
                        <tt:Name>PTZ1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:NodeToken>PTZNode1</tt:NodeToken>
                        <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                        <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                        <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                        <tt:PanTiltLimits>
                            <tt:Range>
                                <tt:URI>http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace</tt:URI>
                                <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                                <tt:YRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:YRange>
                            </tt:Range>
                        </tt:PanTiltLimits>
                        <tt:ZoomLimits>
                            <tt:Range>
                                <tt:URI>http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace</tt:URI>
                                <tt:XRange><tt:Min>0</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                            </tt:Range>
                        </tt:ZoomLimits>
                    </tt:PTZConfiguration>
                </trt:Profiles>
                <trt:Profiles token="SubProfile" fixed="true">
                    <tt:Name>SubStream</tt:Name>
                    <tt:VideoSourceConfiguration token="VideoSource1">
                        <tt:Name>VideoSource1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:SourceToken>VideoSource1</tt:SourceToken>
                        <tt:Bounds x="0" y="0" width="640" height="480"/>
                    </tt:VideoSourceConfiguration>
                    <tt:VideoEncoderConfiguration token="VideoEncoder2">
                        <tt:Name>VideoEncoder2</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:Encoding>H264</tt:Encoding>
                        <tt:Resolution>
                            <tt:Width>640</tt:Width>
                            <tt:Height>480</tt:Height>
                        </tt:Resolution>
                        <tt:Quality>3</tt:Quality>
                        <tt:RateControl>
                            <tt:FrameRateLimit>15</tt:FrameRateLimit>
                            <tt:EncodingInterval>1</tt:EncodingInterval>
                            <tt:BitrateLimit>512</tt:BitrateLimit>
                        </tt:RateControl>
                        <tt:H264>
                            <tt:GovLength>30</tt:GovLength>
                            <tt:H264Profile>Main</tt:H264Profile>
                        </tt:H264>
                        <tt:Multicast>
                            <tt:Address>
                                <tt:Type>IPv4</tt:Type>
                                <tt:IPv4Address>0.0.0.0</tt:IPv4Address>
                            </tt:Address>
                            <tt:Port>0</tt:Port>
                            <tt:TTL>0</tt:TTL>
                            <tt:AutoStart>false</tt:AutoStart>
                        </tt:Multicast>
                        <tt:SessionTimeout>PT60S</tt:SessionTimeout>
                    </tt:VideoEncoderConfiguration>
                    <tt:PTZConfiguration token="PTZ1">
                        <tt:Name>PTZ1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:NodeToken>PTZNode1</tt:NodeToken>
                    </tt:PTZConfiguration>
                </trt:Profiles>
            </trt:GetProfilesResponse>
        `);
    }

    private handleGetStreamUri(body: string): string {
        // Check which profile is requested
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
            </trt:GetStreamUriResponse>
        `);
    }

    private handleGetSnapshotUri(): string {
        return this.wrapSoapResponse(`
            <trt:GetSnapshotUriResponse>
                <trt:MediaUri>
                    <tt:Uri>${this.config.rtspUrl}</tt:Uri>
                    <tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>
                    <tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>
                    <tt:Timeout>PT60S</tt:Timeout>
                </trt:MediaUri>
            </trt:GetSnapshotUriResponse>
        `);
    }

    private handleGetVideoSources(): string {
        return this.wrapSoapResponse(`
            <trt:GetVideoSourcesResponse>
                <trt:VideoSources token="VideoSource1">
                    <tt:Framerate>30</tt:Framerate>
                    <tt:Resolution>
                        <tt:Width>1920</tt:Width>
                        <tt:Height>1080</tt:Height>
                    </tt:Resolution>
                </trt:VideoSources>
            </trt:GetVideoSourcesResponse>
        `);
    }

    // PTZ Service handlers
    private handleGetNodes(): string {
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
            </tptz:GetNodesResponse>
        `);
    }

    private handleGetPTZConfigurations(): string {
        return this.wrapSoapResponse(`
            <tptz:GetConfigurationsResponse>
                <tptz:PTZConfiguration token="PTZ1">
                    <tt:Name>PTZ Configuration</tt:Name>
                    <tt:UseCount>2</tt:UseCount>
                    <tt:NodeToken>PTZNode1</tt:NodeToken>
                    <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                    <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                    <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                </tptz:PTZConfiguration>
            </tptz:GetConfigurationsResponse>
        `);
    }

    private handleGetPTZConfiguration(): string {
        return this.wrapSoapResponse(`
            <tptz:GetConfigurationResponse>
                <tptz:PTZConfiguration token="PTZ1">
                    <tt:Name>PTZ Configuration</tt:Name>
                    <tt:UseCount>2</tt:UseCount>
                    <tt:NodeToken>PTZNode1</tt:NodeToken>
                    <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                    <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                    <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                </tptz:PTZConfiguration>
            </tptz:GetConfigurationResponse>
        `);
    }

    private handleGetPTZStatus(): string {
        return this.wrapSoapResponse(`
            <tptz:GetStatusResponse>
                <tptz:PTZStatus>
                    <tt:Position>
                        <tt:PanTilt x="0" y="0" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace"/>
                        <tt:Zoom x="0" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace"/>
                    </tt:Position>
                    <tt:MoveStatus>
                        <tt:PanTilt>IDLE</tt:PanTilt>
                        <tt:Zoom>IDLE</tt:Zoom>
                    </tt:MoveStatus>
                    <tt:UtcTime>${new Date().toISOString()}</tt:UtcTime>
                </tptz:PTZStatus>
            </tptz:GetStatusResponse>
        `);
    }

    private handleContinuousMove(body: string): string {
        const ptz = this.extractPTZVelocity(body);
        this.console.log(`[ONVIF Server] ContinuousMove: pan=${ptz.pan}, tilt=${ptz.tilt}, zoom=${ptz.zoom}`);
        this.emit('ptz', { type: 'continuous', ...ptz });
        return this.wrapSoapResponse(`<tptz:ContinuousMoveResponse/>`);
    }

    private handleRelativeMove(body: string): string {
        const ptz = this.extractPTZTranslation(body);
        this.console.log(`[ONVIF Server] RelativeMove: pan=${ptz.pan}, tilt=${ptz.tilt}, zoom=${ptz.zoom}`);
        this.emit('ptz', { type: 'relative', ...ptz });
        return this.wrapSoapResponse(`<tptz:RelativeMoveResponse/>`);
    }

    private handleAbsoluteMove(body: string): string {
        const ptz = this.extractPTZPosition(body);
        this.console.log(`[ONVIF Server] AbsoluteMove: pan=${ptz.pan}, tilt=${ptz.tilt}, zoom=${ptz.zoom}`);
        this.emit('ptz', { type: 'absolute', ...ptz });
        return this.wrapSoapResponse(`<tptz:AbsoluteMoveResponse/>`);
    }

    private handlePTZStop(): string {
        this.console.log('[ONVIF Server] PTZ Stop');
        this.emit('ptz', { type: 'stop' });
        return this.wrapSoapResponse(`<tptz:StopResponse/>`);
    }

    private handleGetPresets(): string {
        this.console.log('[ONVIF Server] GetPresets');
        // Return empty preset list - the camera doesn't support presets via DVRIP
        // but we need to return a valid response for Frigate
        return this.wrapSoapResponse(`
            <tptz:GetPresetsResponse>
            </tptz:GetPresetsResponse>
        `);
    }

    private handleGotoPreset(body: string): string {
        const presetMatch = body.match(/PresetToken[^>]*>([^<]*)</i);
        const presetToken = presetMatch ? presetMatch[1] : 'unknown';
        this.console.log(`[ONVIF Server] GotoPreset: ${presetToken}`);
        this.emit('ptz', { type: 'preset', preset: presetToken });
        return this.wrapSoapResponse(`<tptz:GotoPresetResponse/>`);
    }

    private handleSetPreset(body: string): string {
        const nameMatch = body.match(/PresetName[^>]*>([^<]*)</i);
        const presetName = nameMatch ? nameMatch[1] : 'Preset';
        this.console.log(`[ONVIF Server] SetPreset: ${presetName}`);
        // Return a fake token since we don't actually store presets
        return this.wrapSoapResponse(`
            <tptz:SetPresetResponse>
                <tptz:PresetToken>preset_1</tptz:PresetToken>
            </tptz:SetPresetResponse>
        `);
    }

    private handleRemovePreset(body: string): string {
        const presetMatch = body.match(/PresetToken[^>]*>([^<]*)</i);
        const presetToken = presetMatch ? presetMatch[1] : 'unknown';
        this.console.log(`[ONVIF Server] RemovePreset: ${presetToken}`);
        return this.wrapSoapResponse(`<tptz:RemovePresetResponse/>`);
    }

    private handleGotoHomePosition(): string {
        this.console.log('[ONVIF Server] GotoHomePosition');
        this.emit('ptz', { type: 'home' });
        return this.wrapSoapResponse(`<tptz:GotoHomePositionResponse/>`);
    }

    private handleSetHomePosition(): string {
        this.console.log('[ONVIF Server] SetHomePosition');
        return this.wrapSoapResponse(`<tptz:SetHomePositionResponse/>`);
    }

    // Helper methods for extracting PTZ values from SOAP requests
    private extractPTZVelocity(body: string): PTZCommand {
        const result: PTZCommand = {};

        // Match x/y independently so attribute order doesn't matter
        const panTiltTag = body.match(/<[^>]*PanTilt[^>]*>/i)?.[0];
        if (panTiltTag) {
            const x = panTiltTag.match(/x="([^"]*)"/i);
            const y = panTiltTag.match(/y="([^"]*)"/i);
            if (x) result.pan = parseFloat(x[1]) || 0;
            if (y) result.tilt = parseFloat(y[1]) || 0;
        }

        const zoomTag = body.match(/<[^>]*Zoom[^>]*>/i)?.[0];
        if (zoomTag) {
            const x = zoomTag.match(/x="([^"]*)"/i);
            if (x) result.zoom = parseFloat(x[1]) || 0;
        }

        return result;
    }

    private extractPTZTranslation(body: string): PTZCommand {
        return this.extractPTZVelocity(body); // Same format
    }

    private extractPTZPosition(body: string): PTZCommand {
        return this.extractPTZVelocity(body); // Same format
    }

    // WS-Discovery. Best-effort: discovery failing (e.g. port 3702 taken) must not
    // prevent the SOAP server from running, and must never leave start() hanging.
    private async startDiscovery(): Promise<void> {
        return new Promise((resolve) => {
            let settled = false;
            const settle = () => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            };

            const disableDiscovery = (reason: string) => {
                this.console.error(`[ONVIF Server] WS-Discovery disabled (${reason}). SOAP server is unaffected; add the camera by IP/port instead of discovery.`);
                try {
                    this.discoverySocket?.close();
                } catch (e) {
                    // Socket may never have bound
                }
                this.discoverySocket = null;
                settle();
            };

            this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            this.discoverySocket.on('error', (err) => {
                disableDiscovery(err.message);
            });

            this.discoverySocket.on('message', (msg, rinfo) => {
                const message = msg.toString();
                if (message.includes('Probe') && message.includes('NetworkVideoTransmitter')) {
                    this.console.log(`[ONVIF Server] Discovery probe from ${rinfo.address}:${rinfo.port}`);
                    const midMatch = message.match(/MessageID[^>]*>\s*([^<\s]+)\s*</i);
                    this.sendProbeMatch(rinfo.address, rinfo.port, midMatch?.[1]);
                }
            });

            this.discoverySocket.bind(3702, '0.0.0.0', () => {
                try {
                    this.discoverySocket!.addMembership('239.255.255.250');
                } catch (e: any) {
                    disableDiscovery(`multicast join failed: ${e.message}`);
                    return;
                }
                this.console.log('[ONVIF Server] WS-Discovery listening on 239.255.255.250:3702');
                settle();
            });
        });
    }

    private sendProbeMatch(address: string, port: number, relatesTo?: string): void {
        const messageId = `urn:uuid:${this.generateUUID()}`;
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        // Strict WS-Discovery clients ignore a ProbeMatch that doesn't relate
        // back to their Probe's MessageID
        const relatesToXml = relatesTo ? `
        <wsa:RelatesTo>${relatesTo}</wsa:RelatesTo>` : '';

        const response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
               xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery"
               xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
    <soap:Header>
        <wsa:MessageID>${messageId}</wsa:MessageID>${relatesToXml}
        <wsa:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:To>
        <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/ProbeMatches</wsa:Action>
    </soap:Header>
    <soap:Body>
        <wsd:ProbeMatches>
            <wsd:ProbeMatch>
                <wsa:EndpointReference>
                    <wsa:Address>urn:uuid:${this.config.serialNumber}</wsa:Address>
                </wsa:EndpointReference>
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
        this.discoverySocket?.send(buffer, 0, buffer.length, port, address, (err) => {
            if (err) {
                this.console.error('[ONVIF Server] Failed to send probe match:', err.message);
            } else {
                this.console.log(`[ONVIF Server] Sent probe match to ${address}:${port}`);
            }
        });
    }

    // Utility methods
    private wrapSoapResponse(content: string): string {
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

    private createSoapFault(code: string, message: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
    <soap:Body>
        <soap:Fault>
            <soap:Code>
                <soap:Value>soap:${code}</soap:Value>
            </soap:Code>
            <soap:Reason>
                <soap:Text xml:lang="en">${message}</soap:Text>
            </soap:Reason>
        </soap:Fault>
    </soap:Body>
</soap:Envelope>`;
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
