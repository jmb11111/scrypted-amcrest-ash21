declare var __createBinding: any;
declare var __setModuleDefault: any;
declare var __importStar: any;
declare const sdk_1: any;
declare const dvrip_1: any;
declare const onvif_server_1: any;
declare const os: any;
declare const deviceManager: any, mediaManager: any;
declare class AmcrestASH21Camera extends sdk_1.ScryptedDeviceBase {
    constructor(nativeId: any);
    initOnvifServer(): Promise<void>;
    getHost(): any;
    getUsername(): any;
    getPassword(): any;
    getRtspPort(): number;
    getDvripPort(): number;
    isOnvifEnabled(): boolean;
    getOnvifPort(): number;
    getOnvifIp(): any;
    startOnvifServer(): Promise<void>;
    stopOnvifServer(): Promise<void>;
    handleOnvifPtz(command: any): Promise<void>;
    getRtspUrl(subtype?: number): string;
    getSettings(): Promise<({
        key: string;
        title: string;
        value: any;
        type: string;
        placeholder: string;
        description?: undefined;
    } | {
        key: string;
        title: string;
        value: any;
        type: string;
        placeholder?: undefined;
        description?: undefined;
    } | {
        key: string;
        title: string;
        description: string;
        value: boolean;
        type: string;
        placeholder?: undefined;
    } | {
        key: string;
        title: string;
        description: string;
        value: any;
        type: string;
        placeholder: any;
    })[]>;
    putSetting(key: any, value: any): Promise<void>;
    ensureDvripConnected(): Promise<any>;
    getVideoStream(options: any): Promise<any>;
    getVideoStreamOptions(): Promise<{
        id: string;
        name: string;
        video: {
            codec: string;
        };
        audio: {
            codec: string;
        };
    }[]>;
    takePicture(options: any): Promise<any>;
    getPictureOptions(): Promise<any[]>;
    release(): Promise<void>;
    ptzCommand(command: any): Promise<void>;
}
declare class AmcrestASH21Provider extends sdk_1.ScryptedDeviceBase {
    constructor(nativeId: any);
    getSettings(): Promise<{
        key: string;
        title: string;
        description: string;
        type: string;
        placeholder: string;
    }[]>;
    putSetting(key: any, value: any): Promise<void>;
    addCamera(ip: any): Promise<void>;
    getDevice(nativeId: any): Promise<any>;
    releaseDevice(id: any, nativeId: any): Promise<void>;
}
