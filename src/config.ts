import dotenv from 'dotenv';
import { z } from 'zod';
import { AudiusConfig, AudiusConfigSchema } from './schemas/config.schema.js';

// Load environment variables
dotenv.config();

// Legacy configuration schema for backward compatibility
const legacyConfigSchema = z.object({
  audius: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    environment: z.enum(['production', 'staging', 'development']).default('production'),
  }),
  server: z.object({
    name: z.string().default('audius-mcp'),
    version: z.string().default('2.0.1'),
  }),
});

// Create configuration from environment variables
const createConfigFromEnv = (): AudiusConfig => {
  const SERVER_NAME = 'audius-mcp';
  const SERVER_VERSION = '2.0.1';
  
  // Map environment variables to the new schema
  return AudiusConfigSchema.parse({
    apiKey: process.env.AUDIUS_API_KEY,
    apiSecret: process.env.AUDIUS_API_SECRET,
    appName: SERVER_NAME,
    environment: (process.env.AUDIUS_ENVIRONMENT && 
                 ['production', 'staging', 'development'].includes(process.env.AUDIUS_ENVIRONMENT)) 
                 ? process.env.AUDIUS_ENVIRONMENT : 'development',
    apiHost: process.env.AUDIUS_API_HOST,
    readOnly: process.env.READ_ONLY === 'true',
    enabledToolsets: process.env.ENABLED_TOOLSETS?.split(',') || ['all'],
  });
};

// Merge runtime config with environment config
export const mergeConfig = (envConfig: AudiusConfig, runtimeConfig?: Partial<AudiusConfig>): AudiusConfig => {
  if (!runtimeConfig) return envConfig;
  
  return AudiusConfigSchema.parse({
    ...envConfig,
    ...runtimeConfig,
    // Special handling for arrays to ensure proper merging
    enabledToolsets: runtimeConfig.enabledToolsets || envConfig.enabledToolsets,
  });
};

// Export the legacy configuration for backward compatibility
export type Config = z.infer<typeof legacyConfigSchema>;
export const config = (() => {
  try {
    const audiusConfig = createConfigFromEnv();
    // Convert to legacy format
    return legacyConfigSchema.parse({
      audius: {
        apiKey: audiusConfig.apiKey,
        apiSecret: audiusConfig.apiSecret,
        environment: audiusConfig.environment,
      },
      server: {
        name: audiusConfig.appName,
        version: '2.0.1',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration error:', error.errors);
    } else {
      console.error('Unexpected configuration error:', error);
    }
    throw error;
  }
})();

// Export new configuration functions
export { AudiusConfig, AudiusConfigSchema };
export const getEnvConfig = createConfigFromEnv;