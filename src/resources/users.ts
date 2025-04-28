import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AudiusClient } from '../sdk-client.js';

// Resource template for user
export const userResourceTemplate = {
  uriTemplate: 'audius://user/{id}',
  name: 'Audius User',
  description: 'Access user profile information from Audius',
  mimeType: 'application/json',
};

// Resource handler for user
export const handleUserResource = async (uri: URL, params: { id: string }) => {
  try {
    const userId = params.id;
    const audiusClient = AudiusClient.getInstance();
    const user = await audiusClient.getUser(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(user, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error handling user resource:', error);
    throw error;
  }
};