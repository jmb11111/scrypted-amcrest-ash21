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
import { OnvifServer } from './onvif-server';
import * as os from 'os';

const { deviceManager, mediaManager } = sdk;

class AmcrestASH21Camera extends ScryptedDeviceBase implements Camera, VideoCamera, PanTiltZoom, Settings {
    private dvrip: DahuaDVRIP | null = null;
    private dvripConnecting: Promise<boolean> | null = null;
    private onvifServer: OnvifServer | null = null;
    private onvifServerStarting: Promise<void> | null = null;

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

    private isOnvifEnabled(): boolean {
        return this.storage.getItem('onvifEnabled') === 'true';
    }

    private getOnvifPort(): number {
        return parseInt(this.storage.getItem('onvifPort') || '8080');
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
                macAddress: '00:00:00:00:00:00',
                ipAddress: onvifIp,
                console: this.console,
            });

            // Listen for PTZ commands from ONVIF and translate to DVRIP
            this.onvifServer.on('ptz', async (command: any) => {
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

    private async handleOnvifPtz(command: any): Promise<void> {
        const dvrip = await this.ensureDvripConnected();

        const getSpeed = (value: number | undefined): number => {
            if (value === undefined || value === 0) return 0;
            return Math.min(8, Math.max(1, Math.ceil(Math.abs(value) * 8)));
        };

        if (command.type === 'stop') {
            // Stop all movement
            await dvrip.ptzControl('Left', 0, 'stop').catch(() => {});
            await dvrip.ptzControl('Up', 0, 'stop').catch(() => {});
            await dvrip.ptzControl('ZoomIn', 0, 'stop').catch(() => {});
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
        } else if (command.type === 'relative') {
            // Relative move - move briefly then stop
            const duration = 300; // ms

            if (pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                await dvrip.ptzControl(direction, getSpeed(pan), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => {}), duration);
            }
            if (tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                await dvrip.ptzControl(direction, getSpeed(tilt), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => {}), duration);
            }
            if (zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                await dvrip.ptzControl(direction, getSpeed(zoom), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => {}), duration);
            }
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
        } else if (['onvifPort', 'onvifIp', 'host'].includes(key) && this.isOnvifEnabled()) {
            // Restart ONVIF server with new settings
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

        const success = await this.dvripConnecting;
        this.dvripConnecting = null;

        if (!success) {
            throw new Error('DVRIP login failed');
        }

        return this.dvrip!;
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
        await this.stopOnvifServer();
        if (this.dvrip) {
            this.dvrip.disconnect();
            this.dvrip = null;
        }
    }

    // PanTiltZoom interface
    async ptzCommand(command: PanTiltZoomCommand): Promise<void> {
        const dvrip = await this.ensureDvripConnected();

        // Map normalized values (-1 to 1) to DVRIP commands
        // Speed is derived from magnitude
        const getSpeed = (value: number | undefined): number => {
            if (value === undefined) return 0;
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
                    } catch (e) {
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
                    } catch (e) {
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
                    } catch (e) {
                        // Ignore stop errors
                    }
                }, 200);
            }
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
            const ip = String(value);
            await this.addCamera(ip);
        }
    }

    private async addCamera(ip: string): Promise<void> {
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

        // Set default host after device is created
        const device = await this.getDevice(nativeId);
        if (device && device.storage) {
            device.storage.setItem('host', ip);
        }
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
