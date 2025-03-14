import { AudiusClient } from '../sdk-client.js';

// Resource template for track
export const trackResourceTemplate = {
  uriTemplate: 'audius://track/{id}',
  name: 'Audius Track',
  description: 'Access track information from Audius',
  mimeType: 'application/json',
};

// Resource handler for track
export const handleTrackResource = async (uri: string) => {
  try {
    // Extract the track ID from the URI
    const match = uri.match(/audius:\/\/track\/(.+)/);
    if (!match || !match[1]) {
      throw new Error(`Invalid track URI: ${uri}`);
    }
    
    const trackId = match[1];
    const audiusClient = AudiusClient.getInstance();
    const track = await audiusClient.getTrack(trackId);
    
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }
    
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(track, null, 2)
    };
  } catch (error) {
    console.error('Error handling track resource:', error);
    throw error;
  }
};