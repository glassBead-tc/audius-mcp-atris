import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AudiusClient } from '../sdk-client.js';

// Resource template for track
export const trackResourceTemplate = {
  uriTemplate: 'audius://track/{id}',
  name: 'Audius Track',
  description: 'Access track information from Audius',
  mimeType: 'application/json',
};

// Resource handler for track
export const handleTrackResource = async (uri: URL, params: { id: string }) => {
  try {
    const trackId = params.id;
    const audiusClient = AudiusClient.getInstance();
    const track = await audiusClient.getTrack(trackId);
    
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }
    
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(track, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error handling track resource:', error);
    throw error;
  }
};