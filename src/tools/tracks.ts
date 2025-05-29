import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { RequestHandlerExtra } from '../types/index.js';
import { createTextResponse, createMixedResponse } from '../utils/response.js';

// Schema for get-track tool
export const getTrackSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to retrieve',
    },
  },
  required: ['trackId'],
};

// Schema for search-tracks tool
export const searchTracksSchema = {
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

// Schema for get-trending-tracks tool
export const getTrendingTracksSchema = {
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

// Schema for get-track-comments tool
export const getTrackCommentsSchema = {
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

// Schema for get-track-stream-url tool
export const getTrackStreamUrlSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'Track ID to get stream URL for',
    },
  },
  required: ['trackId'],
};

// Schema for get-bulk-tracks tool
export const getBulkTracksSchema = {
  type: 'object',
  properties: {
    trackIds: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Array of track IDs to retrieve',
      minItems: 1,
      maxItems: 50
    },
  },
  required: ['trackIds'],
};

// Implementation of get-track tool
export const getTrack = async (args: { trackId: string }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const track = await audiusClient.getTrack(args.trackId);
    
    if (!track) {
      return createTextResponse(`No track found with id ${args.trackId}.`, true);
    }
    
    // Create a more readable formatted response for the track
    const formattedTrack = [
      `🎵 Track: ${track.title}`,
      `🧑‍🎤 Artist: ${track.user.name}`,
      `📝 Description: ${track.description || 'No description provided'}`,
      `🔗 Permalink: ${track.permalink}`,
      `🕒 Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`,
      `👍 Likes: ${track.favorite_count}`,
      `🔁 Reposts: ${track.repost_count}`,
      `🎧 Plays: ${track.play_count}`,
      `🏷️ Tags: ${track.tags?.join(', ') || 'No tags'}`
    ].join('\n');
    
    return createTextResponse(formattedTrack);
  } catch (error) {
    console.error('Error in get-track tool:', error);
    return createTextResponse(
      `Error retrieving track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of search-tracks tool
export const searchTracks = async (args: { 
  query: string, 
  limit?: number 
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const searchResults = await audiusClient.searchTracks(args.query, { limit: args.limit || 10 });
    
    if (!searchResults || searchResults.length === 0) {
      return createTextResponse(`No tracks found matching "${args.query}".`, true);
    }
    
    // Format the search results in a more readable way
    const formattedResults = searchResults.map((track, index) => (
      `${index + 1}. "${track.title}" by ${track.user.name}\n` +
      `   ID: ${track.id} | Plays: ${track.play_count} | Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`
    )).join('\n\n');
    
    return createTextResponse(
      `Found ${searchResults.length} tracks matching "${args.query}":\n\n${formattedResults}`
    );
  } catch (error) {
    console.error('Error in search-tracks tool:', error);
    return createTextResponse(
      `Error searching tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-trending-tracks tool
export const getTrendingTracks = async (args: { 
  genre?: string, 
  limit?: number 
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const genreMessage = args.genre ? ` for genre "${args.genre}"` : '';
    
    const trendingTracks = await audiusClient.getTrendingTracks(
      args.genre,
      args.limit || 10
    );
    
    if (!trendingTracks || trendingTracks.length === 0) {
      return createTextResponse(`No trending tracks found${genreMessage}.`, true);
    }
    
    // Format the trending tracks in a more readable way
    const formattedTrending = trendingTracks.map((track, index) => (
      `${index + 1}. "${track.title}" by ${track.user.name}\n` +
      `   ID: ${track.id} | Plays: ${track.play_count} | Likes: ${track.favorite_count}`
    )).join('\n\n');
    
    return createTextResponse(
      `Trending tracks${genreMessage}:\n\n${formattedTrending}`
    );
  } catch (error) {
    console.error('Error in get-trending-tracks tool:', error);
    return createTextResponse(
      `Error getting trending tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-track-comments tool
export const getTrackComments = async (args: { 
  trackId: string, 
  limit?: number 
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // First, verify the track exists
    let track;
    try {
      track = await audiusClient.getTrack(args.trackId);
      if (!track) {
        return createTextResponse(`No track found with id ${args.trackId}.`, true);
      }
    } catch (error) {
      return createTextResponse(`Error verifying track: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
    
    const comments = await audiusClient.getTrackComments(
      args.trackId, 
      args.limit || 10
    );
    
    if (!comments || comments.length === 0) {
      return createTextResponse(`No comments found for track "${track.title}" (ID: ${args.trackId}).`, true);
    }
    
    // Format the comments in a more readable way
    const formattedComments = comments.map((comment, index) => (
      `${index + 1}. ${comment.user.name} commented:\n` +
      `   "${comment.comment}"\n` +
      `   Posted: ${new Date(comment.created_at).toLocaleString()} | Likes: ${comment.favorite_count || 0}`
    )).join('\n\n');
    
    return createTextResponse(
      `Comments for "${track.title}" by ${track.user.name}:\n\n${formattedComments}`
    );
  } catch (error) {
    console.error('Error in get-track-comments tool:', error);
    return createTextResponse(
      `Error retrieving track comments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-track-stream-url tool
export const getTrackStreamUrl = async (
  args: { trackId: string },
  extra?: RequestHandlerExtra
) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const sdk = audiusClient.getSDK();
    
    // Get track details first to verify it exists
    const trackResponse = await sdk.tracks.getTrack({ trackId: args.trackId });
    
    if (!trackResponse.data) {
      return createTextResponse('Track not found', true);
    }
    
    const track = trackResponse.data;
    
    // Check if track requires premium access
    if (track.isPremium || track.streamConditions) {
      return createTextResponse(
        `This track requires special access conditions. Stream conditions: ${JSON.stringify(track.streamConditions)}`,
        true
      );
    }
    
    // Construct stream URL based on API pattern
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const streamUrl = `${baseUrl}/tracks/${args.trackId}/stream`;
    
    const response = `Track: ${track.title} by ${track.user.name}
Stream URL: ${streamUrl}

Note: This URL requires proper authentication headers if the track has access restrictions.
To stream this track:
1. Make a GET request to the URL
2. Include any required authentication headers
3. The response will be an audio stream (typically MP3)`;
    
    return createTextResponse(response);
  } catch (error: any) {
    return createTextResponse(`Error getting stream URL: ${error.message}`, true);
  }
};

// Implementation of get-bulk-tracks tool
export const getBulkTracks = async (
  args: { trackIds: string[] },
  extra?: RequestHandlerExtra
) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const sdk = audiusClient.getSDK();
    
    // Validate array length
    if (args.trackIds.length > 50) {
      return createTextResponse('Maximum 50 track IDs allowed per request', true);
    }
    
    // Fetch tracks in parallel
    const trackPromises = args.trackIds.map(async (trackId) => {
      try {
        const response = await sdk.tracks.getTrack({ trackId });
        return response.data ? { success: true, track: response.data } : { success: false, trackId, error: 'Track not found' };
      } catch (error: any) {
        return { success: false, trackId, error: error.message };
      }
    });
    
    const results = await Promise.all(trackPromises);
    
    // Separate successful and failed results
    const successfulTracks = results.filter(r => r.success).map(r => (r as any).track);
    const failedTracks = results.filter(r => !r.success);
    
    if (successfulTracks.length === 0) {
      return createTextResponse('No tracks found for the provided IDs', true);
    }
    
    // Format successful tracks
    const formattedTracks = successfulTracks.map((track, index) => (
      `${index + 1}. "${track.title}" by ${track.user.name}\n` +
      `   ID: ${track.id} | Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}\n` +
      `   Plays: ${track.playCount} | Likes: ${track.favoriteCount} | Reposts: ${track.repostCount}`
    )).join('\n\n');
    
    let response = `Retrieved ${successfulTracks.length} tracks:\n\n${formattedTracks}`;
    
    // Add failed tracks info if any
    if (failedTracks.length > 0) {
      const failedList = failedTracks.map(f => `- ${(f as any).trackId}: ${(f as any).error}`).join('\n');
      response += `\n\nFailed to retrieve ${failedTracks.length} tracks:\n${failedList}`;
    }
    
    return createTextResponse(response);
  } catch (error: any) {
    return createTextResponse(`Error retrieving bulk tracks: ${error.message}`, true);
  }
};