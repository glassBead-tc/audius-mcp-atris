import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return createTextResponse(`Unable to verify track. Please check the provided track ID.`, true);
    }
    
    // Get listen counts
    const listenCounts = await audiusClient.getTrackListenCounts(args.trackId);
    
    if (!listenCounts) {
      return createTextResponse(`No listen count data available for track ${args.trackId}.`);
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      listenCounts: listenCounts,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in track-listen-counts tool:', error);
    return createTextResponse(
      `Error getting track listen counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get user track listen counts
    const listenCounts = await audiusClient.getUserTrackListenCounts(args.userId);
    
    if (!listenCounts || Object.keys(listenCounts).length === 0) {
      return createTextResponse(`No listen count data available for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      trackListenCounts: listenCounts,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-track-listen-counts tool:', error);
    return createTextResponse(
      `Error getting user track listen counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return createTextResponse(`Unable to verify track. Please check the provided track ID.`, true);
    }
    
    // Get top listeners
    const topListeners = await audiusClient.getTrackTopListeners(args.trackId, limit);
    
    if (!topListeners || topListeners.length === 0) {
      return createTextResponse(`No top listener data available for track ${args.trackId}.`);
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      limit,
      topListeners: topListeners,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in track-top-listeners tool:', error);
    return createTextResponse(
      `Error getting track top listeners: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return createTextResponse(`Unable to verify track. Please check the provided track ID.`, true);
    }
    
    // Get listener insights
    const insights = await audiusClient.getTrackListenerInsights(args.trackId);
    
    if (!insights || Object.keys(insights).length === 0) {
      return createTextResponse(`No listener insight data available for track ${args.trackId}.`);
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      listenerInsights: insights,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in track-listener-insights tool:', error);
    return createTextResponse(
      `Error getting track listener insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get user play metrics
    const metrics = await audiusClient.getUserAggregatePlayMetrics(args.userId);
    
    if (!metrics || Object.keys(metrics).length === 0) {
      return createTextResponse(`No aggregate play metrics available for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      playMetrics: metrics,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-play-metrics tool:', error);
    return createTextResponse(
      `Error getting user play metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return createTextResponse(`Unable to verify track. Please check the provided track ID.`, true);
    }
    
    // Get monthly trending data
    const trendingData = await audiusClient.getTrackMonthlyTrending(args.trackId);
    
    if (!trendingData || Object.keys(trendingData).length === 0) {
      return createTextResponse(`No monthly trending data available for track ${args.trackId}.`);
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      monthlyTrending: trendingData,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in track-monthly-trending tool:', error);
    return createTextResponse(
      `Error getting track monthly trending data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get user supporters
    const supporters = await audiusClient.getUserSupporters(args.userId, limit);
    
    if (!supporters || supporters.length === 0) {
      return createTextResponse(`No supporter data available for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      supporters: supporters,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-supporters tool:', error);
    return createTextResponse(
      `Error getting user supporters: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get user supporting
    const supporting = await audiusClient.getUserSupporting(args.userId, limit);
    
    if (!supporting || supporting.length === 0) {
      return createTextResponse(`No supporting data available for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      supporting: supporting,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-supporting tool:', error);
    return createTextResponse(
      `Error getting user supporting info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};