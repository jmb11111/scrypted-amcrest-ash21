import * as net from 'net';
import * as crypto from 'crypto';

// Valid DVRIP packet prefixes
const DVRIP_HEADERS = [
    Buffer.from([0xa0, 0x00]),  // 3DES Login
    Buffer.from([0xa0, 0x01]),  // DVRIP Send Request Realm
    Buffer.from([0xa0, 0x05]),  // DVRIP login Send Login Details
    Buffer.from([0xb0, 0x00]),  // DVRIP Receive
    Buffer.from([0xb0, 0x01]),  // DVRIP Receive
    Buffer.from([0xa3, 0x01]),  // DVRIP Discover Request
    Buffer.from([0xb3, 0x00]),  // DVRIP Discover Response
    Buffer.from([0xf6, 0x00]),  // DVRIP JSON
];

function isDvripPacket(data: Buffer): boolean {
    if (data.length < 2) return false;
    const prefix = data.subarray(0, 2);
    return DVRIP_HEADERS.some(h => h.equals(prefix));
}

function p32(value: number, bigEndian = false): Buffer {
    const buf = Buffer.alloc(4);
    if (bigEndian) {
        buf.writeUInt32BE(value);
    } else {
        buf.writeUInt32LE(value);
    }
    return buf;
}

function u32(data: Buffer, bigEndian = false): number {
    if (bigEndian) {
        return data.readUInt32BE(0);
    }
    return data.readUInt32LE(0);
}

function p64(value: bigint, bigEndian = false): Buffer {
    const buf = Buffer.alloc(8);
    if (bigEndian) {
        buf.writeBigUInt64BE(value);
    } else {
        buf.writeBigUInt64LE(value);
    }
    return buf;
}

export interface DVRIPOptions {
    host: string;
    port?: number;
    username: string;
    password: string;
    console?: Console;
}

export class DahuaDVRIP {
    private host: string;
    private port: number;
    private username: string;
    private password: string;
    private socket: net.Socket | null = null;
    private sessionId: number = 0;
    private requestId: number = 0;
    private running: boolean = false;
    private loginPhase: boolean = false;
    private keepaliveInterval: NodeJS.Timeout | null = null;
    private buffer: Buffer = Buffer.alloc(0);
    private loginDataResolver: ((data: Buffer) => void) | null = null;
    private pendingResolvers: Map<number, { resolve: (data: any) => void; reject: (err: Error) => void }> = new Map();
    private console: Console;

    constructor(options: DVRIPOptions) {
        this.host = options.host;
        this.port = options.port || 37777;
        this.username = options.username;
        this.password = options.password;
        this.console = options.console || console;
    }

    private dahuaGen1Hash(password: string): string {
        const md5 = crypto.createHash('md5');
        md5.update(password, 'latin1');
        const digest = md5.digest();

        const out: number[] = [];
        for (let i = 0; i < digest.length; i += 2) {
            let val = (digest[i] + digest[i + 1]) % 62;
            if (val < 10) {
                val += 48;  // '0'-'9'
            } else if (val < 36) {
                val += 55;  // 'A'-'Z'
            } else {
                val += 61;  // 'a'-'z'
            }
            out.push(val);
        }
        return String.fromCharCode(...out);
    }

    private dahuaGen2Md5Hash(random: string, realm: string, username: string, password: string): string {
        // First hash: username:realm:password
        const pwddbHash = crypto.createHash('md5')
            .update(`${username}:${realm}:${password}`, 'latin1')
            .digest('hex')
            .toUpperCase();

        // Second hash: username:random:first_hash
        const randomHash = crypto.createHash('md5')
            .update(`${username}:${random}:${pwddbHash}`, 'latin1')
            .digest('hex')
            .toUpperCase();

        return randomHash;
    }

    private dahuaDvripMd5Hash(random: string, username: string, password: string): string {
        const gen1Hash = this.dahuaGen1Hash(password);
        const randomHash = crypto.createHash('md5')
            .update(`${username}:${random}:${gen1Hash}`, 'latin1')
            .digest('hex')
            .toUpperCase();
        return randomHash;
    }

    private buildDvripAuthHash(random: string, realm: string, username: string, password: string): string {
        const gen2 = this.dahuaGen2Md5Hash(random, realm, username, password);
        const gen1 = this.dahuaDvripMd5Hash(random, username, password);
        return `${username}&&${gen2}${gen1}`;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            this.socket.setTimeout(10000);

            this.socket.on('connect', () => {
                this.running = true;
                this.console.log(`[DVRIP] Connected to ${this.host}:${this.port}`);
                resolve();
            });

            this.socket.on('error', (err) => {
                this.console.error(`[DVRIP] Socket error: ${err.message}`);
                reject(err);
            });

            this.socket.on('timeout', () => {
                this.console.error('[DVRIP] Socket timeout');
                this.socket?.destroy();
                reject(new Error('Connection timeout'));
            });

            this.socket.on('data', (data) => {
                this.handleData(data);
            });

            this.socket.on('close', () => {
                this.running = false;
                this.console.log('[DVRIP] Connection closed');
            });

            this.socket.connect(this.port, this.host);
        });
    }

    private handleData(data: Buffer): void {
        this.buffer = Buffer.concat([this.buffer, data]);

        // During login phase, notify the login waiter
        if (this.loginPhase && this.loginDataResolver && this.buffer.length >= 32) {
            const resolver = this.loginDataResolver;
            this.loginDataResolver = null;
            const capturedData = this.buffer;
            this.buffer = Buffer.alloc(0);
            resolver(capturedData);
            return;
        }

        if (!this.loginPhase) {
            this.processBuffer();
        }
    }

    private processBuffer(): void {
        while (this.buffer.length >= 32) {
            if (isDvripPacket(this.buffer)) {
                // Parse header to get expected data length
                const dataLen = this.buffer.readUInt32LE(4);
                const totalLen = 32 + dataLen;

                if (this.buffer.length >= totalLen) {
                    const packet = this.buffer.subarray(0, totalLen);
                    this.buffer = this.buffer.subarray(totalLen);
                    this.handlePacket(packet);
                } else {
                    break;  // Need more data
                }
            } else {
                // Not a DVRIP packet - skip bytes until we find one
                let found = false;
                for (let i = 1; i < this.buffer.length - 1; i++) {
                    const prefix = this.buffer.subarray(i, i + 2);
                    if (DVRIP_HEADERS.some(h => h.equals(prefix))) {
                        this.buffer = this.buffer.subarray(i);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.buffer = this.buffer.subarray(-1);
                    break;
                }
            }
        }
    }

    private handlePacket(packet: Buffer): void {
        const header = packet.subarray(0, 32);
        const data = packet.subarray(32);

        // Check if this is a JSON response
        if (header[0] === 0xf6 || header[0] === 0xb0) {
            if (data.length > 0) {
                try {
                    const text = data.toString('latin1');
                    const jsonStart = text.indexOf('{');
                    const jsonEnd = text.lastIndexOf('}') + 1;
                    if (jsonStart >= 0 && jsonEnd > jsonStart) {
                        const jsonData = JSON.parse(text.substring(jsonStart, jsonEnd));
                        const id = jsonData.id;
                        if (id && this.pendingResolvers.has(id)) {
                            const resolver = this.pendingResolvers.get(id)!;
                            this.pendingResolvers.delete(id);
                            resolver.resolve(jsonData);
                        }
                    }
                } catch (e) {
                    // Not JSON or parse error
                }
            }
        }
    }

    async login(): Promise<boolean> {
        if (!this.socket) {
            throw new Error('Not connected');
        }

        this.loginPhase = true;

        // Step 1: Send realm request
        const initHeader = Buffer.from([
            0xa0, 0x01, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x05, 0x02, 0x01, 0x01,
            0x00, 0x00, 0xa1, 0xaa
        ]);

        this.console.log('[DVRIP] Sending login request...');
        this.socket.write(initHeader);

        // Wait for challenge response
        const challengeData = await this.waitForData(5000);
        if (!challengeData || challengeData.length < 32) {
            this.console.error('[DVRIP] No challenge response');
            this.loginPhase = false;
            return false;
        }

        const responseText = challengeData.subarray(32).toString('latin1');
        let realm: string | null = null;
        let random: string | null = null;

        for (const line of responseText.split('\n')) {
            if (line.startsWith('Realm:')) {
                realm = line.substring(6).trim();
            } else if (line.startsWith('Random:')) {
                random = line.substring(7).trim();
            }
        }

        if (!realm || !random) {
            this.console.error('[DVRIP] Failed to parse challenge');
            this.loginPhase = false;
            return false;
        }

        this.console.log(`[DVRIP] Realm: ${realm}, Random: ${random}`);

        // Step 2: Send authentication
        const authString = this.buildDvripAuthHash(random, realm, this.username, this.password);
        const authData = Buffer.from(authString, 'latin1');

        const authHeader = Buffer.concat([
            p32(0xa0050000, true),
            p32(authData.length),
            Buffer.alloc(16),
            p64(0x050200080000a1aan, true)
        ]);

        this.console.log('[DVRIP] Sending authentication...');
        this.socket.write(Buffer.concat([authHeader, authData]));

        // Wait for auth response
        const authResponse = await this.waitForData(5000);
        if (!authResponse || authResponse.length < 32) {
            this.console.error('[DVRIP] No auth response');
            this.loginPhase = false;
            return false;
        }

        const errorCode = authResponse.subarray(8, 10);
        if (errorCode[0] === 0x00 && errorCode[1] === 0x08) {
            this.sessionId = authResponse.readUInt32LE(16);
            this.console.log(`[DVRIP] Login successful! Session ID: ${this.sessionId}`);
            this.loginPhase = false;
            // Disable socket timeout after login - let keepalive manage the connection
            this.socket?.setTimeout(0);
            this.startKeepalive();
            return true;
        }

        this.console.error(`[DVRIP] Login failed with error code: ${errorCode.toString('hex')}`);
        this.loginPhase = false;
        return false;
    }

    private waitForData(timeoutMs: number): Promise<Buffer | null> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.loginDataResolver = null;
                resolve(this.buffer.length > 0 ? this.buffer : null);
                this.buffer = Buffer.alloc(0);
            }, timeoutMs);

            this.loginDataResolver = (data: Buffer) => {
                clearTimeout(timeout);
                resolve(data);
            };
        });
    }

    private startKeepalive(): void {
        this.keepaliveInterval = setInterval(() => {
            if (this.running) {
                this.sendCommand('global.keepAlive', { timeout: 30, active: true })
                    .catch(err => this.console.error('[DVRIP] Keepalive error:', err.message));
            }
        }, 25000);
    }

    async sendCommand(method: string, params: Record<string, any> = {}): Promise<any> {
        if (!this.socket || !this.running) {
            throw new Error('Not connected');
        }

        this.requestId++;
        const command = {
            method,
            params,
            id: this.requestId,
            session: this.sessionId
        };

        const jsonData = Buffer.from(JSON.stringify(command), 'latin1');

        const header = Buffer.concat([
            p32(0xf6000000, true),
            p32(jsonData.length),
            p32(this.requestId),
            p32(0),
            p32(jsonData.length),
            p32(0),
            p32(this.sessionId),
            p32(0)
        ]);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingResolvers.delete(this.requestId);
                reject(new Error(`Command timeout: ${method}`));
            }, 10000);

            this.pendingResolvers.set(this.requestId, {
                resolve: (data) => {
                    clearTimeout(timeout);
                    resolve(data);
                },
                reject: (err) => {
                    clearTimeout(timeout);
                    reject(err);
                }
            });

            this.socket!.write(Buffer.concat([header, jsonData]));
        });
    }

    async ptzControl(direction: string, speed: number = 5, action: 'start' | 'stop' = 'start'): Promise<any> {
        const params = {
            channel: 0,
            code: direction,
            arg1: action === 'start' ? speed : 0,
            arg2: action === 'start' ? speed : 0,
            arg3: 0,
            arg4: 0
        };

        const method = action === 'start' ? 'ptz.start' : 'ptz.stop';
        return this.sendCommand(method, params);
    }

    async ptzMove(direction: string, speed: number = 5, durationMs: number = 500): Promise<void> {
        await this.ptzControl(direction, speed, 'start');
        await new Promise(resolve => setTimeout(resolve, durationMs));
        await this.ptzControl(direction, 0, 'stop');
    }

    disconnect(): void {
        this.running = false;
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }

    isConnected(): boolean {
        return this.running && this.socket !== null;
    }
}
