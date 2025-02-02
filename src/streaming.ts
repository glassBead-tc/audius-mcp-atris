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
 * Manages audio streaming for the Audius MCP server
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

    constructor(audiusSdk: ReturnType<typeof sdk>, walletManager: WalletManager, logger?: Console) {
        this.audiusSdk = audiusSdk;
        this.walletManager = walletManager;
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
                // Only log critical errors that could affect MCP operation
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
            'Access-Control-Max-Age': '86400' // 24 hours
        };

        // Configure CORS middleware
        this.app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            } else {
                res.setHeader('Access-Control-Allow-Origin', '*');
            }
            
            // Apply common CORS headers
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

    private parseRangeHeader(range: string): RangeRequest {
        // Remove 'bytes=' prefix and split on hyphen
        const parts = range.replace(/bytes=/, '').split('-');
        if (parts.length !== 2) {
            throw new Error('Invalid range header format');
        }

        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;
        
        if (isNaN(start)) {
            throw new Error('Invalid range start value');
        }
        
        if (end !== undefined) {
            if (isNaN(end)) {
                throw new Error('Invalid range end value');
            }
            if (start > end) {
                throw new Error('Range start must be less than end');
            }
        }

        return { start, end };
    }

    private async getStreamMetadata(trackId: string): Promise<StreamOptions> {
        try {
            const [track, streamData] = await Promise.all([
                this.audiusSdk.tracks.getTrack({ trackId }),
                this.audiusSdk.tracks.getTrackStreamUrl({ trackId })
            ]);
            
            // Default to audio/mpeg if content type not available
            const contentType = 'audio/mpeg';
            
            // Extract track metadata from response
            const metadata = {
                title: track.data?.title || 'Unknown Track',
                artist: track.data?.user?.name || 'Unknown Artist',
                duration: track.data?.duration || 0
            };
            
            return {
                contentType,
                encoding: 'chunked',
                quality: 'high',
                metadata
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get track metadata: ${errorMessage}`);
            throw new McpError(ErrorCode.InternalError, 'Failed to get track metadata');
        }
    }

    private async getStreamUrl(trackId: string): Promise<string> {
        // Check cache first
        const cachedUrl = cacheManager.getStreamUrl(trackId);
        if (cachedUrl) {
            return cachedUrl;
        }
        
        try {
            // First try to get the stream URL without authentication
            const streamUrl = await this.audiusSdk.tracks.getTrackStreamUrl({ trackId }).catch(() => null);
            
            if (streamUrl) {
                // Cache the URL with 1 hour expiration
                const expiresAt = Date.now() + 3600000;
                cacheManager.setStreamUrl(trackId, streamUrl, expiresAt);
                return streamUrl;
            }

            // If that fails, try to get the track details to check if it exists
            const trackDetails = await this.audiusSdk.tracks.getTrack({ trackId }).catch(() => null);
            
            if (!trackDetails?.data) {
                throw new Error('Track not found');
            }

            // For public tracks, use the default Audius API endpoint
            // This is a fallback in case the SDK stream URL fails
            const defaultEndpoint = process.env.AUDIUS_API_ENDPOINT || 'https://discovery-us-01.audius.openplayer.org';
            const directUrl = `${defaultEndpoint}/v1/tracks/${trackId}/stream`;
            
            // Cache the direct URL
            cacheManager.setStreamUrl(trackId, directUrl, Date.now() + 3600000);
            return directUrl;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get stream URL: ${errorMessage}`);
            throw new McpError(ErrorCode.InternalError, 'Failed to get stream URL');
        }
    }

    private setupStreamHandlers(res: express.Response, sessionId: string) {
        res.on('close', () => {
            // Remove non-critical log
            this.cleanupStream(sessionId);
        });
        
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
            // Remove non-critical log
        }
    }

    private cleanup() {
        // Cleanup rate limiter
        this.rateLimiter.cleanup();

        // Log cleanup stats
        const cacheStats = cacheManager.getStreamUrlCacheStats();
        // Remove non-critical log
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
                
                // Handle backpressure
                if (!res.write(value)) {
                    await new Promise(resolve => res.once('drain', resolve));
                }
                
                // Update bytes streamed
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

    private monitorStreamHealth(sessionId: string): StreamHealth | null {
        const session = this.activeStreams.get(sessionId);
        if (!session) return null;
        
        const duration = Date.now() - session.startTime.getTime();
        return {
            bytesPerSecond: session.bytesStreamed / (duration / 1000),
            totalBytes: session.bytesStreamed,
            duration,
            errors: session.errors
        };
    }

    private async handleRPCRequest(method: string, params: unknown[]) {
        return this.walletManager.handleRPCRequest(method, params);
    }

    private setupRoutes() {
        this.app.get('/stream/:trackId', async (req: express.Request, res: express.Response) => {
            const { trackId } = req.params;
            const sessionId = `${trackId}-${Date.now()}`;

            try {
                // Rate limiting
                const clientIp = req.ip || '0.0.0.0';
                if (!this.rateLimiter.isAllowed(clientIp)) {
                    res.status(429).send({ error: 'Too many requests' });
                    return;
                }

                // Handle RPC requests if present
                const rpcMethod = req.query.rpc_method as string;
                if (rpcMethod) {
                    try {
                        const rpcParams = JSON.parse(req.query.rpc_params as string || '[]');
                        const result = await this.handleRPCRequest(rpcMethod, rpcParams);
                        res.json({ result });
                        return;
                    } catch (error) {
                        res.status(400).json({
                            error: 'RPC request failed',
                            details: error instanceof Error ? error.message : String(error)
                        });
                        return;
                    }
                }

                // Validate track ID
                this.validateTrackId(trackId);

                // Get stream metadata
                const streamOptions = await this.getStreamMetadata(trackId);

                // Get stream URL
                const streamUrl = await this.getStreamUrl(trackId);

                // Set headers
                res.setHeader('Content-Type', streamOptions.contentType);
                res.setHeader('Transfer-Encoding', streamOptions.encoding);
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('Accept-Ranges', 'bytes');

                // Handle range requests
                const range = req.headers.range;
                if (range && typeof range === 'string') {
                    try {
                        const { start, end } = this.parseRangeHeader(range);
                        const rangeHeader = end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`;

                        const audioResponse = await fetch(streamUrl, {
                            headers: { Range: rangeHeader }
                        });
                        
                        if (!audioResponse.ok || !audioResponse.body) {
                            throw new Error('Failed to fetch audio stream');
                        }

                        // Ensure we have valid Content-Range header
                        const contentRange = audioResponse.headers.get('Content-Range');
                        if (!contentRange) {
                            throw new Error('Missing Content-Range header from upstream');
                        }

                        res.status(206);
                        res.setHeader('Content-Range', contentRange);
                        res.setHeader('Content-Length', audioResponse.headers.get('Content-Length') || '');

                        await this.streamWithBackpressure(audioResponse.body, res, sessionId);
                        return;
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        this.logger.error(`Range request failed: ${errorMessage}`);
                        res.status(416).send({ 
                            error: 'Invalid range request',
                            details: error instanceof Error ? error.message : 'Unknown error'
                        });
                        return;
                    }
                }

                // Create stream session
                this.activeStreams.set(sessionId, {
                    trackId,
                    startTime: new Date(),
                    quality: streamOptions.quality,
                    bytesStreamed: 0,
                    errors: 0,
                    timeoutRef: setTimeout(() => this.cleanupStream(sessionId), 3600000) // 1 hour timeout
                });

                // Setup stream handlers
                this.setupStreamHandlers(res, sessionId);

                // Fetch and stream the audio
                const audioResponse = await fetch(streamUrl);
                if (!audioResponse.ok || !audioResponse.body) {
                    throw new Error('Failed to fetch audio stream');
                }

                // Set Content-Length if available
                const contentLength = audioResponse.headers.get('Content-Length');
                if (contentLength) {
                    res.setHeader('Content-Length', contentLength);
                }

                // Stream with backpressure handling
                await this.streamWithBackpressure(audioResponse.body, res, sessionId);

                res.end();
                // Stream completed successfully

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Stream ${sessionId} failed: ${errorMessage}`);
                this.cleanupStream(sessionId);
                
                if (!res.headersSent) {
                    res.status(500).send({
                        error: `Streaming failed: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            }
        });

        // Handle OPTIONS requests for CORS
        this.app.options('/stream/:trackId', (req: express.Request, res: express.Response) => {
            res.status(204).end();
        });

        // Health check endpoint
        this.app.get('/stream/health/:sessionId', (req: express.Request, res: express.Response) => {
            const health = this.monitorStreamHealth(req.params.sessionId);
            if (health) {
                res.json(health);
            } else {
                res.status(404).send({ error: 'Stream session not found' });
            }
        });
    }

    /**
     * Start the streaming server
     */
    async start(port: number = parseInt(process.env.STREAMING_PORT || '3333')): Promise<void> {
        try {
            // If server is already running, stop it first
            if (this.server) {
                await this.stop();
            }

            // Start cleanup interval
            this.cleanupInterval = setInterval(() => this.cleanup(), 3600000);

            // Try to find an available port starting from the specified port
            let currentPort = port;
            const maxRetries = 10;
            let lastError: Error | undefined;
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        const server = this.app.listen(currentPort, 'localhost');
                        
                        server.once('listening', () => {
                            this.server = server;
                            // Remove non-critical log
                            resolve();
                        });

                        server.once('error', (error: NodeJS.ErrnoException) => {
                            if (error.code === 'EADDRINUSE') {
                                // Remove non-critical log
                                currentPort++;
                                server.close();
                                lastError = error;
                                reject(new Error('Port in use'));
                            } else {
                                lastError = error;
                                reject(error);
                            }
                        });
                    });
                    // If we get here, the server started successfully
                    return;
                } catch (error) {
                    if (attempt === maxRetries - 1) {
                        throw new Error(`Failed to find available port after ${maxRetries} attempts. Last error: ${lastError?.message}`);
                    }
                    // Continue to next attempt if port was in use
                    if (error instanceof Error && error.message === 'Port in use') {
                        continue;
                    }
                    throw error;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to start streaming server: ${errorMessage}`);
            throw new McpError(ErrorCode.InternalError, `Failed to start streaming server: ${errorMessage}`);
        }
    }

    /**
     * Stop the streaming server
     */
    async stop(): Promise<void> {
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        // Cleanup all active streams
        for (const sessionId of this.activeStreams.keys()) {
            this.cleanupStream(sessionId);
        }

        // Stop the HTTP server if it's running
        if (this.server) {
            await new Promise<void>((resolve, reject) => {
                // Force close any existing connections
                const connections = new Set<any>();
                
                this.server!.on('connection', (conn) => {
                    connections.add(conn);
                    conn.on('close', () => connections.delete(conn));
                });

                // Attempt graceful shutdown
                this.server!.close((err) => {
                    if (err) {
                        this.logger.error(`Error stopping server: ${err.message}`);
                        // Force close remaining connections
                        connections.forEach(conn => {
                            try {
                                conn.destroy();
                            } catch (e) {
                                this.logger.error(`Error destroying connection: ${e instanceof Error ? e.message : String(e)}`);
                            }
                        });
                        reject(err);
                    } else {
                        // Remove non-critical log
                        resolve();
                    }
                });

                // Set a timeout for graceful shutdown
                setTimeout(() => {
                    // Remove non-critical log
                    connections.forEach(conn => {
                        try {
                            conn.destroy();
                        } catch (e) {
                            this.logger.error(`Error destroying connection: ${e instanceof Error ? e.message : String(e)}`);
                        }
                    });
                }, 5000);
            });
            this.server = undefined;
        }
    }
}
