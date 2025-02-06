import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { sdk } from '@audius/sdk';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import * as fs from 'fs/promises';
import { createReadStream, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { ManagerFactory } from "../managers/manager-factory.js";
import { cacheManager } from "../cache/cache-manager.js";
import { Server as HttpServer } from 'http';
import { getAllTestTracks, getTestTrack, isTestTrackId } from '../config/test-tracks.js';

type AudiusEnvironment = "development" | "staging" | "production";

export interface ServerConfig {
  apiKey: string;
  apiSecret?: string;
  environment?: AudiusEnvironment;
}

interface StreamParams {
  trackId: string;
}

export class ServerInstance {
  private static instance: ServerInstance;
  private server: Server;
  private expressApp: express.Application;
  private audiusSdk: ReturnType<typeof sdk> | null = null;
  private managerFactory: ManagerFactory | null = null;
  private httpServer: HttpServer;
  private isTestMode = false;

  private constructor(config: ServerConfig) {
    // Initialize test mode based on API key
    this.isTestMode = !config.apiKey || config.apiKey === 'test_key';
    console.log(this.isTestMode ? 'Running in test mode' : 'Running in production mode');

    // Initialize SDK and manager factory if not in test mode
    if (!this.isTestMode) {
      try {
        console.log('Initializing Audius SDK...');
        this.audiusSdk = sdk({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          env: config.environment || 'production'
        });
        
        if (this.audiusSdk) {
          console.log('Creating manager factory...');
          this.managerFactory = new ManagerFactory(this.audiusSdk);
        }
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
        this.isTestMode = true;
        console.log('Falling back to test mode');
      }
    }

    // Create server instance first
    this.server = new Server(
      {
        name: "mcp-audius",
        version: "1.3.3",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {
            listPrompts: true,
            getPrompt: true
          },
        },
      }
    );

    // Initialize Express and configure static file serving
    this.expressApp = express();
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const buildDir = path.join(process.cwd(), 'build');
    const rootDir = process.cwd();
    console.log('Serving static files from:', buildDir);
    
    // Enhanced debug middleware for all requests
    this.expressApp.use((req, res, next) => {
      console.log(`\n=== [${Date.now()}] Request ===`);
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Physical paths:');
      console.log('- Build dir:', path.join(buildDir, req.url));
      console.log('- Root dir:', path.join(rootDir, req.url));
      next();
    });

    // Diagnostic endpoint for file paths
    this.expressApp.get('/debug/file-path/:filename', async (req, res) => {
      const possiblePaths = [
        path.join(buildDir, req.params.filename),
        path.join(buildDir, 'test-audio', req.params.filename),
        path.join(rootDir, 'test-audio', req.params.filename)
      ];
      
      const results = await Promise.all(possiblePaths.map(async (p) => {
        try {
          const stat = await fs.stat(p);
          return {
            path: p,
            exists: true,
            size: stat.size,
            readable: true
          };
        } catch (error) {
          return {
            path: p,
            exists: false,
            error: (error as Error).message
          };
        }
      }));

      res.json({
        requestPath: req.path,
        results
      });
    });

    // Manual streaming endpoint for testing
    this.expressApp.get('/debug/stream/:filename', async (req, res) => {
      console.log('\n=== Debug Stream Request ===');
      const filePath = path.join(buildDir, 'test-audio', req.params.filename);
      console.log('Attempting to stream:', filePath);
      
      try {
        const stat = await fs.stat(filePath);
        console.log('File stats:', stat);
        
        // Handle range request
        const range = req.headers.range;
        if (range) {
          console.log('Range header:', range);
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          const chunksize = (end - start) + 1;
          
          res.set({
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'audio/mpeg'
          });
          res.status(206);
          
          const stream = createReadStream(filePath, { start, end });
          stream.pipe(res);
        } else {
          res.set({
            'Content-Length': stat.size,
            'Content-Type': 'audio/mpeg',
            'Accept-Ranges': 'bytes'
          });
          const stream = createReadStream(filePath);
          stream.pipe(res);
        }
      } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Enhanced static file serving
    this.expressApp.use(express.static(buildDir, {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.mp3')) {
          const stat = existsSync(filePath) ? statSync(filePath) : null;
          res.set({
            'Content-Type': 'audio/mpeg',
            'Accept-Ranges': 'bytes',
            'X-File-Size': stat ? stat.size.toString() : 'unknown',
            'X-File-Path': filePath
          });
          console.log('Serving audio file:', {
            path: filePath,
            size: stat ? stat.size : 'unknown',
            headers: res.getHeaders()
          });
        }
      }
    }));

    // Serve from test-audio directory as fallback
    this.expressApp.use('/test-audio', express.static(path.join(rootDir, 'test-audio'), {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.mp3')) {
          const stat = existsSync(filePath) ? statSync(filePath) : null;
          res.set({
            'Content-Type': 'audio/mpeg',
            'Accept-Ranges': 'bytes',
            'X-File-Size': stat ? stat.size.toString() : 'unknown',
            'X-File-Path': filePath
          });
          console.log('Serving audio file from test-audio:', {
            path: filePath,
            size: stat ? stat.size : 'unknown',
            headers: res.getHeaders()
          });
        }
      }
    }));

    // Error handler for 404s
    this.expressApp.use((req, res, next) => {
      if (req.url.startsWith('/test-audio')) {
        console.error('Audio file not found:', req.url);
        res.status(404).json({ error: 'Audio file not found' });
      } else {
        next();
      }
    });
    this.expressApp.get('/', (_req: Request, res: Response) => {
      const playerPath = path.join(buildDir, 'player.html');
      console.log('Serving player from:', playerPath);
      res.sendFile(playerPath);
    });
    

    // Set up API routes
    this.setupApiRoutes();
    
    // Set up error handling
    this.setupErrorHandling();
    
    // Start HTTP server
    this.httpServer = this.expressApp.listen(3000, () => {
      console.log('HTTP server running on port 3000');
    });
  }

  public static getInstance(config: ServerConfig): ServerInstance {
    if (!ServerInstance.instance) {
      ServerInstance.instance = new ServerInstance(config);
    }
    return ServerInstance.instance;
  }

  private setupApiRoutes(): void {
    // Add logging middleware
    this.expressApp.use((req: Request, res: Response, next: NextFunction) => {
      console.log('\n=== Request Details ===');
      console.log('Working Directory:', process.cwd());
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
      console.log('Headers:', req.headers);
      console.log('Query:', req.query);
      console.log('Params:', req.params);
      console.log('=== End Request Details ===\n');
      next();
    });

    // Get tracks endpoint
    const getTracksHandler: RequestHandler = async (_req, res) => {
      try {
        if (!this.isTestMode && this.managerFactory) {
          const trackHandler = this.managerFactory.getTrackHandlers();
          console.log('Fetching tracks...');
          try {
            const response = await trackHandler.searchTracks({ query: '' }) as { content: Array<{ type: string, text: string }> };
            console.log('Search response:', response);
            const tracks = JSON.parse(response.content[0].text);
            
            // Transform the response to match our player's expected format
            const formattedTracks = tracks.data.map((track: any) => ({
              id: track.id,
              title: track.title,
              artist: track.user.name,
              url: `/api/tracks/${track.id}/stream`
            }));
            res.json(formattedTracks);
          } catch (apiError) {
            console.log('Failed to fetch from Audius API, using test data');
            const testTracks = getAllTestTracks().map(track => ({
              id: track.id,
              title: track.title,
              artist: track.artist,
              url: track.url
            }));
            res.json(testTracks);
          }
        } else {
          console.log('Running in test mode, using test data');
          const testTracks = getAllTestTracks().map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist,
            url: track.url
          }));
          console.log('Returning test tracks:', JSON.stringify(testTracks, null, 2));
          res.json(testTracks);
        }
        
      } catch (error) {
        console.error('Error fetching tracks:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
      }
    };

    // Stream track endpoint
    const streamTrackHandler: RequestHandler<StreamParams> = async (req, res, next) => {
      try {
        // Log detailed request information
        console.log('\n=== Stream Request Details ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Track ID:', req.params.trackId);
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Query Parameters:', req.query);
        console.log('\nRequest Headers:');
        Object.entries(req.headers).forEach(([key, value]) => {
          console.log(`${key}:`, value);
        });

        // For test tracks, serve the local file
        if (isTestTrackId(req.params.trackId)) {
          console.log('Track identified as test track');
          const testTrack = getTestTrack(req.params.trackId);
          if (testTrack) {
            console.log('\nTest Track Details:');
            console.log('Found test track:', JSON.stringify(testTrack, null, 2));
            const filename = testTrack.id === 'test-track-1' ? 'monkeys-spinning-monkeys.mp3' : 'the-builder.mp3';
            const audioPath = path.join(process.cwd(), 'test-audio', filename);
            console.log('\nResponse Details:');
            console.log('File Path:', audioPath);
            console.log('Content-Type:', 'audio/mpeg');

            // Construct the static file URL
            const staticUrl = `/test-audio/${filename}`;
            console.log('\nResponse Details:');
            console.log('Static URL:', staticUrl);

            // Return the URL in JSON response
            const response = {
              url: staticUrl,
              trackId: testTrack.id,
              title: testTrack.title,
              artist: testTrack.artist
            };
            console.log('Response:', JSON.stringify(response, null, 2));
            res.json(response);

            console.log('\nResponse Finished');
            console.log('=== End Stream Request ===\n');
            return;
          } else {
            console.error('Test track not found in configuration');
          }
        } else {
          console.log('Track is not a test track');
        }
        
        if (this.isTestMode || !this.managerFactory) {
          res.status(404).json({ error: 'Stream not found' });
          return;
        }

        const trackHandler = this.managerFactory.getTrackHandlers();
        console.log('Streaming track:', req.params.trackId);
        const response = await trackHandler.getTrackStream({ trackId: req.params.trackId }) as { content: Array<{ type: string, text: string }>, command?: string };
        console.log('Stream response:', response);
        const streamUrl = response.command?.split(' ')[1];
        if (streamUrl) {
          res.redirect(streamUrl);
        } else {
          res.status(404).json({ error: 'Stream not found' });
        }
      } catch (error) {
        console.error('Error streaming track:', error);
        res.status(500).json({ error: 'Failed to stream track' });
      }
    };

    this.expressApp.get('/api/tracks', getTracksHandler);
    this.expressApp.get('/api/tracks/:trackId/stream', streamTrackHandler);
  }

  private setupErrorHandling(): void {
    this.server.onerror = async (error) => {
      console.error('Server error:', error);
      if (this.managerFactory) {
        const streamingManager = this.managerFactory.getStreamingManager();
        await streamingManager.stop().catch(() => {});
        this.managerFactory.destroy();
      }
      cacheManager.destroy();
      process.exit(1);
    };
  }

  public getServer(): Server {
    return this.server;
  }

  public getAudiusSdk(): ReturnType<typeof sdk> | null {
    return this.audiusSdk;
  }

  public getManagerFactory(): ManagerFactory | null {
    return this.managerFactory;
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport).catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
  }

  public async stop(): Promise<void> {
    if (this.managerFactory) {
      const streamingManager = this.managerFactory.getStreamingManager();
      await streamingManager.stop().catch(() => {});
      this.managerFactory.destroy();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
    await this.server.close();
    cacheManager.destroy();
  }
}

export function loadConfig(): ServerConfig {
  // Load environment variables
  config({ path: '.env.local' });

  const API_KEY = process.env.AUDIUS_API_KEY;
  const API_SECRET = process.env.AUDIUS_API_SECRET;

  if (!API_KEY) {
    console.log('No API key found, running in test mode');
    return {
      apiKey: 'test_key',
      environment: 'development'
    };
  }

  return {
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    environment: (process.env.AUDIUS_ENVIRONMENT || "production") as AudiusEnvironment
  };
}

// Handle process signals
function setupProcessHandlers(server: ServerInstance): void {
  const cleanup = async () => {
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

export async function initializeServer(): Promise<ServerInstance> {
  const config = loadConfig();
  const server = ServerInstance.getInstance(config);
  setupProcessHandlers(server);
  await server.start();
  return server;
}
