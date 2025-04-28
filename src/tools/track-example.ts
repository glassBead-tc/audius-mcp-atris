import { AudiusClient } from '../sdk-client.js';
import { RequestHandlerExtra } from '../types/index.js';
import { createTextResponse, createMixedResponse } from '../utils/response.js';
import { requiredParam, optionalNumberParam, paginationParams } from '../toolsets/params.js';

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

// Implementation of get-track tool using the new parameter validation
export const getTrack = async (args: Record<string, any>) => {
  try {
    // Use the new parameter validation helper
    const trackId = requiredParam<string>(args, 'trackId', 'string');
    
    const audiusClient = AudiusClient.getInstance();
    const track = await audiusClient.getTrack(trackId);
    
    if (!track) {
      return createTextResponse(`No track found with id ${trackId}.`, true);
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

// Implementation of search-tracks tool with improved parameter validation
export const searchTracks = async (args: Record<string, any>) => {
  try {
    // Use the new parameter validation helpers
    const query = requiredParam<string>(args, 'query', 'string');
    const limit = optionalNumberParam(args, 'limit', 10);
    
    const audiusClient = AudiusClient.getInstance();
    const searchResults = await audiusClient.searchTracks(query, { limit });
    
    if (!searchResults || searchResults.length === 0) {
      return createTextResponse(`No tracks found matching "${query}".`, true);
    }
    
    // Format the search results in a more readable way
    const formattedResults = searchResults.map((track, index) => (
      `${index + 1}. "${track.title}" by ${track.user.name}\n` +
      `   ID: ${track.id} | Plays: ${track.play_count} | Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`
    )).join('\n\n');
    
    return createTextResponse(
      `Found ${searchResults.length} tracks matching "${query}":\n\n${formattedResults}`
    );
  } catch (error) {
    console.error('Error in search-tracks tool:', error);
    return createTextResponse(
      `Error searching tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};