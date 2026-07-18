import sdk, {
    Camera,
    DeviceProvider,
    FFmpegInput,
    MediaObject,
    MediaStreamOptions,
    PanTiltZoom,
    PanTiltZoomCapabilities,
    PanTiltZoomCommand,
    ResponseMediaStreamOptions,
    ResponsePictureOptions,
    ScryptedDeviceBase,
    ScryptedDeviceType,
    ScryptedInterface,
    Setting,
    Settings,
    SettingValue,
    VideoCamera,
} from '@scrypted/sdk';
import { DahuaDVRIP } from './dvrip';
import { OnvifServer, PTZCommand } from './onvif-server';
import * as os from 'os';
import * as crypto from 'crypto';

const { deviceManager, mediaManager } = sdk;

class AmcrestASH21Camera extends ScryptedDeviceBase implements Camera, VideoCamera, PanTiltZoom, Settings {
    private dvrip: DahuaDVRIP | null = null;
    private dvripConnecting: Promise<boolean> | null = null;
    private onvifServer: OnvifServer | null = null;
    private onvifServerStarting: Promise<void> | null = null;
    // Pending auto-stop timers for relative moves, keyed by axis
    private ptzStopTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(nativeId: string) {
        super(nativeId);
        // Start ONVIF server if enabled
        this.initOnvifServer();
    }

    private async initOnvifServer(): Promise<void> {
        if (!this.isOnvifEnabled()) {
            return;
        }

        try {
            await this.startOnvifServer();
        } catch (e: any) {
            this.console.error('[ONVIF] Failed to start server:', e.message);
        }
    }

    // PTZ Capabilities
    ptzCapabilities: PanTiltZoomCapabilities = {
        pan: true,
        tilt: true,
        zoom: true,
    };

    private getHost(): string {
        return this.storage.getItem('host') || '';
    }

    private getUsername(): string {
        return this.storage.getItem('username') || 'admin';
    }

    private getPassword(): string {
        return this.storage.getItem('password') || '';
    }

    private getRtspPort(): number {
        return parseInt(this.storage.getItem('rtspPort') || '554');
    }

    private getDvripPort(): number {
        return parseInt(this.storage.getItem('dvripPort') || '37777');
    }

    private getPtzMoveDurationMs(): number {
        const parsed = parseInt(this.storage.getItem('ptzMoveDurationMs') || '');
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
    }

    private isOnvifEnabled(): boolean {
        return this.storage.getItem('onvifEnabled') === 'true';
    }

    private getOnvifPort(): number {
        return parseInt(this.storage.getItem('onvifPort') || '8483');
    }

    private getOnvifIp(): string {
        const stored = this.storage.getItem('onvifIp');
        if (stored) return stored;

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

    private getMacAddress(): string {
        // Stable, unique, locally-administered MAC derived from the camera host,
        // so multiple cameras don't collide and the MAC survives restarts.
        // 0x02 first octet = locally administered, unicast.
        const hash = crypto.createHash('md5').update(this.getHost()).digest();
        const octets = [...hash.subarray(0, 5)].map(b => b.toString(16).padStart(2, '0'));
        return ['02', ...octets].join(':');
    }

    private async startOnvifServer(): Promise<void> {
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

            this.onvifServer = new OnvifServer({
                httpPort: onvifPort,
                rtspUrl: this.getRtspUrl(0),
                deviceName: `Amcrest ASH21 (${host})`,
                manufacturer: 'Amcrest',
                model: 'ASH21',
                serialNumber: host.replace(/\./g, ''),
                hardwareId: 'ASH21-PTZ',
                macAddress: this.getMacAddress(),
                ipAddress: onvifIp,
                // Proxy the camera's own ONVIF events out through this server
                nativeCameraHost: host,
                nativeCameraUsername: this.getUsername(),
                nativeCameraPassword: this.getPassword(),
                console: this.console,
            });

            // Listen for PTZ commands from ONVIF and translate to DVRIP
            this.onvifServer.on('ptz', async (command: PTZCommand) => {
                try {
                    await this.handleOnvifPtz(command);
                } catch (e: any) {
                    this.console.error('[ONVIF] PTZ command error:', e.message);
                }
            });

            await this.onvifServer.start();
            this.console.log(`[ONVIF] Server started at http://${onvifIp}:${onvifPort}/onvif/device_service`);
        })();

        try {
            await this.onvifServerStarting;
        } catch (e) {
            // Don't leave a half-started server behind; a non-null onvifServer
            // would make future start attempts no-op.
            // Assertion needed: TS narrows onvifServer from the early return above,
            // but the async closure assigns it in the meantime.
            const server = this.onvifServer as OnvifServer | null;
            if (server) {
                await server.stop().catch(() => {});
            }
            this.onvifServer = null;
            throw e;
        } finally {
            this.onvifServerStarting = null;
        }
    }

    private async stopOnvifServer(): Promise<void> {
        if (this.onvifServer) {
            await this.onvifServer.stop();
            this.onvifServer = null;
        }
    }

    private async handleOnvifPtz(command: PTZCommand): Promise<void> {
        if (command.type === 'stop') {
            // Stop all movement; the three axis stops are independent, send in parallel
            this.clearAllAutoStops();
            await Promise.all([
                this.ptzWithRetry('Left', 0, 'stop').catch(() => {}),
                this.ptzWithRetry('Up', 0, 'stop').catch(() => {}),
                this.ptzWithRetry('ZoomIn', 0, 'stop').catch(() => {}),
            ]);
            return;
        }

        const pan = command.pan || 0;
        const tilt = command.tilt || 0;
        const zoom = command.zoom || 0;

        if (command.type === 'continuous') {
            // Continuous move - start movement in each direction, in parallel
            const moves: Promise<void>[] = [];
            if (pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                this.clearAutoStop('pan');
                moves.push(this.ptzWithRetry(direction, this.toDvripSpeed(pan), 'start'));
            }
            if (tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                this.clearAutoStop('tilt');
                moves.push(this.ptzWithRetry(direction, this.toDvripSpeed(tilt), 'start'));
            }
            if (zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                this.clearAutoStop('zoom');
                moves.push(this.ptzWithRetry(direction, this.toDvripSpeed(zoom), 'start'));
            }
            await Promise.all(moves);
        } else if (command.type === 'relative' || command.type === 'absolute') {
            // Relative move - move briefly then stop. The camera has no position
            // feedback over DVRIP, so absolute moves are approximated as a nudge
            // toward the requested position.
            await this.ptzRelativeMove(pan, tilt, zoom);
        } else if (command.type === 'preset' || command.type === 'home') {
            this.console.warn(`[ONVIF] ${command.type} commands are not supported by the DVRIP bridge; ignoring`);
        }
    }

    private getRtspUrl(subtype: number = 0): string {
        const host = this.getHost();
        const username = encodeURIComponent(this.getUsername());
        const password = encodeURIComponent(this.getPassword());
        const port = this.getRtspPort();
        return `rtsp://${username}:${password}@${host}:${port}/cam/realmonitor?channel=1&subtype=${subtype}`;
    }

    async getSettings(): Promise<Setting[]> {
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
                key: 'ptzMoveDurationMs',
                title: 'PTZ Move Duration (ms)',
                description: 'How long a relative PTZ move runs before it is automatically stopped',
                value: this.getPtzMoveDurationMs().toString(),
                type: 'number',
                placeholder: '300',
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
                placeholder: '8483',
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

    async putSetting(key: string, value: SettingValue): Promise<void> {
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
            } else {
                await this.stopOnvifServer();
            }
        } else if (['onvifPort', 'onvifIp', 'host', 'username', 'password', 'rtspPort'].includes(key) && this.isOnvifEnabled()) {
            // Restart ONVIF server with new settings. Credentials and RTSP port
            // are included because the served stream URI embeds them.
            await this.stopOnvifServer();
            await this.startOnvifServer();
        }
    }

    private async ensureDvripConnected(): Promise<DahuaDVRIP> {
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

            // Tear down any stale client so its socket and keepalive timer don't leak
            this.dvrip?.disconnect();

            this.dvrip = new DahuaDVRIP({
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
            } catch (e) {
                this.dvrip.disconnect();
                this.dvrip = null;
                throw e;
            }
        })();

        let success: boolean;
        try {
            success = await this.dvripConnecting;
        } finally {
            this.dvripConnecting = null;
        }

        if (!success) {
            throw new Error('DVRIP login failed');
        }

        return this.dvrip!;
    }

    // Map normalized magnitude (-1..1) to DVRIP speed (1..8)
    private toDvripSpeed(value: number | undefined): number {
        if (value === undefined || value === 0) return 0;
        return Math.min(8, Math.max(1, Math.ceil(Math.abs(value) * 8)));
    }

    private clearAutoStop(axis: 'pan' | 'tilt' | 'zoom'): void {
        const timer = this.ptzStopTimers.get(axis);
        if (timer) {
            clearTimeout(timer);
            this.ptzStopTimers.delete(axis);
        }
    }

    private clearAllAutoStops(): void {
        for (const timer of this.ptzStopTimers.values()) {
            clearTimeout(timer);
        }
        this.ptzStopTimers.clear();
    }

    private scheduleAutoStop(axis: 'pan' | 'tilt' | 'zoom', direction: string, durationMs: number): void {
        // Replace any pending stop so a rapid follow-up move isn't cut short
        // by the previous move's timer.
        this.clearAutoStop(axis);
        this.ptzStopTimers.set(axis, setTimeout(() => {
            this.ptzStopTimers.delete(axis);
            this.ptzWithRetry(direction, 0, 'stop').catch(() => {});
        }, durationMs));
    }

    // Shared relative-move implementation: start each requested axis (in
    // parallel), then auto-stop after the configured duration.
    private async ptzRelativeMove(pan: number, tilt: number, zoom: number): Promise<void> {
        const duration = this.getPtzMoveDurationMs();
        const moves: Promise<void>[] = [];

        if (pan !== 0) {
            const direction = pan > 0 ? 'Right' : 'Left';
            this.clearAutoStop('pan');
            moves.push(this.ptzWithRetry(direction, this.toDvripSpeed(pan), 'start')
                .then(() => this.scheduleAutoStop('pan', direction, duration)));
        }
        if (tilt !== 0) {
            const direction = tilt > 0 ? 'Up' : 'Down';
            this.clearAutoStop('tilt');
            moves.push(this.ptzWithRetry(direction, this.toDvripSpeed(tilt), 'start')
                .then(() => this.scheduleAutoStop('tilt', direction, duration)));
        }
        if (zoom !== 0) {
            const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
            this.clearAutoStop('zoom');
            moves.push(this.ptzWithRetry(direction, this.toDvripSpeed(zoom), 'start')
                .then(() => this.scheduleAutoStop('zoom', direction, duration)));
        }

        await Promise.all(moves);
    }

    private async ptzWithRetry(direction: string, speed: number, action: 'start' | 'stop'): Promise<void> {
        let dvrip = await this.ensureDvripConnected();
        try {
            await dvrip.ptzControl(direction, speed, action);
        } catch (e: any) {
            // One reconnect-and-retry so a dropped/idle connection doesn't fail the command
            this.console.warn(`[DVRIP] ptz.${action} ${direction} failed (${e.message}), reconnecting and retrying...`);
            this.dvrip?.disconnect();
            this.dvrip = null;
            dvrip = await this.ensureDvripConnected();
            await dvrip.ptzControl(direction, speed, action);
        }
    }

    // VideoCamera interface
    async getVideoStream(options?: MediaStreamOptions): Promise<MediaObject> {
        const subtype = options?.id === 'substream' ? 1 : 0;
        const rtspUrl = this.getRtspUrl(subtype);

        const ffmpegInput: FFmpegInput = {
            url: rtspUrl,
            inputArguments: [
                '-rtsp_transport', 'tcp',
                '-i', rtspUrl,
            ],
        };

        return mediaManager.createFFmpegMediaObject(ffmpegInput);
    }

    async getVideoStreamOptions(): Promise<ResponseMediaStreamOptions[]> {
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
    async takePicture(options?: any): Promise<MediaObject> {
        // Use FFmpeg to grab a frame from RTSP
        const rtspUrl = this.getRtspUrl(1);  // Use substream for faster snapshot

        const ffmpegInput: FFmpegInput = {
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

    async getPictureOptions(): Promise<ResponsePictureOptions[]> {
        return [];
    }

    // Cleanup when device is released
    async release(): Promise<void> {
        this.clearAllAutoStops();
        await this.stopOnvifServer();
        if (this.dvrip) {
            this.dvrip.disconnect();
            this.dvrip = null;
        }
    }

    // PanTiltZoom interface
    async ptzCommand(command: PanTiltZoomCommand): Promise<void> {
        try {
            await this.ptzRelativeMove(command.pan ?? 0, command.tilt ?? 0, command.zoom ?? 0);
        } catch (e: any) {
            this.console.error('PTZ command error:', e.message);
            throw e;
        }
    }
}

class AmcrestASH21Provider extends ScryptedDeviceBase implements DeviceProvider, Settings {
    private cameras: Map<string, AmcrestASH21Camera> = new Map();

    constructor(nativeId?: string) {
        super(nativeId);
    }

    async getSettings(): Promise<Setting[]> {
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

    async putSetting(key: string, value: SettingValue): Promise<void> {
        if (key === 'addCamera' && value) {
            const ip = String(value).trim();
            if (ip) {
                await this.addCamera(ip);
            }
        }
    }

    private getNextOnvifPort(): number {
        // Persist assigned ports so a restart race (adding a camera before existing
        // devices are instantiated) can't hand out a colliding port.
        let assigned: number[] = [];
        try {
            assigned = JSON.parse(this.storage.getItem('assignedOnvifPorts') || '[]');
        } catch {
            assigned = [];
        }
        let port = 8483;
        while (assigned.includes(port))
            port++;
        assigned.push(port);
        this.storage.setItem('assignedOnvifPorts', JSON.stringify(assigned));
        return port;
    }

    private async addCamera(ip: string): Promise<void> {
        if (!/^[a-zA-Z0-9._-]+$/.test(ip)) {
            this.console.error(`Invalid camera address "${ip}" - enter an IP address or hostname`);
            return;
        }

        const nativeId = `amcrest-ash21-${ip.replace(/\./g, '-')}`;

        await deviceManager.onDeviceDiscovered({
            nativeId,
            name: `Amcrest ASH21 (${ip})`,
            type: ScryptedDeviceType.Camera,
            interfaces: [
                ScryptedInterface.Camera,
                ScryptedInterface.VideoCamera,
                ScryptedInterface.PanTiltZoom,
                ScryptedInterface.Settings,
            ],
        });

        // Configure the new device: host, a free ONVIF port, and ONVIF enabled by
        // default (putSetting also starts the server) so PTZ works out of the box and
        // a second camera doesn't silently stay off.
        const device = await this.getDevice(nativeId);
        if (device && device.storage) {
            device.storage.setItem('host', ip);
            device.storage.setItem('onvifPort', String(this.getNextOnvifPort()));
            await device.putSetting('onvifEnabled', 'true');
        }

        this.console.log(`Added camera ${ip} as ${nativeId}. Open the new device to set credentials and enable the ONVIF server.`);
    }

    async getDevice(nativeId: string): Promise<AmcrestASH21Camera> {
        let camera = this.cameras.get(nativeId);
        if (!camera) {
            camera = new AmcrestASH21Camera(nativeId);
            this.cameras.set(nativeId, camera);
        }
        return camera;
    }

    async releaseDevice(id: string, nativeId: string): Promise<void> {
        const camera = this.cameras.get(nativeId);
        if (camera) {
            await camera.release();
            this.cameras.delete(nativeId);
        }
    }
}

export default new AmcrestASH21Provider();
