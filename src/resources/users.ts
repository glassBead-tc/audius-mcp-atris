import { AudiusClient } from '../sdk-client.js';

// Resource template for user
export const userResourceTemplate = {
  uriTemplate: 'audius://user/{id}',
  name: 'Audius User',
  description: 'Access user profile information from Audius',
  mimeType: 'application/json',
};

// Resource handler for user
export const handleUserResource = async (uri: string) => {
  try {
    // Extract the user ID from the URI
    const match = uri.match(/audius:\/\/user\/(.+)/);
    if (!match || !match[1]) {
      throw new Error(`Invalid user URI: ${uri}`);
    }
    
    const userId = match[1];
    const audiusClient = AudiusClient.getInstance();
    const user = await audiusClient.getUser(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(user, null, 2)
    };
  } catch (error) {
    console.error('Error handling user resource:', error);
    throw error;
  }
};