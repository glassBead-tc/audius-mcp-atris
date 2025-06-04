import { z } from 'zod';

export const AudiusConfigSchema = z.object({
  // Core Audius configuration
  apiHost: z.string().url().optional().default('https://discoveryprovider.audius.co'),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  appName: z.string().default('Atris MCP'),
  environment: z.enum(['production', 'staging', 'development']).default('production'),
  
  // Server configuration
  readOnly: z.boolean().default(false),
  enabledToolsets: z.array(z.enum([
    'tracks', 'users', 'playlists', 'albums', 'search', 
    'social', 'comments', 'track-management', 'playlist-management',
    'messaging', 'analytics', 'blockchain', 'monetization', 
    'notifications', 'core', 'oauth', 'all'
  ])).default(['all']),
  
  // Session configuration (for stateful mode)
  sessionConfig: z.object({
    maxSessions: z.number().default(1000),
    sessionTimeout: z.number().optional(), // milliseconds
  }).optional(),
});

export type AudiusConfig = z.infer<typeof AudiusConfigSchema>;