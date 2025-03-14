import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for search-all tool
export const searchAllSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query for finding content across all Audius',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return per category (default: 5)',
    },
  },
  required: ['query'],
};

// Implementation of search-all tool
export const searchAll = async (args: { query: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 5;
    
    // Perform parallel searches
    const [trackResults, userResults] = await Promise.all([
      audiusClient.searchTracks(args.query, { limit }),
      audiusClient.searchUsers(args.query, limit)
    ]);
    
    const hasResults = (trackResults && trackResults.length > 0) || 
                       (userResults && userResults.length > 0);
    
    if (!hasResults) {
      return {
        content: [{
          type: 'text',
          text: `No results found for query: ${args.query}`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      query: args.query,
      tracks: trackResults || [],
      users: userResults || [],
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in search-all tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error performing search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for advanced-search tool
export const advancedSearchSchema = {
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
    genres: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'List of genres to filter by (e.g. ["Electronic", "Hip-Hop"])',
    },
    moods: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'List of moods to filter by (e.g. ["Energetic", "Relaxing"])',
    },
    bpmMin: {
      type: 'number',
      description: 'Minimum BPM (beats per minute)',
    },
    bpmMax: {
      type: 'number',
      description: 'Maximum BPM (beats per minute)',
    },
    key: {
      type: 'string',
      description: 'Musical key to filter by (e.g. "C", "A minor")',
    },
    onlyDownloadable: {
      type: 'boolean',
      description: 'Filter to only show downloadable tracks',
    },
    sort: {
      type: 'string',
      enum: ['relevant', 'popular', 'recent'],
      description: 'Sort method for results',
    },
  },
  required: ['query'],
};

// Implementation of advanced-search tool
export const advancedSearch = async (args: { 
  query: string;
  limit?: number;
  genres?: string[];
  moods?: string[];
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  onlyDownloadable?: boolean;
  sort?: 'relevant' | 'popular' | 'recent';
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    const tracks = await audiusClient.searchTracks(args.query, {
      limit: args.limit,
      genres: args.genres,
      moods: args.moods,
      bpmMin: args.bpmMin,
      bpmMax: args.bpmMax,
      key: args.key,
      onlyDownloadable: args.onlyDownloadable,
      sort: args.sort
    });
    
    if (!tracks || tracks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No tracks found matching the criteria for query: ${args.query}`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      query: args.query,
      filters: {
        genres: args.genres,
        moods: args.moods,
        bpmRange: args.bpmMin || args.bpmMax ? `${args.bpmMin || 'any'}-${args.bpmMax || 'any'} BPM` : undefined,
        key: args.key,
        onlyDownloadable: args.onlyDownloadable,
        sort: args.sort
      },
      tracks: tracks,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in advanced-search tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error performing advanced search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for trending-discovery tool
export const trendingDiscoverySchema = {
  type: 'object',
  properties: {
    genre: {
      type: 'string',
      description: 'Genre to get trending tracks for (optional)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
    },
    timeFrame: {
      type: 'string',
      enum: ['week', 'month', 'year', 'allTime'],
      description: 'Time frame for trending calculation',
    },
    underground: {
      type: 'boolean',
      description: 'Get underground trending tracks from emerging artists',
    },
  },
};

// Implementation of trending-discovery tool
export const trendingDiscovery = async (args: { 
  genre?: string;
  limit?: number;
  timeFrame?: 'week' | 'month' | 'year' | 'allTime';
  underground?: boolean;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    let tracks;
    if (args.underground) {
      tracks = await audiusClient.getUndergroundTrendingTracks(args.genre, limit);
    } else {
      // Use the time parameter if provided
      const params: any = {};
      if (args.genre) params.genre = args.genre;
      if (args.timeFrame) params.time = args.timeFrame;
      
      tracks = await audiusClient.getTrendingTracks(args.genre, limit);
    }
    
    if (!tracks || tracks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No ${args.underground ? 'underground ' : ''}trending tracks found${args.genre ? ` for genre: ${args.genre}` : ''}`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      type: args.underground ? 'Underground Trending' : 'Trending',
      timeFrame: args.timeFrame || 'week',
      genre: args.genre || 'All Genres',
      tracks: tracks,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in trending-discovery tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting trending tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for similar-artists tool
export const similarArtistsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'User ID of the artist to find similar artists for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of similar artists to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of similar-artists tool
export const similarArtists = async (args: { userId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const artists = await audiusClient.getRelatedArtists(args.userId, limit);
    
    if (!artists || artists.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No similar artists found for user ID: ${args.userId}`,
        }],
      };
    }
    
    // Get the original artist info
    const originalArtist = await audiusClient.getUser(args.userId);
    
    // Format results
    const formattedResults = {
      originalArtist: originalArtist || { id: args.userId },
      similarArtists: artists,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in similar-artists tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error finding similar artists: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};