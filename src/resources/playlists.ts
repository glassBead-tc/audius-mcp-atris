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
export const handlePlaylistResource = async (uri: string) => {
  try {
    // Extract the playlist ID from the URI
    const match = uri.match(/audius:\/\/playlist\/(.+)/);
    if (!match || !match[1]) {
      throw new Error(`Invalid playlist URI: ${uri}`);
    }
    
    const playlistId = match[1];
    const audiusClient = AudiusClient.getInstance();
    const playlist = await audiusClient.getPlaylist(playlistId);
    
    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistId} not found`);
    }
    
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(playlist, null, 2)
    };
  } catch (error) {
    console.error('Error handling playlist resource:', error);
    throw error;
  }
};

// Resource handler for album
export const handleAlbumResource = async (uri: string) => {
  try {
    // Extract the album ID from the URI
    const match = uri.match(/audius:\/\/album\/(.+)/);
    if (!match || !match[1]) {
      throw new Error(`Invalid album URI: ${uri}`);
    }
    
    const albumId = match[1];
    const audiusClient = AudiusClient.getInstance();
    const album = await audiusClient.getAlbum(albumId);
    
    if (!album) {
      throw new Error(`Album with ID ${albumId} not found`);
    }
    
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(album, null, 2)
    };
  } catch (error) {
    console.error('Error handling album resource:', error);
    throw error;
  }
};