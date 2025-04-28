// Playlist creation prompt

export const playlistCreationPrompt = {
  name: 'playlist-creation',
  description: 'Create and manage playlists on Audius',
  arguments: [
    {
      name: 'userId',
      description: 'ID of the user creating/managing the playlist',
      required: true,
    },
    {
      name: 'playlistName',
      description: 'Name for the playlist (required for creation)',
      required: false,
    },
    {
      name: 'playlistId',
      description: 'ID of an existing playlist to update (if updating)',
      required: false,
    },
    {
      name: 'isAlbum',
      description: 'Whether this is an album',
      required: false,
      type: 'boolean'
    },
    {
      name: 'genre',
      description: 'Genre for the playlist',
      required: false,
    },
    {
      name: 'action',
      description: 'Action to perform with the playlist',
      required: false,
      enum: ['create', 'update', 'curate', 'promote']
    }
  ],
};

// Handler for playlist-creation prompt
export const handlePlaylistCreationPrompt = (args: { 
  userId?: string;
  playlistName?: string;
  playlistId?: string;
  isAlbum?: string; // Changed from boolean to string
  genre?: string;
  action?: string; // Changed from enum to string
}) => {
  // Convert string parameters to appropriate types
  const userId = args.userId || '';
  const isAlbum = args.isAlbum === 'true';
  // Build a user query for playlist creation
  let userMessage = '';
  
  if (args.action === 'create' || (!args.action && args.playlistName && !args.playlistId)) {
    // Creation flow
    userMessage = `I want to create a new ${isAlbum ? 'album' : 'playlist'} called "${args.playlistName}" `;
    
    if (args.genre) {
      userMessage += `in the ${args.genre} genre `;
    }
    
    userMessage += `on Audius. Can you guide me through the process of creating ${isAlbum ? 'an album' : 'a playlist'} and organizing tracks?`;
  } else if (args.action === 'update' || (!args.action && args.playlistId)) {
    // Update flow
    userMessage = `I want to update my ${isAlbum ? 'album' : 'playlist'}`;
    
    if (args.playlistId) {
      userMessage += ` with ID ${args.playlistId}`;
    }
    
    if (args.playlistName) {
      userMessage += ` called "${args.playlistName}"`;
    }
    
    userMessage += ` on Audius. Can you guide me through the process of updating ${isAlbum ? 'an album' : 'a playlist'} and managing its tracks?`;
  } else if (args.action === 'curate') {
    // Curation flow
    userMessage = `I want to curate a great ${isAlbum ? 'album' : 'playlist'}`;
    
    if (args.playlistName) {
      userMessage += ` called "${args.playlistName}"`;
    }
    
    if (args.genre) {
      userMessage += ` in the ${args.genre} genre`;
    }
    
    userMessage += `. Can you give me tips on how to create a well-curated ${isAlbum ? 'album' : 'playlist'} that people will enjoy?`;
  } else if (args.action === 'promote') {
    // Promotion flow
    userMessage = `I want to promote my ${isAlbum ? 'album' : 'playlist'}`;
    
    if (args.playlistId) {
      userMessage += ` with ID ${args.playlistId}`;
    }
    
    if (args.playlistName) {
      userMessage += ` called "${args.playlistName}"`;
    }
    
    userMessage += ` on Audius. Can you suggest strategies to get more listeners and engagement?`;
  } else {
    // Default flow
    userMessage = `I'm interested in working with ${isAlbum ? 'albums' : 'playlists'} on Audius. Can you guide me through the options for creating, updating, and managing ${isAlbum ? 'albums' : 'playlists'}?`;
  }
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, help the user with their playlist management:

1. For playlist creation:
   - Explain how to use the 'create-playlist' tool
   - Provide best practices for playlist organization
   - Suggest strategies for artwork and descriptions

2. For playlist updates:
   - Explain how to use the 'update-playlist' tool
   - Show how to add/remove tracks with 'add-tracks-to-playlist' and 'remove-track-from-playlist'
   - Demonstrate reordering with 'reorder-playlist-tracks'

3. For playlist curation:
   - Suggest genre-specific curation strategies
   - Explain how track order and flow affect listener experience
   - Provide tips for cohesive playlists

4. For promotion:
   - Suggest social sharing strategies
   - Explain how to leverage the Audius community
   - Provide tips for increasing visibility

Use the appropriate tools based on the user's specified action and provide practical, actionable advice.
  `;
  
  // Create messages for the prompt with proper typing, only using allowed roles
  const messages = [
    {
      role: "assistant" as const,
      content: {
        type: "text" as const,
        text: systemMessage,
      },
    },
    {
      role: "user" as const,
      content: {
        type: "text" as const,
        text: userMessage,
      },
    },
  ];
  
  return {
    messages,
  };
};