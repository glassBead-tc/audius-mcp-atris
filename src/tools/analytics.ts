import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for track-listen-counts tool
export const trackListenCountsSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to get listen counts for',
    },
  },
  required: ['trackId'],
};

// Implementation of track-listen-counts tool
export const getTrackListenCounts = async (args: { 
  trackId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Get listen counts
    const listenCounts = await audiusClient.getTrackListenCounts(args.trackId);
    
    if (!listenCounts) {
      return {
        content: [{
          type: 'text',
          text: `No listen count data available for track ${args.trackId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      listenCounts: listenCounts,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in track-listen-counts tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting track listen counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-track-listen-counts tool
export const userTrackListenCountsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get track listen counts for',
    },
  },
  required: ['userId'],
};

// Implementation of user-track-listen-counts tool
export const getUserTrackListenCounts = async (args: { 
  userId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Get user track listen counts
    const listenCounts = await audiusClient.getUserTrackListenCounts(args.userId);
    
    if (!listenCounts || Object.keys(listenCounts).length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No listen count data available for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      trackListenCounts: listenCounts,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-track-listen-counts tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting user track listen counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for track-top-listeners tool
export const trackTopListenersSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to get top listeners for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of top listeners to return (default: 10)',
    },
  },
  required: ['trackId'],
};

// Implementation of track-top-listeners tool
export const getTrackTopListeners = async (args: { 
  trackId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Get top listeners
    const topListeners = await audiusClient.getTrackTopListeners(args.trackId, limit);
    
    if (!topListeners || topListeners.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No top listener data available for track ${args.trackId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      limit,
      topListeners: topListeners,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in track-top-listeners tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting track top listeners: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for track-listener-insights tool
export const trackListenerInsightsSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to get listener insights for',
    },
  },
  required: ['trackId'],
};

// Implementation of track-listener-insights tool
export const getTrackListenerInsights = async (args: { 
  trackId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Get listener insights
    const insights = await audiusClient.getTrackListenerInsights(args.trackId);
    
    if (!insights || Object.keys(insights).length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No listener insight data available for track ${args.trackId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      listenerInsights: insights,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in track-listener-insights tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting track listener insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-play-metrics tool
export const userPlayMetricsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get aggregate play metrics for',
    },
  },
  required: ['userId'],
};

// Implementation of user-play-metrics tool
export const getUserPlayMetrics = async (args: { 
  userId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Get user play metrics
    const metrics = await audiusClient.getUserAggregatePlayMetrics(args.userId);
    
    if (!metrics || Object.keys(metrics).length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No aggregate play metrics available for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      playMetrics: metrics,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-play-metrics tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting user play metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for track-monthly-trending tool
export const trackMonthlyTrendingSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to get monthly trending data for',
    },
  },
  required: ['trackId'],
};

// Implementation of track-monthly-trending tool
export const getTrackMonthlyTrending = async (args: { 
  trackId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Get monthly trending data
    const trendingData = await audiusClient.getTrackMonthlyTrending(args.trackId);
    
    if (!trendingData || Object.keys(trendingData).length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No monthly trending data available for track ${args.trackId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      monthlyTrending: trendingData,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in track-monthly-trending tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting track monthly trending data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-supporters tool
export const userSupportersSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get supporters for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of supporters to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of user-supporters tool
export const getUserSupporters = async (args: { 
  userId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Get user supporters
    const supporters = await audiusClient.getUserSupporters(args.userId, limit);
    
    if (!supporters || supporters.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No supporter data available for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      supporters: supporters,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-supporters tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting user supporters: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-supporting tool
export const userSupportingSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get supporting info for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of supported users to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of user-supporting tool
export const getUserSupporting = async (args: { 
  userId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Get user supporting
    const supporting = await audiusClient.getUserSupporting(args.userId, limit);
    
    if (!supporting || supporting.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No supporting data available for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      supporting: supporting,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-supporting tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting user supporting info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};