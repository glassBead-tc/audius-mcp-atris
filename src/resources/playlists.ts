import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AudiusClient } from '../sdk-client.js';

// Resource template for playlist
export const playlistResourceTemplate = {
  uriTemplate: 'audius://playlist/{id}',
  name: 'Audius Playlist',
  description: 'Access playlist information from Audius',
  mimeType: 'application/json',
};

// Resource template for album
export const albumResourceTemplate = {
  uriTemplate: 'audius://album/{id}',
  name: 'Audius Album',
  description: 'Access album information from Audius',
  mimeType: 'application/json',
};

// Resource handler for playlist
export const handlePlaylistResource = async (uri: URL, params: { id: string }) => {
  try {
    const playlistId = params.id;
    const audiusClient = AudiusClient.getInstance();
    const playlist = await audiusClient.getPlaylist(playlistId);
    
    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistId} not found`);
    }
    
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(playlist, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error handling playlist resource:', error);
    throw error;
  }
};

// Resource handler for album
export const handleAlbumResource = async (uri: URL, params: { id: string }) => {
  try {
    const albumId = params.id;
    const audiusClient = AudiusClient.getInstance();
    const album = await audiusClient.getAlbum(albumId);
    
    if (!album) {
      throw new Error(`Album with ID ${albumId} not found`);
    }
    
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(album, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error handling album resource:', error);
    throw error;
  }
};