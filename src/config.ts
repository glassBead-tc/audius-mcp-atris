import dotenv from 'dotenv';
import { z } from 'zod';

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
    version: z.string().default('1.0.0'),
  }),
});

// Create configuration object
const createConfig = () => {
  try {
    const config = configSchema.parse({
      audius: {
        apiKey: process.env.AUDIUS_API_KEY,
        apiSecret: process.env.AUDIUS_API_SECRET,
        environment: process.env.AUDIUS_ENVIRONMENT || 'production',
      },
      server: {
        name: process.env.SERVER_NAME || 'audius-mcp',
        version: process.env.SERVER_VERSION || '1.0.0',
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