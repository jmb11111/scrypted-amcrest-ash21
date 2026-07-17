declare var __createBinding: any;
declare var __setModuleDefault: any;
declare var __importStar: any;
declare const net: any;
declare const crypto: any;
declare const DVRIP_HEADERS: Buffer<ArrayBuffer>[];
declare function isDvripPacket(data: any): boolean;
declare function p32(value: any, bigEndian?: boolean): Buffer<ArrayBuffer>;
declare function u32(data: any, bigEndian?: boolean): any;
declare function p64(value: any, bigEndian?: boolean): Buffer<ArrayBuffer>;
declare class DahuaDVRIP {
    constructor(options: any);
    dahuaGen1Hash(password: any): string;
    dahuaGen2Md5Hash(random: any, realm: any, username: any, password: any): any;
    dahuaDvripMd5Hash(random: any, username: any, password: any): any;
    buildDvripAuthHash(random: any, realm: any, username: any, password: any): string;
    connect(): Promise<unknown>;
    handleData(data: any): void;
    processBuffer(): void;
    handlePacket(packet: any): void;
    login(): Promise<boolean>;
    waitForData(timeoutMs: any): Promise<unknown>;
    startKeepalive(): void;
    sendCommand(method: any, params?: {}): Promise<unknown>;
    ptzControl(direction: any, speed?: number, action?: string): Promise<unknown>;
    ptzMove(direction: any, speed?: number, durationMs?: number): Promise<void>;
    disconnect(): void;
    isConnected(): boolean;
}
