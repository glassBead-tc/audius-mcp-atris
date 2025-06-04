import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { config } from './config.js';
import { initToolsets, registerResources } from './toolsets/index.js';

// Import resource handlers
import { handleTrackResource } from './resources/tracks.js';
import { handleUserResource } from './resources/users.js';
import { handlePlaylistResource, handleAlbumResource } from './resources/playlists.js';

// Import prompt handlers
import { handleDiscoverMusicPrompt } from './prompts/music-search.js';
import { handleTrackAnalysisPrompt } from './prompts/track-info.js';
import { handleArtistProfilePrompt } from './prompts/artist-profile.js';
import { handleMusicCreationPrompt } from './prompts/music-creation.js';
import { handlePlaylistCreationPrompt } from './prompts/playlist-creation.js';
import { handleMessagingPrompt } from './prompts/messaging.js';
import { handleAnalyticsPrompt } from './prompts/analytics.js';
import { handleBlockchainPrompt } from './prompts/blockchain.js';
import { handleMonetizationPrompt } from './prompts/monetization.js';
import { handleNotificationsPrompt } from './prompts/notifications.js';

/**
 * Create and configure the MCP server
 */
export const createServer = async (options: {
  enabledToolsets?: string[];
  readOnly?: boolean;
  config?: Record<string, any>;
} = {
  enabledToolsets: ['all'],
  readOnly: false
}) => {
  // Apply runtime configuration to AudiusClient if provided
  if (options.config) {
    const { AudiusClient } = await import('./sdk-client.js');
    AudiusClient.setRuntimeConfig(options.config);
  }

  // Initialize server with McpServer
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  });

  // Register Resources
  
  // Track resource
  server.resource(
    'track',
    new ResourceTemplate('audius://track/{id}', { list: undefined }),
    handleTrackResource
  );
  
  // User resource
  server.resource(
    'user',
    new ResourceTemplate('audius://user/{id}', { list: undefined }),
    handleUserResource
  );
  
  // Playlist resource
  server.resource(
    'playlist',
    new ResourceTemplate('audius://playlist/{id}', { list: undefined }),
    handlePlaylistResource
  );
  
  // Album resource
  server.resource(
    'album',
    new ResourceTemplate('audius://album/{id}', { list: undefined }),
    handleAlbumResource
  );

  // Initialize and register toolsets
  const toolsetGroup = initToolsets(
    options.enabledToolsets || ['all'], 
    options.readOnly || false
  );
  
  // Register all enabled tools with the server
  toolsetGroup.registerTools(server);
  
  // Register Prompts
  server.prompt(
    'discover-music',
    { 
      query: z.string(),
      artist: z.string().optional(),
      mood: z.string().optional(),
      bpmRange: z.string().optional(),
      underground: z.string().optional(), // Convert boolean to string
      discoveryMode: z.string().optional() // Convert enum to string
    },
    handleDiscoverMusicPrompt
  );
  
  server.prompt(
    'track-analysis',
    { trackId: z.string() },
    handleTrackAnalysisPrompt
  );
  
  server.prompt(
    'artist-profile',
    { 
      userId: z.string(),
      includeConnections: z.string().optional(), // Convert boolean to string
      includePopularContent: z.string().optional() // Convert boolean to string
    },
    handleArtistProfilePrompt
  );
  
  server.prompt(
    'music-creation',
    { 
      trackTitle: z.string(),
      userId: z.string(), 
      genre: z.string().optional(),
      mood: z.string().optional(),
      creationGoal: z.string().optional() // Convert enum to string
    },
    handleMusicCreationPrompt
  );
  
  server.prompt(
    'playlist-creation',
    { 
      userId: z.string(),
      playlistName: z.string().optional(),
      playlistId: z.string().optional(),
      isAlbum: z.string().optional(), // Convert boolean to string
      genre: z.string().optional(),
      action: z.string().optional() // Convert enum to string
    },
    handlePlaylistCreationPrompt
  );
  
  server.prompt(
    'messaging',
    { 
      userId: z.string(), 
      recipientId: z.string().optional(),
      initialMessage: z.string().optional(),
      purpose: z.string().optional() // Convert enum to string
    },
    handleMessagingPrompt
  );
  
  server.prompt(
    'analytics',
    { 
      userId: z.string().optional(), 
      trackId: z.string().optional(),
      insightType: z.string().optional(), // Convert enum to string
      timePeriod: z.string().optional() // Convert enum to string
    },
    handleAnalyticsPrompt
  );
  
  server.prompt(
    'blockchain',
    { 
      userId: z.string().optional(),
      walletAddress: z.string().optional(),
      blockchain: z.string().optional(), // Convert enum to string
      focus: z.string().optional() // Convert enum to string
    },
    handleBlockchainPrompt
  );
  
  server.prompt(
    'monetization',
    { 
      userId: z.string().optional(),
      trackId: z.string().optional(),
      walletAddress: z.string().optional(),
      monetizationType: z.string().optional() // Convert enum to string
    },
    handleMonetizationPrompt
  );
  
  server.prompt(
    'notifications',
    { 
      userId: z.string(),
      notificationType: z.string().optional(),
      limit: z.string().optional(),
      markAsRead: z.string().optional()
    },
    handleNotificationsPrompt
  );

  return server;
};