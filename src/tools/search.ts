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
      audiusClient.searchTracks(args.query, limit),
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