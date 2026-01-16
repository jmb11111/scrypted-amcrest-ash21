import { Camera, DeviceProvider, MediaObject, MediaStreamOptions, PanTiltZoom, PanTiltZoomCapabilities, PanTiltZoomCommand, ResponseMediaStreamOptions, ResponsePictureOptions, ScryptedDeviceBase, Setting, Settings, SettingValue, VideoCamera } from '@scrypted/sdk';
declare class AmcrestASH21Camera extends ScryptedDeviceBase implements Camera, VideoCamera, PanTiltZoom, Settings {
    private dvrip;
    private dvripConnecting;
    private onvifServer;
    private onvifServerStarting;
    constructor(nativeId: string);
    private initOnvifServer;
    ptzCapabilities: PanTiltZoomCapabilities;
    private getHost;
    private getUsername;
    private getPassword;
    private getRtspPort;
    private getDvripPort;
    private isOnvifEnabled;
    private getOnvifPort;
    private getOnvifIp;
    private startOnvifServer;
    private stopOnvifServer;
    private handleOnvifPtz;
    private getRtspUrl;
    getSettings(): Promise<Setting[]>;
    putSetting(key: string, value: SettingValue): Promise<void>;
    private ensureDvripConnected;
    getVideoStream(options?: MediaStreamOptions): Promise<MediaObject>;
    getVideoStreamOptions(): Promise<ResponseMediaStreamOptions[]>;
    takePicture(options?: any): Promise<MediaObject>;
    getPictureOptions(): Promise<ResponsePictureOptions[]>;
    release(): Promise<void>;
    ptzCommand(command: PanTiltZoomCommand): Promise<void>;
}
declare class AmcrestASH21Provider extends ScryptedDeviceBase implements DeviceProvider, Settings {
    private cameras;
    constructor(nativeId?: string);
    getSettings(): Promise<Setting[]>;
    putSetting(key: string, value: SettingValue): Promise<void>;
    private addCamera;
    getDevice(nativeId: string): Promise<AmcrestASH21Camera>;
    releaseDevice(id: string, nativeId: string): Promise<void>;
}
declare const _default: AmcrestASH21Provider;
export default _default;
