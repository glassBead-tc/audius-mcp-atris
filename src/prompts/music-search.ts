// Music discovery prompt

export const discoverMusicPrompt = {
  name: 'discover-music',
  description: 'Get personalized music recommendations based on your preferences',
  arguments: [
    {
      name: 'genre',
      description: 'Music genre(s) you enjoy',
      required: true,
    },
    {
      name: 'artist',
      description: 'Artist(s) you like (optional)',
      required: false,
    },
    {
      name: 'mood',
      description: 'Current mood (e.g., energetic, relaxed, focused)',
      required: false,
    },
  ],
};

// Handler for discover-music prompt
export const handleDiscoverMusicPrompt = (args: { 
  genre: string;
  artist?: string; 
  mood?: string;
}) => {
  // Build a user query for discovery
  let userMessage = `I'm looking for music recommendations on Audius. `;
  
  userMessage += `I enjoy ${args.genre} music. `;
  
  if (args.artist) {
    userMessage += `Some artists I like are ${args.artist}. `;
  }
  
  if (args.mood) {
    userMessage += `I'm in a ${args.mood} mood right now. `;
  }
  
  userMessage += `Can you recommend some tracks or artists on Audius that I might enjoy?`;
  
  // Create messages for the prompt
  const messages = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: userMessage,
      },
    },
  ];
  
  return {
    messages,
  };
};