import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';

// Schema for get-recommendations tool
export const getRecommendationsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get recommendations for',
    },
    type: {
      type: 'string',
      description: 'Type of recommendations (tracks, users, playlists)',
      enum: ['tracks', 'users', 'playlists']
    },
    limit: {
      type: 'number',
      description: 'Maximum number of recommendations to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Schema for get-user-history tool
export const getUserHistorySchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get history for',
    },
    type: {
      type: 'string',
      description: 'Type of history (plays, likes, reposts, follows)',
      enum: ['plays', 'likes', 'reposts', 'follows']
    },
    limit: {
      type: 'number',
      description: 'Maximum number of history items to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Schema for get-trending-by-genre tool
export const getTrendingByGenreSchema = {
  type: 'object',
  properties: {
    genre: {
      type: 'string',
      description: 'Genre to filter trending content by',
    },
    type: {
      type: 'string',
      description: 'Type of content (tracks, playlists, users)',
      enum: ['tracks', 'playlists', 'users']
    },
    timeRange: {
      type: 'string',
      description: 'Time range for trending (week, month, year, all)',
      enum: ['week', 'month', 'year', 'all']
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
    },
  },
  required: ['genre'],
};

// Implementation of get-recommendations tool
export const getRecommendations = async (args: { userId: string, type?: string, limit?: number }) => {
  try {
    const type = args.type || 'tracks';
    const limit = args.limit || 10;
    
    // Construct the API URL for recommendations
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/recommendations/${type}?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching recommendations: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No ${type} recommendations found for user ID ${args.userId}`, true);
    }
    
    const recommendations = data.data;
    
    // Format recommendations based on type
    let formattedRecommendations;
    
    if (type === 'tracks') {
      formattedRecommendations = recommendations.map((track: any, index: number) => (
        `${index + 1}. "${track.title}" by ${track.user.name}\n` +
        `   ID: ${track.id} | Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}\n` +
        `   Plays: ${track.playCount || 0} | Likes: ${track.favoriteCount || 0}\n` +
        `   Reason: ${track.recommendationReason || 'Based on your listening history'}`
      )).join('\n\n');
    } else if (type === 'users') {
      formattedRecommendations = recommendations.map((user: any, index: number) => (
        `${index + 1}. ${user.name} (@${user.handle})\n` +
        `   ID: ${user.id} | Followers: ${user.followerCount || 0}\n` +
        `   Tracks: ${user.trackCount || 0} | Genre: ${user.primaryGenre || 'Various'}\n` +
        `   Reason: ${user.recommendationReason || 'Similar music taste'}`
      )).join('\n\n');
    } else {
      formattedRecommendations = recommendations.map((playlist: any, index: number) => (
        `${index + 1}. "${playlist.playlistName}" by ${playlist.user.name}\n` +
        `   ID: ${playlist.id} | Tracks: ${playlist.trackCount || 0}\n` +
        `   Followers: ${playlist.followerCount || 0}\n` +
        `   Reason: ${playlist.recommendationReason || 'Based on your preferences'}`
      )).join('\n\n');
    }
    
    return createTextResponse(
      `🎯 ${type.charAt(0).toUpperCase() + type.slice(1)} Recommendations for User ID ${args.userId}:\n\n${formattedRecommendations}`
    );
  } catch (error) {
    console.error('Error in get-recommendations tool:', error);
    return createTextResponse(
      `Error fetching recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-user-history tool
export const getUserHistory = async (args: { userId: string, type?: string, limit?: number }) => {
  try {
    const type = args.type || 'plays';
    const limit = args.limit || 20;
    
    // Construct the API URL for user history
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/history/${type}?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching user history: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No ${type} history found for user ID ${args.userId}`, true);
    }
    
    const history = data.data;
    
    // Format history based on type
    let formattedHistory;
    const emoji = {
      plays: '▶️',
      likes: '❤️',
      reposts: '🔁',
      follows: '👥'
    }[type] || '📝';
    
    if (type === 'plays') {
      formattedHistory = history.map((item: any, index: number) => (
        `${index + 1}. "${item.track.title}" by ${item.track.user.name}\n` +
        `   Played: ${new Date(item.timestamp).toLocaleString()}\n` +
        `   Duration: ${Math.floor(item.track.duration / 60)}:${String(item.track.duration % 60).padStart(2, '0')}\n` +
        `   Play Count: ${item.playCount || 1}`
      )).join('\n\n');
    } else if (type === 'follows') {
      formattedHistory = history.map((item: any, index: number) => (
        `${index + 1}. ${item.user.name} (@${item.user.handle})\n` +
        `   Followed: ${new Date(item.timestamp).toLocaleString()}\n` +
        `   Followers: ${item.user.followerCount || 0} | Tracks: ${item.user.trackCount || 0}`
      )).join('\n\n');
    } else {
      formattedHistory = history.map((item: any, index: number) => (
        `${index + 1}. "${item.track.title}" by ${item.track.user.name}\n` +
        `   ${type.charAt(0).toUpperCase() + type.slice(1, -1)}ed: ${new Date(item.timestamp).toLocaleString()}\n` +
        `   Track ID: ${item.track.id}`
      )).join('\n\n');
    }
    
    return createTextResponse(
      `${emoji} User ${type.charAt(0).toUpperCase() + type.slice(1)} History for User ID ${args.userId}:\n\n${formattedHistory}`
    );
  } catch (error) {
    console.error('Error in get-user-history tool:', error);
    return createTextResponse(
      `Error fetching user history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-trending-by-genre tool
export const getTrendingByGenre = async (args: { genre: string, type?: string, timeRange?: string, limit?: number }) => {
  try {
    const type = args.type || 'tracks';
    const timeRange = args.timeRange || 'week';
    const limit = args.limit || 10;
    
    // Construct the API URL for trending by genre
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/trending/${type}?genre=${encodeURIComponent(args.genre)}&time=${timeRange}&limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return createTextResponse(`Error fetching trending ${type} for genre ${args.genre}: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No trending ${type} found for genre "${args.genre}" in the ${timeRange}`, true);
    }
    
    const trending = data.data;
    
    // Format trending content based on type
    let formattedTrending;
    
    if (type === 'tracks') {
      formattedTrending = trending.map((track: any, index: number) => (
        `${index + 1}. "${track.title}" by ${track.user.name}\n` +
        `   ID: ${track.id} | Plays: ${track.playCount || 0} | Likes: ${track.favoriteCount || 0}\n` +
        `   Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}\n` +
        `   Trending Score: ${track.trendingScore || 'N/A'}`
      )).join('\n\n');
    } else if (type === 'users') {
      formattedTrending = trending.map((user: any, index: number) => (
        `${index + 1}. ${user.name} (@${user.handle})\n` +
        `   ID: ${user.id} | Followers: ${user.followerCount || 0}\n` +
        `   Tracks: ${user.trackCount || 0} | Playlists: ${user.playlistCount || 0}\n` +
        `   Growth Score: ${user.growthScore || 'N/A'}`
      )).join('\n\n');
    } else {
      formattedTrending = trending.map((playlist: any, index: number) => (
        `${index + 1}. "${playlist.playlistName}" by ${playlist.user.name}\n` +
        `   ID: ${playlist.id} | Tracks: ${playlist.trackCount || 0}\n` +
        `   Followers: ${playlist.followerCount || 0}\n` +
        `   Trending Score: ${playlist.trendingScore || 'N/A'}`
      )).join('\n\n');
    }
    
    return createTextResponse(
      `🔥 Trending ${type.charAt(0).toUpperCase() + type.slice(1)} in "${args.genre}" (${timeRange}):\n\n${formattedTrending}`
    );
  } catch (error) {
    console.error('Error in get-trending-by-genre tool:', error);
    return createTextResponse(
      `Error fetching trending content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};