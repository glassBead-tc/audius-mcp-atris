import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { 
  getTrack, getTrackSchema,
  searchTracks, searchTracksSchema,
  getTrendingTracks, getTrendingTracksSchema,
  getTrackComments, getTrackCommentsSchema
} from './tools/tracks.js';
import {
  getUser, getUserSchema,
  searchUsers, searchUsersSchema,
  getUserTracks, getUserTracksSchema
} from './tools/users.js';
import {
  getPlaylist, getPlaylistSchema,
  getAlbum, getAlbumSchema
} from './tools/playlists.js';
import {
  searchAll, searchAllSchema
} from './tools/search.js';
import {
  trackResourceTemplate, handleTrackResource
} from './resources/tracks.js';
import {
  userResourceTemplate, handleUserResource
} from './resources/users.js';
import {
  playlistResourceTemplate, handlePlaylistResource,
  albumResourceTemplate, handleAlbumResource
} from './resources/playlists.js';
import {
  discoverMusicPrompt, handleDiscoverMusicPrompt
} from './prompts/music-search.js';
import {
  trackAnalysisPrompt, handleTrackAnalysisPrompt
} from './prompts/track-info.js';

/**
 * Create and configure the MCP server
 */
export const createServer = () => {
  // Initialize server with configuration
  const server = new Server({
    name: config.server.name,
    version: config.server.version,
  }, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  });

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Track tools
        { name: 'get-track', description: 'Get details for a specific track', inputSchema: getTrackSchema },
        { name: 'search-tracks', description: 'Search for tracks by keyword', inputSchema: searchTracksSchema },
        { name: 'get-trending-tracks', description: 'Get trending tracks on Audius', inputSchema: getTrendingTracksSchema },
        { name: 'get-track-comments', description: 'Get comments for a specific track', inputSchema: getTrackCommentsSchema },
        
        // User tools
        { name: 'get-user', description: 'Get details for a specific user', inputSchema: getUserSchema },
        { name: 'search-users', description: 'Search for users by keyword', inputSchema: searchUsersSchema },
        { name: 'get-user-tracks', description: 'Get tracks uploaded by a specific user', inputSchema: getUserTracksSchema },
        
        // Playlist & Album tools
        { name: 'get-playlist', description: 'Get details for a specific playlist', inputSchema: getPlaylistSchema },
        { name: 'get-album', description: 'Get details for a specific album', inputSchema: getAlbumSchema },
        
        // Search tools
        { name: 'search-all', description: 'Search across all content types on Audius', inputSchema: searchAllSchema },
      ]
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      // Track tools
      case 'get-track':
        return await getTrack(args as { trackId: string });
      case 'search-tracks':
        return await searchTracks(args as { query: string, limit?: number });
      case 'get-trending-tracks':
        return await getTrendingTracks(args as { genre?: string, limit?: number });
      case 'get-track-comments':
        return await getTrackComments(args as { trackId: string, limit?: number });
      
      // User tools
      case 'get-user':
        return await getUser(args as { userId: string });
      case 'search-users':
        return await searchUsers(args as { query: string, limit?: number });
      case 'get-user-tracks':
        return await getUserTracks(args as { userId: string, limit?: number });
      
      // Playlist & Album tools
      case 'get-playlist':
        return await getPlaylist(args as { playlistId: string });
      case 'get-album':
        return await getAlbum(args as { albumId: string });
      
      // Search tools
      case 'search-all':
        return await searchAll(args as { query: string, limit?: number });
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`,
          }],
          isError: true
        };
    }
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        trackResourceTemplate,
        userResourceTemplate,
        playlistResourceTemplate,
        albumResourceTemplate
      ]
    };
  });

  // Handle resource reading
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    let content;
    
    try {
      if (uri.startsWith('audius://track/')) {
        content = await handleTrackResource(uri);
      } else if (uri.startsWith('audius://user/')) {
        content = await handleUserResource(uri);
      } else if (uri.startsWith('audius://playlist/')) {
        content = await handlePlaylistResource(uri);
      } else if (uri.startsWith('audius://album/')) {
        content = await handleAlbumResource(uri);
      } else {
        throw new Error(`Unsupported resource URI: ${uri}`);
      }
      
      return {
        contents: [content]
      };
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  });

  // Register prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        discoverMusicPrompt,
        trackAnalysisPrompt
      ]
    };
  });

  // Handle prompt execution
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case 'discover-music':
        return handleDiscoverMusicPrompt(args as { genre: string, artist?: string, mood?: string });
      
      case 'track-analysis':
        return handleTrackAnalysisPrompt(args as { trackId: string });
      
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  return server;
};