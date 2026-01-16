export interface DVRIPOptions {
    host: string;
    port?: number;
    username: string;
    password: string;
    console?: Console;
}
export declare class DahuaDVRIP {
    private host;
    private port;
    private username;
    private password;
    private socket;
    private sessionId;
    private requestId;
    private running;
    private loginPhase;
    private keepaliveInterval;
    private buffer;
    private loginDataResolver;
    private pendingResolvers;
    private console;
    constructor(options: DVRIPOptions);
    private dahuaGen1Hash;
    private dahuaGen2Md5Hash;
    private dahuaDvripMd5Hash;
    private buildDvripAuthHash;
    connect(): Promise<void>;
    private handleData;
    private processBuffer;
    private handlePacket;
    login(): Promise<boolean>;
    private waitForData;
    private startKeepalive;
    sendCommand(method: string, params?: Record<string, any>): Promise<any>;
    ptzControl(direction: string, speed?: number, action?: 'start' | 'stop'): Promise<any>;
    ptzMove(direction: string, speed?: number, durationMs?: number): Promise<void>;
    disconnect(): void;
    isConnected(): boolean;
}
