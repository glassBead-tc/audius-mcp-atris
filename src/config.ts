import dotenv from 'dotenv';
import { z } from 'zod';

// Latest MCP protocol version supported by this server
export const LATEST_PROTOCOL_VERSION = '2025-06-18';

// Load environment variables
dotenv.config();

// Define configuration schema
const configSchema = z.object({
  audius: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    environment: z.enum(['production', 'staging', 'development']).default('production'),
  }),
  server: z.object({
    name: z.string().default('audius-mcp'),
    version: z.string().default('2.3.0'),
  }),
});

// Create configuration object
const createConfig = () => {
  try {
    // Use fixed values for server name and version (matching package.json)
    const SERVER_NAME = 'audius-mcp';
    const SERVER_VERSION = '2.3.0';
    
    const config = configSchema.parse({
      audius: {
        apiKey: process.env.AUDIUS_API_KEY,
        apiSecret: process.env.AUDIUS_API_SECRET,
        // Default to development if environment var is not provided or is invalid
        environment: (process.env.AUDIUS_ENVIRONMENT && 
                     ['production', 'staging', 'development'].includes(process.env.AUDIUS_ENVIRONMENT)) 
                     ? process.env.AUDIUS_ENVIRONMENT : 'development',
      },
      server: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    });
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration error:', error.errors);
    } else {
      console.error('Unexpected configuration error:', error);
    }
    throw error;
  }
};

// Export the configuration
export type Config = z.infer<typeof configSchema>;
export const config = createConfig();