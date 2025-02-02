import { sdk } from '@audius/sdk';
import express from 'express';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { cacheManager } from './cache/cache-manager.js';

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
    private app: express.Application;
    private logger: Console;
    private activeStreams: Map<string, StreamSession>;
    private rateLimiter: RateLimiter;

    constructor(audiusSdk: ReturnType<typeof sdk>, logger: Console = console) {
        this.audiusSdk = audiusSdk;
        this.logger = logger;
        this.app = express();
        this.activeStreams = new Map();
        this.rateLimiter = new RateLimiter();

        // Cleanup inactive streams and cache every hour
        setInterval(() => this.cleanup(), 3600000);

        this.setupRoutes();
    }

    private validateTrackId(trackId: string): void {
        if (!trackId?.match(/^[0-9a-fA-F]+$/)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid track ID format');
        }
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
            const streamUrl = await this.audiusSdk.tracks.getTrackStreamUrl({ trackId });
            if (!streamUrl) {
                throw new Error('No stream URL returned from Audius API');
            }
            
            // Cache the URL with 1 hour expiration
            const expiresAt = Date.now() + 3600000;
            cacheManager.setStreamUrl(trackId, streamUrl, expiresAt);
            
            return streamUrl;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get stream URL: ${errorMessage}`);
            throw new McpError(ErrorCode.InternalError, 'Failed to get stream URL');
        }
    }

    private setupStreamHandlers(res: express.Response, sessionId: string) {
        res.on('close', () => {
            this.logger.info(`Stream ${sessionId} closed by client`);
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
            this.logger.info(`Cleaned up stream ${sessionId}`);
        }
    }

    private cleanup() {
        // Cleanup rate limiter
        this.rateLimiter.cleanup();

        // Log cleanup stats
        const cacheStats = cacheManager.getStreamUrlCacheStats();
        this.logger.info(`Cleanup complete. Active streams: ${this.activeStreams.size}, Cache entries: ${cacheStats.size}`);
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

                // Validate track ID
                this.validateTrackId(trackId);

                // Get stream metadata
                const streamOptions = await this.getStreamMetadata(trackId);

                // Set headers
                res.setHeader('Content-Type', streamOptions.contentType);
                res.setHeader('Transfer-Encoding', streamOptions.encoding);
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                // Enable CORS
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
                res.setHeader('Access-Control-Expose-Headers', 'Content-Range');

                // Handle range requests
                const range = req.headers.range;
                if (range && typeof range === 'string') {
                    // TODO: Implement range request handling
                    res.status(501).send({ error: 'Range requests not yet implemented' });
                    return;
                }

                // Get stream URL
                const streamUrl = await this.getStreamUrl(trackId);

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

                // Stream with backpressure handling
                await this.streamWithBackpressure(audioResponse.body, res, sessionId);

                res.end();
                this.logger.info(`Stream ${sessionId} completed successfully`);

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
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
            res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
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
    async start(port: number = 3000): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                this.app.listen(port, () => {
                    this.logger.info(`Streaming server running on port ${port}`);
                    resolve();
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to start streaming server: ${errorMessage}`);
                reject(error);
            }
        });
    }

    /**
     * Stop the streaming server
     */
    async stop(): Promise<void> {
        // Cleanup all active streams
        for (const sessionId of this.activeStreams.keys()) {
            this.cleanupStream(sessionId);
        }

        
        this.logger.info('Streaming server stopped');
    }
}
