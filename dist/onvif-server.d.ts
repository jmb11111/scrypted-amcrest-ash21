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
    console?: Console;
}
export interface PTZCommand {
    pan?: number;
    tilt?: number;
    zoom?: number;
}
export declare class OnvifServer extends EventEmitter {
    private config;
    private httpServer;
    private discoverySocket;
    private console;
    private running;
    private readonly NS;
    constructor(config: OnvifServerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startHttpServer;
    private handleHttpRequest;
    private handleSoapRequest;
    private extractSoapAction;
    private handleGetSystemDateAndTime;
    private handleGetCapabilities;
    private handleGetServices;
    private handleGetDeviceInformation;
    private handleGetScopes;
    private handleGetServiceCapabilities;
    private handleGetNetworkInterfaces;
    private handleGetProfiles;
    private handleGetStreamUri;
    private handleGetSnapshotUri;
    private handleGetVideoSources;
    private handleGetNodes;
    private handleGetPTZConfigurations;
    private handleGetPTZConfiguration;
    private handleGetPTZStatus;
    private handleContinuousMove;
    private handleRelativeMove;
    private handleAbsoluteMove;
    private handlePTZStop;
    private handleGetPresets;
    private handleGotoPreset;
    private handleSetPreset;
    private handleRemovePreset;
    private handleGotoHomePosition;
    private handleSetHomePosition;
    private extractPTZVelocity;
    private extractPTZTranslation;
    private extractPTZPosition;
    private startDiscovery;
    private sendProbeMatch;
    private wrapSoapResponse;
    private createSoapFault;
    private generateUUID;
}
