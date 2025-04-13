import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import {
  ToolDefinition,
  registerTool,
  MCPToolResponse
} from '../utils/tool-registry.js';
import {
  getTrackSchema as getTrackZodSchema,
  searchTracksSchema as searchTracksZodSchema,
  getTrendingTracksSchema as getTrendingTracksZodSchema,
  getTrackCommentsSchema as getTrackCommentsZodSchema,
  streamTrackSchema as streamTrackZodSchema
} from '../utils/schemas/tracks.js';
import { validateToolInput } from '../utils/validation.js';

// Legacy JSON Schema for MCP compatibility (will be phased out)
const getTrackLegacySchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to retrieve',
    },
  },
  required: ['trackId'],
};

// Convert legacy JSON schemas to toolDefinitions that use Zod schemas


// Legacy JSON Schema for search-tracks (will be phased out)
const searchTracksLegacySchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query for finding tracks',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
    },
  },
  required: ['query'],
};

// Legacy JSON Schema for get-trending-tracks (will be phased out)
const getTrendingTracksLegacySchema = {
  type: 'object',
  properties: {
    genre: {
      type: 'string',
      description: 'Genre to filter by (optional)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
    },
  },
};

// Legacy JSON Schema for get-track-comments (will be phased out)
const getTrackCommentsLegacySchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to get comments for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of comments to return (default: 10)',
    },
  },
  required: ['trackId'],
};

// Implementation of get-track tool execution logic
const getTrackExecute = async (args: z.infer<typeof getTrackZodSchema>): Promise<MCPToolResponse> => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const track = await audiusClient.getTrack(args.trackId);
    
    if (!track) {
      return {
        content: [{
          type: 'text',
          text: `Track with ID ${args.trackId} not found`,
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(track, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-track tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of search-tracks execution logic
const searchTracksExecute = async (args: z.infer<typeof searchTracksZodSchema>): Promise<MCPToolResponse> => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    const results = await audiusClient.searchTracks(args.query, { limit });
    
    if (!results || results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No tracks found for query: ${args.query}`,
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in search-tracks tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error searching tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of get-trending-tracks execution logic
const getTrendingTracksExecute = async (args: z.infer<typeof getTrendingTracksZodSchema>): Promise<MCPToolResponse> => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    console.error('Attempting to get trending tracks...');
    
    const results = await audiusClient.getTrendingTracks(args.genre, limit);
    
    if (!results || results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: args.genre 
            ? `No trending tracks found in genre: ${args.genre}`
            : 'No trending tracks found',
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-trending-tracks tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching trending tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of get-track-comments execution logic
const getTrackCommentsExecute = async (args: z.infer<typeof getTrackCommentsZodSchema>): Promise<MCPToolResponse> => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    const comments = await audiusClient.getTrackComments(args.trackId, limit);
    
    if (!comments || comments.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No comments found for track ID: ${args.trackId}`,
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(comments, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-track-comments tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching track comments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
}
    
  }

// Legacy JSON Schema for stream-track (will be phased out)
const streamTrackLegacySchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'Audius track ID to stream'
    },
    userId: {
      type: 'string',
      description: 'Optional user ID'
    },
    apiKey: {
      type: 'string',
      description: 'Optional API key'
    },
    preview: {
      type: 'boolean',
      description: 'If true, stream a preview clip'
    },
    skipPlayCount: {
      type: 'boolean',
      description: 'If true, do not increment play count'
    }
  },
  required: ['trackId'],
  description: 'Streams raw audio bytes for a given Audius track ID. Response is an audio/mpeg stream.'
};

// Implementation of stream-track execution logic
const streamTrackExecute = async (
  args: z.infer<typeof streamTrackZodSchema>,
  context: { res: any }
): Promise<MCPToolResponse> => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const sdk = audiusClient.getSDK();

    const stream = await import('../utils/fetchAudiusTrackStream.js').then(m => m.fetchAudiusTrackStream(
      sdk,
      args.trackId,
      {
        userId: args.userId,
        apiKey: args.apiKey,
        preview: args.preview,
        skipPlayCount: args.skipPlayCount
      }
    ));

    context.res.setHeader('Content-Type', 'audio/mpeg');
    context.res.setHeader('Transfer-Encoding', 'chunked');

    if (typeof (stream as any).pipe === 'function') {
      (stream as any).pipe(context.res);
    } else if (typeof (stream as any).getReader === 'function') {
      const reader = (stream as any).getReader();
      const writer = context.res.getWriter ? context.res.getWriter() : null;
      context.res.setHeader('Transfer-Encoding', 'chunked');
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          context.res.write(value);
        }
        context.res.end();
      };
      pump().catch((err: any) => {
        console.error('Stream piping error:', err);
        if (!context.res.headersSent) {
          context.res.statusCode = 500;
          context.res.end('Stream error');
        }
      });
    } else {
      throw new Error('Unsupported stream type');
    }

    // Return a special marker indicating streaming response
    return { content: [{ type: 'stream', text: 'Streaming audio...' }] };
  } catch (error: any) {
    console.error('Error in stream-track tool:', error);
    if (context?.res?.headersSent !== true) {
      context.res.statusCode = 500;
      context.res.setHeader('Content-Type', 'application/json');
      context.res.end(JSON.stringify({ error: error.message || 'Unknown error' }));
    }
    return {
      content: [{
        type: 'text',
        text: `Error streaming track: ${error.message || 'Unknown error'}`
      }],
      isError: true
    };
  }
};

// Define the tool objects using ToolDefinition interface
const getTrackTool: ToolDefinition<typeof getTrackZodSchema> = {
  name: 'get-track',
  description: 'Get details for a specific track',
  schema: getTrackZodSchema,
  execute: getTrackExecute
};

const searchTracksTool: ToolDefinition<typeof searchTracksZodSchema> = {
  name: 'search-tracks',
  description: 'Search for tracks by keyword',
  schema: searchTracksZodSchema,
  execute: searchTracksExecute
};

const getTrendingTracksTool: ToolDefinition<typeof getTrendingTracksZodSchema> = {
  name: 'get-trending-tracks',
  description: 'Get trending tracks on Audius',
  schema: getTrendingTracksZodSchema,
  execute: getTrendingTracksExecute
};

const getTrackCommentsTool: ToolDefinition<typeof getTrackCommentsZodSchema> = {
  name: 'get-track-comments',
  description: 'Get comments for a specific track',
  schema: getTrackCommentsZodSchema,
  execute: getTrackCommentsExecute
};

// The streamTrack tool is special because it requires context
// We'll still define it but note that it might need special handling in the server
const streamTrackTool: ToolDefinition<typeof streamTrackZodSchema> = {
  name: 'stream-track',
  description: 'Stream an Audius track as audio',
  schema: streamTrackZodSchema,
  execute: (args) => streamTrackExecute(args, { res: null }) // Note: This is a placeholder, the actual implementation will need context
};

// Register all tools with the registry
registerTool(getTrackTool);
registerTool(searchTracksTool);
registerTool(getTrendingTracksTool);
registerTool(getTrackCommentsTool);
registerTool(streamTrackTool);

// For backward compatibility, we'll export the legacy schemas and functions
// These will be removed once the migration to the new system is complete
export {
  getTrackLegacySchema as getTrackSchema,
  searchTracksLegacySchema as searchTracksSchema,
  getTrendingTracksLegacySchema as getTrendingTracksSchema,
  getTrackCommentsLegacySchema as getTrackCommentsSchema,
  streamTrackLegacySchema as streamTrackSchema,
  
  // Legacy function exports
  getTrackExecute as getTrack,
  searchTracksExecute as searchTracks,
  getTrendingTracksExecute as getTrendingTracks,
  getTrackCommentsExecute as getTrackComments,
  streamTrackExecute as streamTrack
};