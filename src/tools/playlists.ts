import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for get-playlist tool
export const getPlaylistSchema = {
  type: 'object',
  properties: {
    playlistId: {
      type: 'string',
      description: 'The ID of the playlist to retrieve',
    },
  },
  required: ['playlistId'],
};

// Schema for get-album tool
export const getAlbumSchema = {
  type: 'object',
  properties: {
    albumId: {
      type: 'string',
      description: 'The ID of the album to retrieve',
    },
  },
  required: ['albumId'],
};

// Implementation of get-playlist tool
export const getPlaylist = async (args: { playlistId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    console.error(`Attempting to get playlist with ID: ${args.playlistId}`);
    
    const playlist = await audiusClient.getPlaylist(args.playlistId);
    
    if (!playlist) {
      return {
        content: [{
          type: 'text',
          text: `Playlist with ID ${args.playlistId} not found`,
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(playlist, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-playlist tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of get-album tool
export const getAlbum = async (args: { albumId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    console.error(`Attempting to get album with ID: ${args.albumId}`);
    
    const album = await audiusClient.getAlbum(args.albumId);
    
    if (!album) {
      return {
        content: [{
          type: 'text',
          text: `Album with ID ${args.albumId} not found`,
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(album, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-album tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching album: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};