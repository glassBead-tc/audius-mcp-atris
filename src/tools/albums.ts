import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { RequestHandlerExtra } from '../types/index.js';
import { createTextResponse, createMixedResponse, createResourceResponse } from '../utils/response.js';

// Schema for get-album tool
export const getAlbumSchema = {
  type: 'object',
  properties: {
    albumId: {
      type: 'string',
      description: 'Album ID (albums are playlists with is_album=true)',
    },
  },
  required: ['albumId'],
};

// Schema for get-album-tracks tool
export const getAlbumTracksSchema = {
  type: 'object',
  properties: {
    albumId: {
      type: 'string',
      description: 'Album ID to get tracks for',
    },
  },
  required: ['albumId'],
};

// Schema for get-user-albums tool
export const getUserAlbumsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'User ID to get albums for',
    },
    offset: {
      type: 'number',
      description: 'Offset for pagination (default: 0)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of albums to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Handler for get-album
export async function getAlbum(
  args: { albumId: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    const sdk = client.getSDK();
    // Albums are playlists with is_album=true
    const response = await sdk.playlists.getPlaylist({ 
      playlistId: args.albumId 
    });
    
    if (!response.data?.isAlbum) {
      return createTextResponse('The specified playlist is not an album', true);
    }
    
    const album = response.data;
    const albumInfo = `Album: ${album.playlistName}
Artist: ${album.user.name}
Track Count: ${album.trackCount}
Total Duration: ${album.totalPlayTime}s
Release Date: ${album.releaseDate || 'N/A'}
Description: ${album.description || 'N/A'}`;
    
    return createMixedResponse([
      { type: "text" as const, text: albumInfo },
      { 
        type: "resource" as const, 
        resource: { 
          uri: `audius://album/${album.id}`, 
          mimeType: "application/json",
          text: JSON.stringify(album, null, 2)
        } 
      }
    ]);
  } catch (error: any) {
    return createTextResponse(`Error fetching album: ${error.message}`, true);
  }
}

// Handler for get-album-tracks
export async function getAlbumTracks(
  args: { albumId: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    const sdk = client.getSDK();
    const response = await sdk.playlists.getPlaylistTracks({ 
      playlistId: args.albumId 
    });
    
    if (!response.data || response.data.length === 0) {
      return createTextResponse('No tracks found in this album', true);
    }
    
    const tracks = response.data;
    let trackList = 'Album Tracks:\n\n';
    
    tracks.forEach((track: any, index: number) => {
      trackList += `${index + 1}. ${track.title}
   Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}
   Play Count: ${track.playCount}
   ID: ${track.id}\n\n`;
    });
    
    return createTextResponse(trackList);
  } catch (error: any) {
    return createTextResponse(`Error fetching album tracks: ${error.message}`, true);
  }
}

// Handler for get-user-albums
export async function getUserAlbums(
  args: { userId: string; offset?: number; limit?: number },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    const sdk = client.getSDK();
    const offset = args.offset || 0;
    const limit = args.limit || 20;
    
    // Get user's playlists and filter for albums
    const response = await sdk.users.getUserPlaylists({ 
      id: args.userId,
      offset,
      limit: limit * 2 // Request more to filter
    });
    
    if (!response.data) {
      return createTextResponse('No playlists found for this user', true);
    }
    
    // Filter for albums only
    const albums = response.data.filter((p: any) => p.isAlbum).slice(0, limit);
    
    if (albums.length === 0) {
      return createTextResponse('No albums found for this user');
    }
    
    let albumList = `User Albums (${albums.length}):\n\n`;
    
    albums.forEach((album: any, index: number) => {
      albumList += `${index + 1}. ${album.playlistName}
   Track Count: ${album.trackCount}
   Release Date: ${album.releaseDate || 'N/A'}
   ID: ${album.id}\n\n`;
    });
    
    return createTextResponse(albumList);
  } catch (error: any) {
    return createTextResponse(`Error fetching user albums: ${error.message}`, true);
  }
}