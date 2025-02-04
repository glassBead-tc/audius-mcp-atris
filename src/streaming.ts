import { sdk } from '@audius/sdk';
import express from 'express';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { cacheManager } from './cache/cache-manager.js';
import { WalletManager } from './auth.js';

interface StreamSession {
    trackId: string;
    startTime: Date;
    quality: string;
    bytesStreamed: number;
    errors: number;
    timeoutRef: NodeJS.Timeout;
}

interface StreamHealth {
    bytesPerSecond: number;
    totalBytes: number;
    duration: number;
    errors: number;
}

interface StreamOptions {
    contentType: string;
    encoding: string;
    quality: string;
    metadata: {
        title: string;
        artist: string;
        duration: number;
    };
}

interface RangeRequest {
    start: number;
    end?: number;
}

class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private readonly windowMs = 60000;  // 1 minute
    private readonly maxRequests = 60;  // 60 requests per minute

    isAllowed(ip: string): boolean {
        const now = Date.now();
        const timestamps = this.requests.get(ip) || [];
        const recentTimestamps = timestamps.filter(t => t > now - this.windowMs);
        
        if (recentTimestamps.length >= this.maxRequests) {
            return false;
        }

        recentTimestamps.push(now);
        this.requests.set(ip, recentTimestamps);
        return true;
    }

    cleanup(): void {
        const now = Date.now();
        for (const [ip, timestamps] of this.requests.entries()) {
            const recentTimestamps = timestamps.filter(t => t > now - this.windowMs);
            if (recentTimestamps.length === 0) {
                this.requests.delete(ip);
            } else {
                this.requests.set(ip, recentTimestamps);
            }
        }
    }
}

/**
 * Manages audio streaming and playback for the Audius MCP server.
 */
export class StreamingManager {
    private audiusSdk: ReturnType<typeof sdk>;
    private walletManager: WalletManager;
    private app: express.Application;
    private logger: Console;
    private activeStreams: Map<string, StreamSession>;
    private rateLimiter: RateLimiter;
    private corsHeaders: Record<string, string>;
    private server?: ReturnType<typeof this.app.listen>;
    private cleanupInterval?: NodeJS.Timeout;
    private port: number;
    private isServerRunning: boolean = false;

    constructor(audiusSdk: ReturnType<typeof sdk>, walletManager: WalletManager, logger?: Console) {
        this.audiusSdk = audiusSdk;
        this.walletManager = walletManager;
        this.port = parseInt(process.env.PORT || '3333');
        
        // Create a minimal logger that only logs critical errors
        this.logger = logger || {
            assert: () => {},
            clear: () => {},
            count: () => {},
            countReset: () => {},
            debug: () => {},
            dir: () => {},
            dirxml: () => {},
            error: (message: string) => {
                if (message.includes('Failed to start streaming server') ||
                    message.includes('Failed to stop streaming server')) {
                    console.error(`[Streaming] ${message}`);
                }
            },
            group: () => {},
            groupCollapsed: () => {},
            groupEnd: () => {},
            info: () => {},
            log: () => {},
            table: () => {},
            time: () => {},
            timeEnd: () => {},
            timeLog: () => {},
            trace: () => {},
            warn: () => {},
            profile: () => {},
            profileEnd: () => {},
            timeStamp: () => {},
            Console: console.Console
        } as Console;

        this.app = express();
        this.activeStreams = new Map();
        this.rateLimiter = new RateLimiter();

        // Initialize CORS headers
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
        this.corsHeaders = {
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Range',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
            'Access-Control-Max-Age': '86400'
        };

        // Configure CORS middleware
        this.app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            } else {
                res.setHeader('Access-Control-Allow-Origin', '*');
            }
            
            Object.entries(this.corsHeaders).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
            
            next();
        });

        this.setupRoutes();
    }

    private validateTrackId(trackId: string): void {
        if (!trackId?.match(/^[A-Za-z0-9]+$/)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid track ID format');
        }
    }

    private async getStreamMetadata(trackId: string): Promise<StreamOptions> {
        try {
            const [track, streamData] = await Promise.all([
                this.audiusSdk.tracks.getTrack({ trackId }),
                this.audiusSdk.tracks.getTrackStreamUrl({ trackId })
            ]);
            
            return {
                contentType: 'audio/mpeg',
                encoding: 'chunked',
                quality: 'high',
                metadata: {
                    title: track.data?.title || 'Unknown Track',
                    artist: track.data?.user?.name || 'Unknown Artist',
                    duration: track.data?.duration || 0
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get track metadata: ${errorMessage}`);
            throw new McpError(ErrorCode.InternalError, 'Failed to get track metadata');
        }
    }

    private async getStreamUrl(trackId: string): Promise<string> {
        const cachedUrl = cacheManager.getStreamUrl(trackId);
        if (cachedUrl) {
            return cachedUrl;
        }
        
        try {
            const streamUrl = await this.audiusSdk.tracks.getTrackStreamUrl({ trackId });
            if (streamUrl) {
                const expiresAt = Date.now() + 3600000;
                cacheManager.setStreamUrl(trackId, streamUrl, expiresAt);
                return streamUrl;
            }

            throw new Error('Failed to get stream URL');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get stream URL: ${errorMessage}`);
            throw new McpError(ErrorCode.InternalError, 'Failed to get stream URL');
        }
    }

    private setupStreamHandlers(res: express.Response, sessionId: string) {
        res.on('close', () => this.cleanupStream(sessionId));
        res.on('error', (error) => {
            this.logger.error(`Stream ${sessionId} error: ${error.message}`);
            this.cleanupStream(sessionId);
        });
    }

    private cleanupStream(sessionId: string) {
        const session = this.activeStreams.get(sessionId);
        if (session) {
            clearTimeout(session.timeoutRef);
            this.activeStreams.delete(sessionId);
        }
    }

    private async streamWithBackpressure(
        readStream: ReadableStream,
        res: express.Response,
        sessionId: string
    ) {
        const reader = readStream.getReader();
        
        try {
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                
                if (!res.write(value)) {
                    await new Promise(resolve => res.once('drain', resolve));
                }
                
                const session = this.activeStreams.get(sessionId);
                if (session) {
                    session.bytesStreamed += value.length;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Streaming error: ${errorMessage}`);
            const session = this.activeStreams.get(sessionId);
            if (session) {
                session.errors++;
            }
            throw error;
        } finally {
            reader.releaseLock();
        }
    }

    private setupRoutes() {
        // Player endpoint that serves both the player UI and handles streaming
        this.app.get('/play/:trackId', async (req: express.Request, res: express.Response) => {
            try {
                const { trackId } = req.params;
                this.validateTrackId(trackId);

                const metadata = await this.getStreamMetadata(trackId);
                
                // Send HTML page with embedded audio player
                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${metadata.metadata.title} - ${metadata.metadata.artist}</title>
                        <style>
                            body {
                                margin: 0;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                                background: #000;
                                color: #fff;
                                font-family: Arial, sans-serif;
                            }
                            .player {
                                text-align: center;
                                padding: 20px;
                            }
                            audio {
                                margin: 20px 0;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="player">
                            <h2>${metadata.metadata.title}</h2>
                            <h3>by ${metadata.metadata.artist}</h3>
                            <audio controls autoplay>
                                <source src="/stream/${trackId}" type="${metadata.contentType}">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </body>
                    </html>
                `);
            } catch (error) {
                res.status(500).json({ error: 'Failed to load player' });
            }
        });

        // Stream endpoint that handles the actual audio streaming
        this.app.get('/stream/:trackId', async (req: express.Request, res: express.Response) => {
            const { trackId } = req.params;
            const sessionId = `${trackId}-${Date.now()}`;

            try {
                if (!this.rateLimiter.isAllowed(req.ip || '0.0.0.0')) {
                    res.status(429).send({ error: 'Too many requests' });
                    return;
                }

                this.validateTrackId(trackId);
                const streamUrl = await this.getStreamUrl(trackId);
                const streamOptions = await this.getStreamMetadata(trackId);

                res.setHeader('Content-Type', streamOptions.contentType);
                res.setHeader('Transfer-Encoding', streamOptions.encoding);
                res.setHeader('Cache-Control', 'no-cache');

                const audioResponse = await fetch(streamUrl);
                if (!audioResponse.ok || !audioResponse.body) {
                    throw new Error('Failed to fetch audio stream');
                }

                this.activeStreams.set(sessionId, {
                    trackId,
                    startTime: new Date(),
                    quality: streamOptions.quality,
                    bytesStreamed: 0,
                    errors: 0,
                    timeoutRef: setTimeout(() => this.cleanupStream(sessionId), 3600000)
                });

                this.setupStreamHandlers(res, sessionId);
                await this.streamWithBackpressure(audioResponse.body, res, sessionId);
                res.end();

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Stream ${sessionId} failed: ${errorMessage}`);
                this.cleanupStream(sessionId);
                
                if (!res.headersSent) {
                    res.status(500).send({
                        error: `Streaming failed: ${errorMessage}`
                    });
                }
            }
        });
    }

    public isRunning(): boolean {
        return this.isServerRunning;
    }

    public getPort(): number {
        return this.port;
    }

    public async start(): Promise<void> {
        if (this.isServerRunning) return;

        try {
            await new Promise<void>((resolve, reject) => {
                this.server = this.app.listen(this.port, 'localhost', () => {
                    this.isServerRunning = true;
                    resolve();
                });

                this.server.on('error', (error: NodeJS.ErrnoException) => {
                    if (error.code === 'EADDRINUSE') {
                        this.port++;
                        this.server?.close();
                        this.start().then(resolve).catch(reject);
                    } else {
                        reject(error);
                    }
                });
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new McpError(ErrorCode.InternalError, `Failed to start streaming server: ${errorMessage}`);
        }
    }

    public async stop(): Promise<void> {
        if (!this.isServerRunning) return;

        for (const sessionId of this.activeStreams.keys()) {
            this.cleanupStream(sessionId);
        }

        if (this.server) {
            await new Promise<void>((resolve) => {
                this.server?.close(() => {
                    this.isServerRunning = false;
                    resolve();
                });
            });
            this.server = undefined;
        }
    }
}
