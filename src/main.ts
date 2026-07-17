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
const sdk_1 = __importStar(require("@scrypted/sdk"));
const dvrip_1 = require("./dvrip");
const onvif_server_1 = require("./onvif-server");
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const { deviceManager, mediaManager } = sdk_1.default;
class AmcrestASH21Camera extends sdk_1.ScryptedDeviceBase {
    constructor(nativeId) {
        super(nativeId);
        this.dvrip = null;
        this.dvripConnecting = null;
        this.onvifServer = null;
        this.onvifServerStarting = null;
        // PTZ Capabilities
        this.ptzCapabilities = {
            pan: true,
            tilt: true,
            zoom: true,
        };
        // Start ONVIF server if enabled
        this.initOnvifServer();
    }
    async initOnvifServer() {
        if (!this.isOnvifEnabled()) {
            return;
        }
        try {
            await this.startOnvifServer();
        }
        catch (e) {
            this.console.error('[ONVIF] Failed to start server:', e.message);
        }
    }
    getHost() {
        return this.storage.getItem('host') || '';
    }
    getUsername() {
        return this.storage.getItem('username') || 'admin';
    }
    getPassword() {
        return this.storage.getItem('password') || '';
    }
    getRtspPort() {
        return parseInt(this.storage.getItem('rtspPort') || '554');
    }
    getDvripPort() {
        return parseInt(this.storage.getItem('dvripPort') || '37777');
    }
    isOnvifEnabled() {
        return this.storage.getItem('onvifEnabled') === 'true';
    }
    getOnvifPort() {
        return parseInt(this.storage.getItem('onvifPort') || '8080');
    }
    getOnvifIp() {
        const stored = this.storage.getItem('onvifIp');
        if (stored)
            return stored;
        // Try to auto-detect the server's IP
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }
    getMacAddress() {
        // Stable, unique, locally-administered MAC derived from the camera host so
        // multiple cameras don't collide on ONVIF/HomeKit (was 00:00:00:00:00:00).
        const seed = this.getHost() || this.nativeId || 'ash21';
        const h = crypto.createHash('md5').update(seed).digest('hex');
        return `02:${h.substr(0, 2)}:${h.substr(2, 2)}:${h.substr(4, 2)}:${h.substr(6, 2)}:${h.substr(8, 2)}`;
    }
    async startOnvifServer() {
        if (this.onvifServer) {
            return;
        }
        if (this.onvifServerStarting) {
            await this.onvifServerStarting;
            return;
        }
        this.onvifServerStarting = (async () => {
            const host = this.getHost();
            if (!host) {
                throw new Error('Camera IP not configured');
            }
            const onvifIp = this.getOnvifIp();
            const onvifPort = this.getOnvifPort();
            this.onvifServer = new onvif_server_1.OnvifServer({
                httpPort: onvifPort,
                rtspUrl: this.getRtspUrl(0),
                deviceName: `Amcrest ASH21 (${host})`,
                manufacturer: 'Amcrest',
                model: 'ASH21',
                serialNumber: host.replace(/\./g, ''),
                hardwareId: 'ASH21-PTZ',
                macAddress: this.getMacAddress(),
                ipAddress: onvifIp,
                nativeCameraHost: host,
                nativeCameraUsername: this.getUsername(),
                nativeCameraPassword: this.getPassword(),
                console: this.console,
            });
            // Listen for PTZ commands from ONVIF and translate to DVRIP
            this.onvifServer.on('ptz', async (command) => {
                try {
                    await this.handleOnvifPtz(command);
                }
                catch (e) {
                    this.console.error('[ONVIF] PTZ command error:', e.message);
                }
            });
            await this.onvifServer.start();
            this.console.log(`[ONVIF] Server started at http://${onvifIp}:${onvifPort}/onvif/device_service`);
        })();
        try {
            await this.onvifServerStarting;
        }
        finally {
            this.onvifServerStarting = null;
        }
    }
    async stopOnvifServer() {
        if (this.onvifServer) {
            await this.onvifServer.stop();
            this.onvifServer = null;
        }
    }
    async handleOnvifPtz(command) {
        const dvrip = await this.ensureDvripConnected();
        const getSpeed = (value) => {
            if (value === undefined || value === 0)
                return 0;
            return Math.min(8, Math.max(1, Math.ceil(Math.abs(value) * 8)));
        };
        if (command.type === 'stop') {
            // Stop all movement
            await dvrip.ptzControl('Left', 0, 'stop').catch(() => { });
            await dvrip.ptzControl('Up', 0, 'stop').catch(() => { });
            await dvrip.ptzControl('ZoomIn', 0, 'stop').catch(() => { });
            return;
        }
        const pan = command.pan || 0;
        const tilt = command.tilt || 0;
        const zoom = command.zoom || 0;
        if (command.type === 'continuous') {
            // Continuous move - start movement in direction
            if (pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                await dvrip.ptzControl(direction, getSpeed(pan), 'start');
            }
            if (tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                await dvrip.ptzControl(direction, getSpeed(tilt), 'start');
            }
            if (zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                await dvrip.ptzControl(direction, getSpeed(zoom), 'start');
            }
        }
        else if (command.type === 'relative') {
            // Relative move - move briefly then stop
            const duration = 300; // ms
            if (pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                await dvrip.ptzControl(direction, getSpeed(pan), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => { }), duration);
            }
            if (tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                await dvrip.ptzControl(direction, getSpeed(tilt), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => { }), duration);
            }
            if (zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                await dvrip.ptzControl(direction, getSpeed(zoom), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => { }), duration);
            }
        }
    }
    getRtspUrl(subtype = 0) {
        const host = this.getHost();
        const username = encodeURIComponent(this.getUsername());
        const password = encodeURIComponent(this.getPassword()).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
        const port = this.getRtspPort();
        return `rtsp://${username}:${password}@${host}:${port}/cam/realmonitor?channel=1&subtype=${subtype}`;
    }
    async getSettings() {
        const onvifIp = this.getOnvifIp();
        const onvifPort = this.getOnvifPort();
        const onvifUrl = `http://${onvifIp}:${onvifPort}/onvif/device_service`;
        return [
            {
                key: 'host',
                title: 'Camera IP Address',
                value: this.getHost(),
                type: 'string',
                placeholder: '192.168.1.100',
            },
            {
                key: 'username',
                title: 'Username',
                value: this.getUsername(),
                type: 'string',
            },
            {
                key: 'password',
                title: 'Password',
                value: this.getPassword(),
                type: 'password',
            },
            {
                key: 'rtspPort',
                title: 'RTSP Port',
                value: this.getRtspPort().toString(),
                type: 'number',
                placeholder: '554',
            },
            {
                key: 'dvripPort',
                title: 'DVRIP Port (for PTZ)',
                value: this.getDvripPort().toString(),
                type: 'number',
                placeholder: '37777',
            },
            {
                key: 'onvifEnabled',
                title: 'Enable ONVIF Server',
                description: 'Expose this camera as an ONVIF device with PTZ support',
                value: this.isOnvifEnabled(),
                type: 'boolean',
            },
            {
                key: 'onvifPort',
                title: 'ONVIF Server Port',
                description: this.isOnvifEnabled() ? `ONVIF URL: ${onvifUrl}` : 'Enable ONVIF server to see URL',
                value: onvifPort.toString(),
                type: 'number',
                placeholder: '8080',
            },
            {
                key: 'onvifIp',
                title: 'ONVIF Server IP',
                description: 'IP address for ONVIF discovery (auto-detected if empty)',
                value: this.storage.getItem('onvifIp') || '',
                type: 'string',
                placeholder: onvifIp,
            },
        ];
    }
    async putSetting(key, value) {
        this.storage.setItem(key, value != null ? String(value) : '');
        // Disconnect DVRIP on connection settings change
        if (['host', 'username', 'password', 'dvripPort'].includes(key)) {
            if (this.dvrip) {
                this.dvrip.disconnect();
                this.dvrip = null;
            }
        }
        // Handle ONVIF server changes
        if (key === 'onvifEnabled') {
            if (value === true || value === 'true') {
                await this.startOnvifServer();
            }
            else {
                await this.stopOnvifServer();
            }
        }
        else if (['onvifPort', 'onvifIp', 'host'].includes(key) && this.isOnvifEnabled()) {
            // Restart ONVIF server with new settings
            await this.stopOnvifServer();
            await this.startOnvifServer();
        }
    }
    async ensureDvripConnected() {
        if (this.dvrip?.isConnected()) {
            return this.dvrip;
        }
        if (this.dvripConnecting) {
            await this.dvripConnecting;
            if (this.dvrip?.isConnected()) {
                return this.dvrip;
            }
        }
        this.dvripConnecting = (async () => {
            const host = this.getHost();
            if (!host) {
                throw new Error('Camera IP not configured');
            }
            this.dvrip = new dvrip_1.DahuaDVRIP({
                host,
                port: this.getDvripPort(),
                username: this.getUsername(),
                password: this.getPassword(),
                console: this.console,
            });
            try {
                await this.dvrip.connect();
                const success = await this.dvrip.login();
                return success;
            }
            catch (e) {
                this.dvrip.disconnect();
                this.dvrip = null;
                throw e;
            }
        })();
        const success = await this.dvripConnecting;
        this.dvripConnecting = null;
        if (!success) {
            throw new Error('DVRIP login failed');
        }
        return this.dvrip;
    }
    // VideoCamera interface
    async getVideoStream(options) {
        const subtype = options?.id === 'substream' ? 1 : 0;
        const rtspUrl = this.getRtspUrl(subtype);
        const ffmpegInput = {
            url: rtspUrl,
            inputArguments: [
                '-rtsp_transport', 'tcp',
                '-i', rtspUrl,
            ],
        };
        return mediaManager.createFFmpegMediaObject(ffmpegInput);
    }
    async getVideoStreamOptions() {
        return [
            {
                id: 'mainstream',
                name: 'Main Stream',
                video: {
                    codec: 'h264',
                },
                audio: {
                    codec: 'aac',
                },
            },
            {
                id: 'substream',
                name: 'Sub Stream',
                video: {
                    codec: 'h264',
                },
                audio: {
                    codec: 'aac',
                },
            },
        ];
    }
    // Camera interface
    async takePicture(options) {
        // Use FFmpeg to grab a frame from RTSP
        const rtspUrl = this.getRtspUrl(1); // Use substream for faster snapshot
        const ffmpegInput = {
            url: rtspUrl,
            inputArguments: [
                '-rtsp_transport', 'tcp',
                '-i', rtspUrl,
                '-frames:v', '1',
                '-f', 'image2',
            ],
        };
        return mediaManager.createFFmpegMediaObject(ffmpegInput);
    }
    async getPictureOptions() {
        return [];
    }
    // Cleanup when device is released
    async release() {
        await this.stopOnvifServer();
        if (this.dvrip) {
            this.dvrip.disconnect();
            this.dvrip = null;
        }
    }
    // PanTiltZoom interface
    async ptzCommand(command) {
        const dvrip = await this.ensureDvripConnected();
        // Map normalized values (-1 to 1) to DVRIP commands
        // Speed is derived from magnitude
        const getSpeed = (value) => {
            if (value === undefined)
                return 0;
            return Math.min(8, Math.max(1, Math.ceil(Math.abs(value) * 8)));
        };
        const pan = command.pan;
        const tilt = command.tilt;
        const zoom = command.zoom;
        try {
            // Handle pan
            if (pan !== undefined && pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                const speed = getSpeed(pan);
                await dvrip.ptzControl(direction, speed, 'start');
                // Stop after brief movement for relative control
                setTimeout(async () => {
                    try {
                        await dvrip.ptzControl(direction, 0, 'stop');
                    }
                    catch (e) {
                        // Ignore stop errors
                    }
                }, 200);
            }
            // Handle tilt
            if (tilt !== undefined && tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                const speed = getSpeed(tilt);
                await dvrip.ptzControl(direction, speed, 'start');
                setTimeout(async () => {
                    try {
                        await dvrip.ptzControl(direction, 0, 'stop');
                    }
                    catch (e) {
                        // Ignore stop errors
                    }
                }, 200);
            }
            // Handle zoom
            if (zoom !== undefined && zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                const speed = getSpeed(zoom);
                await dvrip.ptzControl(direction, speed, 'start');
                setTimeout(async () => {
                    try {
                        await dvrip.ptzControl(direction, 0, 'stop');
                    }
                    catch (e) {
                        // Ignore stop errors
                    }
                }, 200);
            }
        }
        catch (e) {
            this.console.error('PTZ command error:', e.message);
            throw e;
        }
    }
}
class AmcrestASH21Provider extends sdk_1.ScryptedDeviceBase {
    constructor(nativeId) {
        super(nativeId);
        this.cameras = new Map();
    }
    async getSettings() {
        return [
            {
                key: 'addCamera',
                title: 'Add Camera',
                description: 'Enter the camera IP address to add a new Amcrest ASH21 camera',
                type: 'string',
                placeholder: '192.168.1.100',
            },
        ];
    }
    async putSetting(key, value) {
        if (key === 'addCamera' && value) {
            const ip = String(value);
            await this.addCamera(ip);
        }
    }
    async addCamera(ip) {
        const nativeId = `amcrest-ash21-${ip.replace(/\./g, '-')}`;
        await deviceManager.onDeviceDiscovered({
            nativeId,
            name: `Amcrest ASH21 (${ip})`,
            type: sdk_1.ScryptedDeviceType.Camera,
            interfaces: [
                sdk_1.ScryptedInterface.Camera,
                sdk_1.ScryptedInterface.VideoCamera,
                sdk_1.ScryptedInterface.PanTiltZoom,
                sdk_1.ScryptedInterface.Settings,
            ],
        });
        // Set default host after device is created
        const device = await this.getDevice(nativeId);
        if (device && device.storage) {
            device.storage.setItem('host', ip);
        }
    }
    async getDevice(nativeId) {
        let camera = this.cameras.get(nativeId);
        if (!camera) {
            camera = new AmcrestASH21Camera(nativeId);
            this.cameras.set(nativeId, camera);
        }
        return camera;
    }
    async releaseDevice(id, nativeId) {
        const camera = this.cameras.get(nativeId);
        if (camera) {
            await camera.release();
            this.cameras.delete(nativeId);
        }
    }
}
exports.default = new AmcrestASH21Provider();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBa0J1QjtBQUN2QixtQ0FBcUM7QUFDckMsaURBQTZDO0FBQzdDLHVDQUF5QjtBQUV6QixNQUFNLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxHQUFHLGFBQUcsQ0FBQztBQUU1QyxNQUFNLGtCQUFtQixTQUFRLHdCQUFrQjtJQU0vQyxZQUFZLFFBQWdCO1FBQ3hCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQU5aLFVBQUssR0FBc0IsSUFBSSxDQUFDO1FBQ2hDLG9CQUFlLEdBQTRCLElBQUksQ0FBQztRQUNoRCxnQkFBVyxHQUF1QixJQUFJLENBQUM7UUFDdkMsd0JBQW1CLEdBQXlCLElBQUksQ0FBQztRQW9CekQsbUJBQW1CO1FBQ25CLG9CQUFlLEdBQTRCO1lBQ3ZDLEdBQUcsRUFBRSxJQUFJO1lBQ1QsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNiLENBQUM7UUFyQkUsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWU7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLE9BQU87UUFDWCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0QsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyRSxDQUFDO0lBQ0wsQ0FBQztJQVNPLE9BQU87UUFDWCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFD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LENBQUMsTUFBTSxDQUFDO2dCQUM3QyxNQUFNLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDMUQsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkYsQ0FBQztZQUNELElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUMzQyxNQUFNLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDM0QsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkYsQ0FBQztZQUNELElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUNsRCxNQUFNLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDM0QsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FB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b3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc2RrLCB7XG4gICAgQ2FtZXJhLFxuICAgIERldmljZVByb3ZpZGVyLFxuICAgIEZGbXBlZ0lucHV0LFxuICAgIE1lZGlhT2JqZWN0LFxuICAgIE1lZGlhU3RyZWFtT3B0aW9ucyxcbiAgICBQYW5UaWx0Wm9vbSxcbiAgICBQYW5UaWx0Wm9vbUNhcGFiaWxpdGllcyxcbiAgICBQYW5UaWx0Wm9vbUNvbW1hbmQsXG4gICAgUmVzcG9uc2VNZWRpYVN0cmVhbU9wdGlvbnMsXG4gICAgUmVzcG9uc2VQaWN0dXJlT3B0aW9ucyxcbiAgICBTY3J5cHRlZERldmljZUJhc2UsXG4gICAgU2NyeXB0ZWREZXZpY2VUeXBlLFxuICAgIFNjcnlwdGVkSW50ZXJmYWNlLFxuICAgIFNldHRpbmcsXG4gICAgU2V0dGluZ3MsXG4gICAgU2V0dGluZ1ZhbHVlLFxuICAgIFZpZGVvQ2FtZXJhLFxufSBmcm9tICdAc2NyeXB0ZWQvc2RrJztcbmltcG9ydCB7IERhaHVhRFZSSVAgfSBmcm9tICcuL2R2cmlwJztcbmltcG9ydCB7IE9udmlmU2VydmVyIH0gZnJvbSAnLi9vbnZpZi1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuXG5jb25zdCB7IGRldmljZU1hbmFnZXIsIG1lZGlhTWFuYWdlciB9ID0gc2RrO1xuXG5jbGFzcyBBbWNyZXN0QVNIMjFDYW1lcmEgZXh0ZW5kcyBTY3J5cHRlZERldmljZUJhc2UgaW1wbGVtZW50cyBDYW1lcmEsIFZpZGVvQ2FtZXJhLCBQYW5UaWx0Wm9vbSwgU2V0dGluZ3Mge1xuICAgIHByaXZhdGUgZHZyaXA6IERhaHVhRFZSSVAgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIGR2cmlwQ29ubmVjdGluZzogUHJvbWlzZTxib29sZWFuPiB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgb252aWZTZXJ2ZXI6IE9udmlmU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBvbnZpZlNlcnZlclN0YXJ0aW5nOiBQcm9taXNlPHZvaWQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihuYXRpdmVJZDogc3RyaW5nKSB7XG4gICAgICAgIHN1cGVyKG5hdGl2ZUlkKTtcbiAgICAgICAgLy8gU3RhcnQgT05WSUYgc2VydmVyIGlmIGVuYWJsZWRcbiAgICAgICAgdGhpcy5pbml0T252aWZTZXJ2ZXIoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGluaXRPbnZpZlNlcnZlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT252aWZFbmFibGVkKCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN0YXJ0T252aWZTZXJ2ZXIoKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoJ1tPTlZJRl0gRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjonLCBlLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUFRaIENhcGFiaWxpdGllc1xuICAgIHB0ekNhcGFiaWxpdGllczogUGFuVGlsdFpvb21DYXBhYmlsaXRpZXMgPSB7XG4gICAgICAgIHBhbjogdHJ1ZSxcbiAgICAgICAgdGlsdDogdHJ1ZSxcbiAgICAgICAgem9vbTogdHJ1ZSxcbiAgICB9O1xuXG4gICAgcHJpdmF0ZSBnZXRIb3N0KCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0b3JhZ2UuZ2V0SXRlbSgnaG9zdCcpIHx8ICcnO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0VXNlcm5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmFnZS5nZXRJdGVtKCd1c2VybmFtZScpIHx8ICdhZG1pbic7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRQYXNzd29yZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9yYWdlLmdldEl0ZW0oJ3Bhc3N3b3JkJykgfHwgJyc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRSdHNwUG9ydCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQodGhpcy5zdG9yYWdlLmdldEl0ZW0oJ3J0c3BQb3J0JykgfHwgJzU1NCcpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0RHZyaXBQb3J0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBwYXJzZUludCh0aGlzLnN0b3JhZ2UuZ2V0SXRlbSgnZHZyaXBQb3J0JykgfHwgJzM3Nzc3Jyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc09udmlmRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmFnZS5nZXRJdGVtKCdvbnZpZkVuYWJsZWQnKSA9PT0gJ3RydWUnO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0T252aWZQb3J0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBwYXJzZUludCh0aGlzLnN0b3JhZ2UuZ2V0SXRlbSgnb252aWZQb3J0JykgfHwgJzgwODAnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldE9udmlmSXAoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgc3RvcmVkID0gdGhpcy5zdG9yYWdlLmdldEl0ZW0oJ29udmlmSXAnKTtcbiAgICAgICAgaWYgKHN0b3JlZCkgcmV0dXJuIHN0b3JlZDtcblxuICAgICAgICAvLyBUcnkgdG8gYXV0by1kZXRlY3QgdGhlIHNlcnZlcidzIElQXG4gICAgICAgIGNvbnN0IGludGVyZmFjZXMgPSBvcy5uZXR3b3JrSW50ZXJmYWNlcygpO1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoaW50ZXJmYWNlcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWZhY2Ugb2YgaW50ZXJmYWNlc1tuYW1lXSB8fCBbXSkge1xuICAgICAgICAgICAgICAgIGlmIChpZmFjZS5mYW1pbHkgPT09ICdJUHY0JyAmJiAhaWZhY2UuaW50ZXJuYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlmYWNlLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnMTI3LjAuMC4xJztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHN0YXJ0T252aWZTZXJ2ZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLm9udmlmU2VydmVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5vbnZpZlNlcnZlclN0YXJ0aW5nKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLm9udmlmU2VydmVyU3RhcnRpbmc7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9udmlmU2VydmVyU3RhcnRpbmcgPSAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaG9zdCA9IHRoaXMuZ2V0SG9zdCgpO1xuICAgICAgICAgICAgaWYgKCFob3N0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW1lcmEgSVAgbm90IGNvbmZpZ3VyZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb252aWZJcCA9IHRoaXMuZ2V0T252aWZJcCgpO1xuICAgICAgICAgICAgY29uc3Qgb252aWZQb3J0ID0gdGhpcy5nZXRPbnZpZlBvcnQoKTtcblxuICAgICAgICAgICAgdGhpcy5vbnZpZlNlcnZlciA9IG5ldyBPbnZpZlNlcnZlcih7XG4gICAgICAgICAgICAgICAgaHR0cFBvcnQ6IG9udmlmUG9ydCxcbiAgICAgICAgICAgICAgICBydHNwVXJsOiB0aGlzLmdldFJ0c3BVcmwoMCksXG4gICAgICAgICAgICAgICAgZGV2aWNlTmFtZTogYEFtY3Jlc3QgQVNIMjEgKCR7aG9zdH0pYCxcbiAgICAgICAgICAgICAgICBtYW51ZmFjdHVyZXI6ICdBbWNyZXN0JyxcbiAgICAgICAgICAgICAgICBtb2RlbDogJ0FTSDIxJyxcbiAgICAgICAgICAgICAgICBzZXJpYWxOdW1iZXI6IGhvc3QucmVwbGFjZSgvXFwuL2csICcnKSxcbiAgICAgICAgICAgICAgICBoYXJkd2FyZUlkOiAnQVNIMjEtUFRaJyxcbiAgICAgICAgICAgICAgICBtYWNBZGRyZXNzOiAnMDA6MDA6MDA6MDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgIGlwQWRkcmVzczogb252aWZJcCxcbiAgICAgICAgICAgICAgICBuYXRpdmVDYW1lcmFIb3N0OiBob3N0LFxuICAgICAgICAgICAgICAgIG5hdGl2ZUNhbWVyYVVzZXJuYW1lOiB0aGlzLmdldFVzZXJuYW1lKCksXG4gICAgICAgICAgICAgICAgbmF0aXZlQ2FtZXJhUGFzc3dvcmQ6IHRoaXMuZ2V0UGFzc3dvcmQoKSxcbiAgICAgICAgICAgICAgICBjb25zb2xlOiB0aGlzLmNvbnNvbGUsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBQVFogY29tbWFuZHMgZnJvbSBPTlZJRiBhbmQgdHJhbnNsYXRlIHRvIERWUklQXG4gICAgICAgICAgICB0aGlzLm9udmlmU2VydmVyLm9uKCdwdHonLCBhc3luYyAoY29tbWFuZDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVPbnZpZlB0eihjb21tYW5kKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25zb2xlLmVycm9yKCdbT05WSUZdIFBUWiBjb21tYW5kIGVycm9yOicsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMub252aWZTZXJ2ZXIuc3RhcnQoKTtcbiAgICAgICAgICAgIHRoaXMuY29uc29sZS5sb2coYFtPTlZJRl0gU2VydmVyIHN0YXJ0ZWQgYXQgaHR0cDovLyR7b252aWZJcH06JHtvbnZpZlBvcnR9L29udmlmL2RldmljZV9zZXJ2aWNlYCk7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub252aWZTZXJ2ZXJTdGFydGluZztcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMub252aWZTZXJ2ZXJTdGFydGluZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHN0b3BPbnZpZlNlcnZlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMub252aWZTZXJ2ZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub252aWZTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5vbnZpZlNlcnZlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU9udmlmUHR6KGNvbW1hbmQ6IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBkdnJpcCA9IGF3YWl0IHRoaXMuZW5zdXJlRHZyaXBDb25uZWN0ZWQoKTtcblxuICAgICAgICBjb25zdCBnZXRTcGVlZCA9ICh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAwKSByZXR1cm4gMDtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBNYXRoLmNlaWwoTWF0aC5hYnModmFsdWUpICogOCkpKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoY29tbWFuZC50eXBlID09PSAnc3RvcCcpIHtcbiAgICAgICAgICAgIC8vIFN0b3AgYWxsIG1vdmVtZW50XG4gICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKCdMZWZ0JywgMCwgJ3N0b3AnKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKCdVcCcsIDAsICdzdG9wJykuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbCgnWm9vbUluJywgMCwgJ3N0b3AnKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYW4gPSBjb21tYW5kLnBhbiB8fCAwO1xuICAgICAgICBjb25zdCB0aWx0ID0gY29tbWFuZC50aWx0IHx8IDA7XG4gICAgICAgIGNvbnN0IHpvb20gPSBjb21tYW5kLnpvb20gfHwgMDtcblxuICAgICAgICBpZiAoY29tbWFuZC50eXBlID09PSAnY29udGludW91cycpIHtcbiAgICAgICAgICAgIC8vIENvbnRpbnVvdXMgbW92ZSAtIHN0YXJ0IG1vdmVtZW50IGluIGRpcmVjdGlvblxuICAgICAgICAgICAgaWYgKHBhbiAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHBhbiA+IDAgPyAnUmlnaHQnIDogJ0xlZnQnO1xuICAgICAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCBnZXRTcGVlZChwYW4pLCAnc3RhcnQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aWx0ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gdGlsdCA+IDAgPyAnVXAnIDogJ0Rvd24nO1xuICAgICAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCBnZXRTcGVlZCh0aWx0KSwgJ3N0YXJ0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoem9vbSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHpvb20gPiAwID8gJ1pvb21JbicgOiAnWm9vbU91dCc7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIGdldFNwZWVkKHpvb20pLCAnc3RhcnQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjb21tYW5kLnR5cGUgPT09ICdyZWxhdGl2ZScpIHtcbiAgICAgICAgICAgIC8vIFJlbGF0aXZlIG1vdmUgLSBtb3ZlIGJyaWVmbHkgdGhlbiBzdG9wXG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IDMwMDsgLy8gbXNcblxuICAgICAgICAgICAgaWYgKHBhbiAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHBhbiA+IDAgPyAnUmlnaHQnIDogJ0xlZnQnO1xuICAgICAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCBnZXRTcGVlZChwYW4pLCAnc3RhcnQnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCAwLCAnc3RvcCcpLmNhdGNoKCgpID0+IHt9KSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRpbHQgIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aWx0ID4gMCA/ICdVcCcgOiAnRG93bic7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIGdldFNwZWVkKHRpbHQpLCAnc3RhcnQnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCAwLCAnc3RvcCcpLmNhdGNoKCgpID0+IHt9KSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHpvb20gIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB6b29tID4gMCA/ICdab29tSW4nIDogJ1pvb21PdXQnO1xuICAgICAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCBnZXRTcGVlZCh6b29tKSwgJ3N0YXJ0Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBkdnJpcC5wdHpDb250cm9sKGRpcmVjdGlvbiwgMCwgJ3N0b3AnKS5jYXRjaCgoKSA9PiB7fSksIGR1cmF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0UnRzcFVybChzdWJ0eXBlOiBudW1iZXIgPSAwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaG9zdCA9IHRoaXMuZ2V0SG9zdCgpO1xuICAgICAgICBjb25zdCB1c2VybmFtZSA9IGVuY29kZVVSSUNvbXBvbmVudCh0aGlzLmdldFVzZXJuYW1lKCkpO1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9IGVuY29kZVVSSUNvbXBvbmVudCh0aGlzLmdldFBhc3N3b3JkKCkpLnJlcGxhY2UoL1shJygpKl0vZywgYyA9PiAnJScgKyBjLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkpO1xuICAgICAgICBjb25zdCBwb3J0ID0gdGhpcy5nZXRSdHNwUG9ydCgpO1xuICAgICAgICByZXR1cm4gYHJ0c3A6Ly8ke3VzZXJuYW1lfToke3Bhc3N3b3JkfUAke2hvc3R9OiR7cG9ydH0vY2FtL3JlYWxtb25pdG9yP2NoYW5uZWw9MSZzdWJ0eXBlPSR7c3VidHlwZX1gO1xuICAgIH1cblxuICAgIGFzeW5jIGdldFNldHRpbmdzKCk6IFByb21pc2U8U2V0dGluZ1tdPiB7XG4gICAgICAgIGNvbnN0IG9udmlmSXAgPSB0aGlzLmdldE9udmlmSXAoKTtcbiAgICAgICAgY29uc3Qgb252aWZQb3J0ID0gdGhpcy5nZXRPbnZpZlBvcnQoKTtcbiAgICAgICAgY29uc3Qgb252aWZVcmwgPSBgaHR0cDovLyR7b252aWZJcH06JHtvbnZpZlBvcnR9L29udmlmL2RldmljZV9zZXJ2aWNlYDtcblxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnQ2FtZXJhIElQIEFkZHJlc3MnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmdldEhvc3QoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJzE5Mi4xNjguMS4xMDAnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXk6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuZ2V0VXNlcm5hbWUoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5OiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnUGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmdldFBhc3N3b3JkKCksXG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5OiAncnRzcFBvcnQnLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnUlRTUCBQb3J0JyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5nZXRSdHNwUG9ydCgpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICc1NTQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXk6ICdkdnJpcFBvcnQnLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnRFZSSVAgUG9ydCAoZm9yIFBUWiknLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmdldER2cmlwUG9ydCgpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICczNzc3NycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogJ29udmlmRW5hYmxlZCcsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdFbmFibGUgT05WSUYgU2VydmVyJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4cG9zZSB0aGlzIGNhbWVyYSBhcyBhbiBPTlZJRiBkZXZpY2Ugd2l0aCBQVFogc3VwcG9ydCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaXNPbnZpZkVuYWJsZWQoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogJ29udmlmUG9ydCcsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdPTlZJRiBTZXJ2ZXIgUG9ydCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRoaXMuaXNPbnZpZkVuYWJsZWQoKSA/IGBPTlZJRiBVUkw6ICR7b252aWZVcmx9YCA6ICdFbmFibGUgT05WSUYgc2VydmVyIHRvIHNlZSBVUkwnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBvbnZpZlBvcnQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJzgwODAnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXk6ICdvbnZpZklwJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ09OVklGIFNlcnZlciBJUCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJUCBhZGRyZXNzIGZvciBPTlZJRiBkaXNjb3ZlcnkgKGF1dG8tZGV0ZWN0ZWQgaWYgZW1wdHkpJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5zdG9yYWdlLmdldEl0ZW0oJ29udmlmSXAnKSB8fCAnJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogb252aWZJcCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgcHV0U2V0dGluZyhrZXk6IHN0cmluZywgdmFsdWU6IFNldHRpbmdWYWx1ZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnN0b3JhZ2Uuc2V0SXRlbShrZXksIHZhbHVlICE9IG51bGwgPyBTdHJpbmcodmFsdWUpIDogJycpO1xuXG4gICAgICAgIC8vIERpc2Nvbm5lY3QgRFZSSVAgb24gY29ubmVjdGlvbiBzZXR0aW5ncyBjaGFuZ2VcbiAgICAgICAgaWYgKFsnaG9zdCcsICd1c2VybmFtZScsICdwYXNzd29yZCcsICdkdnJpcFBvcnQnXS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kdnJpcCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHZyaXAuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZHZyaXAgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIE9OVklGIHNlcnZlciBjaGFuZ2VzXG4gICAgICAgIGlmIChrZXkgPT09ICdvbnZpZkVuYWJsZWQnKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RhcnRPbnZpZlNlcnZlcigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN0b3BPbnZpZlNlcnZlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKFsnb252aWZQb3J0JywgJ29udmlmSXAnLCAnaG9zdCddLmluY2x1ZGVzKGtleSkgJiYgdGhpcy5pc09udmlmRW5hYmxlZCgpKSB7XG4gICAgICAgICAgICAvLyBSZXN0YXJ0IE9OVklGIHNlcnZlciB3aXRoIG5ldyBzZXR0aW5nc1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdG9wT252aWZTZXJ2ZXIoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RhcnRPbnZpZlNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBlbnN1cmVEdnJpcENvbm5lY3RlZCgpOiBQcm9taXNlPERhaHVhRFZSSVA+IHtcbiAgICAgICAgaWYgKHRoaXMuZHZyaXA/LmlzQ29ubmVjdGVkKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmR2cmlwO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZHZyaXBDb25uZWN0aW5nKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmR2cmlwQ29ubmVjdGluZztcbiAgICAgICAgICAgIGlmICh0aGlzLmR2cmlwPy5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZHZyaXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmR2cmlwQ29ubmVjdGluZyA9IChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBob3N0ID0gdGhpcy5nZXRIb3N0KCk7XG4gICAgICAgICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbWVyYSBJUCBub3QgY29uZmlndXJlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmR2cmlwID0gbmV3IERhaHVhRFZSSVAoe1xuICAgICAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICAgICAgcG9ydDogdGhpcy5nZXREdnJpcFBvcnQoKSxcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogdGhpcy5nZXRVc2VybmFtZSgpLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiB0aGlzLmdldFBhc3N3b3JkKCksXG4gICAgICAgICAgICAgICAgY29uc29sZTogdGhpcy5jb25zb2xlLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kdnJpcC5jb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IHRoaXMuZHZyaXAubG9naW4oKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2VzcztcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmR2cmlwLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmR2cmlwID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBhd2FpdCB0aGlzLmR2cmlwQ29ubmVjdGluZztcbiAgICAgICAgdGhpcy5kdnJpcENvbm5lY3RpbmcgPSBudWxsO1xuXG4gICAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEVlJJUCBsb2dpbiBmYWlsZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmR2cmlwITtcbiAgICB9XG5cbiAgICAvLyBWaWRlb0NhbWVyYSBpbnRlcmZhY2VcbiAgICBhc3luYyBnZXRWaWRlb1N0cmVhbShvcHRpb25zPzogTWVkaWFTdHJlYW1PcHRpb25zKTogUHJvbWlzZTxNZWRpYU9iamVjdD4ge1xuICAgICAgICBjb25zdCBzdWJ0eXBlID0gb3B0aW9ucz8uaWQgPT09ICdzdWJzdHJlYW0nID8gMSA6IDA7XG4gICAgICAgIGNvbnN0IHJ0c3BVcmwgPSB0aGlzLmdldFJ0c3BVcmwoc3VidHlwZSk7XG5cbiAgICAgICAgY29uc3QgZmZtcGVnSW5wdXQ6IEZGbXBlZ0lucHV0ID0ge1xuICAgICAgICAgICAgdXJsOiBydHNwVXJsLFxuICAgICAgICAgICAgaW5wdXRBcmd1bWVudHM6IFtcbiAgICAgICAgICAgICAgICAnLXJ0c3BfdHJhbnNwb3J0JywgJ3RjcCcsXG4gICAgICAgICAgICAgICAgJy1pJywgcnRzcFVybCxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhTWFuYWdlci5jcmVhdGVGRm1wZWdNZWRpYU9iamVjdChmZm1wZWdJbnB1dCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0VmlkZW9TdHJlYW1PcHRpb25zKCk6IFByb21pc2U8UmVzcG9uc2VNZWRpYVN0cmVhbU9wdGlvbnNbXT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiAnbWFpbnN0cmVhbScsXG4gICAgICAgICAgICAgICAgbmFtZTogJ01haW4gU3RyZWFtJyxcbiAgICAgICAgICAgICAgICB2aWRlbzoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlYzogJ2gyNjQnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXVkaW86IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZWM6ICdhYWMnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiAnc3Vic3RyZWFtJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnU3ViIFN0cmVhbScsXG4gICAgICAgICAgICAgICAgdmlkZW86IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZWM6ICdoMjY0JyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGF1ZGlvOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVjOiAnYWFjJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBDYW1lcmEgaW50ZXJmYWNlXG4gICAgYXN5bmMgdGFrZVBpY3R1cmUob3B0aW9ucz86IGFueSk6IFByb21pc2U8TWVkaWFPYmplY3Q+IHtcbiAgICAgICAgLy8gVXNlIEZGbXBlZyB0byBncmFiIGEgZnJhbWUgZnJvbSBSVFNQXG4gICAgICAgIGNvbnN0IHJ0c3BVcmwgPSB0aGlzLmdldFJ0c3BVcmwoMSk7ICAvLyBVc2Ugc3Vic3RyZWFtIGZvciBmYXN0ZXIgc25hcHNob3RcblxuICAgICAgICBjb25zdCBmZm1wZWdJbnB1dDogRkZtcGVnSW5wdXQgPSB7XG4gICAgICAgICAgICB1cmw6IHJ0c3BVcmwsXG4gICAgICAgICAgICBpbnB1dEFyZ3VtZW50czogW1xuICAgICAgICAgICAgICAgICctcnRzcF90cmFuc3BvcnQnLCAndGNwJyxcbiAgICAgICAgICAgICAgICAnLWknLCBydHNwVXJsLFxuICAgICAgICAgICAgICAgICctZnJhbWVzOnYnLCAnMScsXG4gICAgICAgICAgICAgICAgJy1mJywgJ2ltYWdlMicsXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtZWRpYU1hbmFnZXIuY3JlYXRlRkZtcGVnTWVkaWFPYmplY3QoZmZtcGVnSW5wdXQpO1xuICAgIH1cblxuICAgIGFzeW5jIGdldFBpY3R1cmVPcHRpb25zKCk6IFByb21pc2U8UmVzcG9uc2VQaWN0dXJlT3B0aW9uc1tdPiB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBDbGVhbnVwIHdoZW4gZGV2aWNlIGlzIHJlbGVhc2VkXG4gICAgYXN5bmMgcmVsZWFzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdG9wT252aWZTZXJ2ZXIoKTtcbiAgICAgICAgaWYgKHRoaXMuZHZyaXApIHtcbiAgICAgICAgICAgIHRoaXMuZHZyaXAuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5kdnJpcCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQYW5UaWx0Wm9vbSBpbnRlcmZhY2VcbiAgICBhc3luYyBwdHpDb21tYW5kKGNvbW1hbmQ6IFBhblRpbHRab29tQ29tbWFuZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBkdnJpcCA9IGF3YWl0IHRoaXMuZW5zdXJlRHZyaXBDb25uZWN0ZWQoKTtcblxuICAgICAgICAvLyBNYXAgbm9ybWFsaXplZCB2YWx1ZXMgKC0xIHRvIDEpIHRvIERWUklQIGNvbW1hbmRzXG4gICAgICAgIC8vIFNwZWVkIGlzIGRlcml2ZWQgZnJvbSBtYWduaXR1ZGVcbiAgICAgICAgY29uc3QgZ2V0U3BlZWQgPSAodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCk6IG51bWJlciA9PiB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIDA7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgTWF0aC5jZWlsKE1hdGguYWJzKHZhbHVlKSAqIDgpKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcGFuID0gY29tbWFuZC5wYW47XG4gICAgICAgIGNvbnN0IHRpbHQgPSBjb21tYW5kLnRpbHQ7XG4gICAgICAgIGNvbnN0IHpvb20gPSBjb21tYW5kLnpvb207XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBwYW5cbiAgICAgICAgICAgIGlmIChwYW4gIT09IHVuZGVmaW5lZCAmJiBwYW4gIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSBwYW4gPiAwID8gJ1JpZ2h0JyA6ICdMZWZ0JztcbiAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IGdldFNwZWVkKHBhbik7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIHNwZWVkLCAnc3RhcnQnKTtcbiAgICAgICAgICAgICAgICAvLyBTdG9wIGFmdGVyIGJyaWVmIG1vdmVtZW50IGZvciByZWxhdGl2ZSBjb250cm9sXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKGRpcmVjdGlvbiwgMCwgJ3N0b3AnKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWdub3JlIHN0b3AgZXJyb3JzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIYW5kbGUgdGlsdFxuICAgICAgICAgICAgaWYgKHRpbHQgIT09IHVuZGVmaW5lZCAmJiB0aWx0ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gdGlsdCA+IDAgPyAnVXAnIDogJ0Rvd24nO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gZ2V0U3BlZWQodGlsdCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIHNwZWVkLCAnc3RhcnQnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCAwLCAnc3RvcCcpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZ25vcmUgc3RvcCBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSB6b29tXG4gICAgICAgICAgICBpZiAoem9vbSAhPT0gdW5kZWZpbmVkICYmIHpvb20gIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB6b29tID4gMCA/ICdab29tSW4nIDogJ1pvb21PdXQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gZ2V0U3BlZWQoem9vbSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIHNwZWVkLCAnc3RhcnQnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCAwLCAnc3RvcCcpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZ25vcmUgc3RvcCBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgdGhpcy5jb25zb2xlLmVycm9yKCdQVFogY29tbWFuZCBlcnJvcjonLCBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgQW1jcmVzdEFTSDIxUHJvdmlkZXIgZXh0ZW5kcyBTY3J5cHRlZERldmljZUJhc2UgaW1wbGVtZW50cyBEZXZpY2VQcm92aWRlciwgU2V0dGluZ3Mge1xuICAgIHByaXZhdGUgY2FtZXJhczogTWFwPHN0cmluZywgQW1jcmVzdEFTSDIxQ2FtZXJhPiA9IG5ldyBNYXAoKTtcblxuICAgIGNvbnN0cnVjdG9yKG5hdGl2ZUlkPzogc3RyaW5nKSB7XG4gICAgICAgIHN1cGVyKG5hdGl2ZUlkKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZXRTZXR0aW5ncygpOiBQcm9taXNlPFNldHRpbmdbXT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogJ2FkZENhbWVyYScsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdBZGQgQ2FtZXJhJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0VudGVyIHRoZSBjYW1lcmEgSVAgYWRkcmVzcyB0byBhZGQgYSBuZXcgQW1jcmVzdCBBU0gyMSBjYW1lcmEnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnMTkyLjE2OC4xLjEwMCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIHB1dFNldHRpbmcoa2V5OiBzdHJpbmcsIHZhbHVlOiBTZXR0aW5nVmFsdWUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2FkZENhbWVyYScgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGlwID0gU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYWRkQ2FtZXJhKGlwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYWRkQ2FtZXJhKGlwOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgbmF0aXZlSWQgPSBgYW1jcmVzdC1hc2gyMS0ke2lwLnJlcGxhY2UoL1xcLi9nLCAnLScpfWA7XG5cbiAgICAgICAgYXdhaXQgZGV2aWNlTWFuYWdlci5vbkRldmljZURpc2NvdmVyZWQoe1xuICAgICAgICAgICAgbmF0aXZlSWQsXG4gICAgICAgICAgICBuYW1lOiBgQW1jcmVzdCBBU0gyMSAoJHtpcH0pYCxcbiAgICAgICAgICAgIHR5cGU6IFNjcnlwdGVkRGV2aWNlVHlwZS5DYW1lcmEsXG4gICAgICAgICAgICBpbnRlcmZhY2VzOiBbXG4gICAgICAgICAgICAgICAgU2NyeXB0ZWRJbnRlcmZhY2UuQ2FtZXJhLFxuICAgICAgICAgICAgICAgIFNjcnlwdGVkSW50ZXJmYWNlLlZpZGVvQ2FtZXJhLFxuICAgICAgICAgICAgICAgIFNjcnlwdGVkSW50ZXJmYWNlLlBhblRpbHRab29tLFxuICAgICAgICAgICAgICAgIFNjcnlwdGVkSW50ZXJmYWNlLlNldHRpbmdzLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgaG9zdCBhZnRlciBkZXZpY2UgaXMgY3JlYXRlZFxuICAgICAgICBjb25zdCBkZXZpY2UgPSBhd2FpdCB0aGlzLmdldERldmljZShuYXRpdmVJZCk7XG4gICAgICAgIGlmIChkZXZpY2UgJiYgZGV2aWNlLnN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRldmljZS5zdG9yYWdlLnNldEl0ZW0oJ2hvc3QnLCBpcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBnZXREZXZpY2UobmF0aXZlSWQ6IHN0cmluZyk6IFByb21pc2U8QW1jcmVzdEFTSDIxQ2FtZXJhPiB7XG4gICAgICAgIGxldCBjYW1lcmEgPSB0aGlzLmNhbWVyYXMuZ2V0KG5hdGl2ZUlkKTtcbiAgICAgICAgaWYgKCFjYW1lcmEpIHtcbiAgICAgICAgICAgIGNhbWVyYSA9IG5ldyBBbWNyZXN0QVNIMjFDYW1lcmEobmF0aXZlSWQpO1xuICAgICAgICAgICAgdGhpcy5jYW1lcmFzLnNldChuYXRpdmVJZCwgY2FtZXJhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FtZXJhO1xuICAgIH1cblxuICAgIGFzeW5jIHJlbGVhc2VEZXZpY2UoaWQ6IHN0cmluZywgbmF0aXZlSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBjYW1lcmEgPSB0aGlzLmNhbWVyYXMuZ2V0KG5hdGl2ZUlkKTtcbiAgICAgICAgaWYgKGNhbWVyYSkge1xuICAgICAgICAgICAgYXdhaXQgY2FtZXJhLnJlbGVhc2UoKTtcbiAgICAgICAgICAgIHRoaXMuY2FtZXJhcy5kZWxldGUobmF0aXZlSWQpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgQW1jcmVzdEFTSDIxUHJvdmlkZXIoKTtcbiJdfQ==