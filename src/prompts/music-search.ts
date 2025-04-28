// Music discovery prompt

export const discoverMusicPrompt = {
  name: 'discover-music',
  description: 'Get personalized music recommendations based on your preferences',
  arguments: [
    {
      name: 'genre',
      description: 'Music genre(s) you enjoy (e.g., Electronic, Hip-Hop, Jazz)',
      required: true,
    },
    {
      name: 'artist',
      description: 'Artist(s) you like (optional)',
      required: false,
    },
    {
      name: 'mood',
      description: 'Current mood (e.g., Energetic, Relaxing, Focused, Ambient)',
      required: false,
    },
    {
      name: 'bpmRange',
      description: 'Preferred BPM range (e.g., "70-90" for downtempo, "120-140" for dance)',
      required: false,
    },
    {
      name: 'underground',
      description: 'Whether to include underground tracks from emerging artists',
      required: false,
      type: 'boolean'
    },
    {
      name: 'discoveryMode',
      description: 'Type of discovery: trending, new, or similar (based on artist)',
      required: false,
      enum: ['trending', 'new', 'similar']
    }
  ],
};

// Handler for discover-music prompt
export const handleDiscoverMusicPrompt = (args: { 
  query?: string; // Required as per schema
  artist?: string; 
  mood?: string;
  bpmRange?: string;
  underground?: string; // Changed from boolean to string
  discoveryMode?: string; // Changed from enum to string
}) => {
  // Convert string parameters to appropriate types
  const underground = args.underground === 'true';
  // Parse BPM range if provided
  let bpmMin: number | undefined;
  let bpmMax: number | undefined;
  
  if (args.bpmRange) {
    const parts = args.bpmRange.split('-');
    if (parts.length === 2) {
      bpmMin = parseInt(parts[0], 10);
      bpmMax = parseInt(parts[1], 10);
      
      if (isNaN(bpmMin)) bpmMin = undefined;
      if (isNaN(bpmMax)) bpmMax = undefined;
    }
  }
  
  // Build a user query for discovery
  let userMessage = `I'm looking for music recommendations on Audius. `;
  
  userMessage += `I enjoy ${args.query || 'music'} music. `;
  
  if (args.artist) {
    userMessage += `Some artists I like are ${args.artist}. `;
  }
  
  if (args.mood) {
    userMessage += `I'm in a ${args.mood} mood right now. `;
  }
  
  if (args.bpmRange) {
    userMessage += `I prefer music with a tempo in the ${args.bpmRange} BPM range. `;
  }
  
  if (underground) {
    userMessage += `I'm interested in discovering underground or emerging artists. `;
  }
  
  if (args.discoveryMode) {
    switch (args.discoveryMode) {
      case 'trending':
        userMessage += `I'd like to hear what's trending right now. `;
        break;
      case 'new':
        userMessage += `I'd like to discover new releases. `;
        break;
      case 'similar':
        userMessage += `I'd like to find artists similar to the ones I mentioned. `;
        break;
    }
  }
  
  userMessage += `Can you recommend some tracks or artists on Audius that I might enjoy? Please provide specific recommendations I can listen to.`;
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, use these tools to provide personalized music recommendations:
- If specific artists were mentioned, use the 'similar-artists' tool to find related artists
- Use 'advanced-search' to find tracks matching the user's genre and mood preferences
- Use 'trending-discovery' to find popular tracks in the user's preferred genre
- For underground music discovery, use 'trending-discovery' with underground=true
- Use 'get-track' to get detailed information about specific tracks
- Use 'get-user' to get information about artists

Make recommendations specific and varied. Include track names, artist names, and brief descriptions of why they match the user's preferences.
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