import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AudiusConfig } from '../schemas/config.schema.js';

// Import prompt handlers
import { handleDiscoverMusicPrompt } from '../prompts/music-search.js';
import { handleTrackAnalysisPrompt } from '../prompts/track-info.js';
import { handleArtistProfilePrompt } from '../prompts/artist-profile.js';
import { handleMusicCreationPrompt } from '../prompts/music-creation.js';
import { handlePlaylistCreationPrompt } from '../prompts/playlist-creation.js';
import { handleMessagingPrompt } from '../prompts/messaging.js';
import { handleAnalyticsPrompt } from '../prompts/analytics.js';
import { handleBlockchainPrompt } from '../prompts/blockchain.js';
import { handleMonetizationPrompt } from '../prompts/monetization.js';
import { handleNotificationsPrompt } from '../prompts/notifications.js';
import { handleToolsetsGuidePrompt } from '../prompts/toolsets-guide.js';

/**
 * Register all prompts with the MCP server
 */
export function registerPrompts(server: McpServer, config: AudiusConfig): void {
  // System-level prompts (no parameters required)
  server.prompt(
    'toolsets-guide',
    {},
    handleToolsetsGuidePrompt
  );
  
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
    {
      trackId: z.string(),
      detailLevel: z.string().optional() // Convert enum to string
    },
    handleTrackAnalysisPrompt
  );
  
  server.prompt(
    'artist-profile',
    {
      userId: z.string(),
      focusArea: z.string().optional() // Convert enum to string
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
      strategy: z.string().optional() // Convert enum to string
    },
    handlePlaylistCreationPrompt
  );
  
  server.prompt(
    'messaging',
    {
      userId: z.string(),
      action: z.string().optional() // Convert enum to string
    },
    handleMessagingPrompt
  );
  
  server.prompt(
    'analytics',
    {
      userId: z.string().optional(),
      reportType: z.string().optional() // Convert enum to string
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
      userId: z.string(),
      strategy: z.string().optional() // Convert enum to string
    },
    handleMonetizationPrompt
  );
  
  server.prompt(
    'notifications',
    {
      userId: z.string(),
      filter: z.string().optional() // Convert enum to string
    },
    handleNotificationsPrompt
  );
}