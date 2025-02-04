import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { sdk } from '@audius/sdk';
import { ManagerFactory } from "../managers/manager-factory.js";
import { cacheManager } from "../cache/cache-manager.js";

type AudiusEnvironment = "development" | "staging" | "production";

export interface ServerConfig {
  apiKey: string;
  apiSecret?: string;
  environment?: AudiusEnvironment;
}

export class ServerInstance {
  private static instance: ServerInstance;
  private server: Server;
  private audiusSdk: ReturnType<typeof sdk>;
  private managerFactory: ManagerFactory;

  private constructor(config: ServerConfig) {
    // Initialize Audius SDK
    this.audiusSdk = sdk({
      appName: "mcp-audius",
      apiKey: config.apiKey,
      ...(config.apiSecret && { apiSecret: config.apiSecret }),
      environment: config.environment || "production"
    });

    // Initialize cache manager
    cacheManager.initialize();

    // Initialize manager factory
    this.managerFactory = ManagerFactory.getInstance(this.audiusSdk);

    // Create server instance
    this.server = new Server(
      {
        name: "mcp-audius",
        version: "1.1.6",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    // Set up error handling
    this.setupErrorHandling();
  }

  public static getInstance(config: ServerConfig): ServerInstance {
    if (!ServerInstance.instance) {
      ServerInstance.instance = new ServerInstance(config);
    }
    return ServerInstance.instance;
  }

  private setupErrorHandling(): void {
    this.server.onerror = async (error) => {
      console.error('Server error:', error);
      const streamingManager = this.managerFactory.getStreamingManager();
      await streamingManager.stop().catch(() => {});
      this.managerFactory.destroy();
      cacheManager.destroy();
      process.exit(1);
    };
  }

  public getServer(): Server {
    return this.server;
  }

  public getAudiusSdk(): ReturnType<typeof sdk> {
    return this.audiusSdk;
  }

  public getManagerFactory(): ManagerFactory {
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
    const streamingManager = this.managerFactory.getStreamingManager();
    await streamingManager.stop().catch(() => {});
    await this.server.close();
    this.managerFactory.destroy();
    cacheManager.destroy();
  }
}

export function loadConfig(): ServerConfig {
  // Load environment variables
  config({ path: '.env.local' });

  const API_KEY = process.env.AUDIUS_API_KEY;
  const API_SECRET = process.env.AUDIUS_API_SECRET;

  if (!API_KEY) {
    throw new Error('AUDIUS_API_KEY environment variable is required');
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
