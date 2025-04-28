// Artist profile and social connections prompt

export const artistProfilePrompt = {
  name: 'artist-profile',
  description: 'Get detailed information about an artist, their social connections, and popular content',
  arguments: [
    {
      name: 'userId',
      description: 'ID of the artist to explore',
      required: true,
    },
    {
      name: 'includeConnections',
      description: 'Include social connections (followers, following)',
      required: false,
      type: 'boolean'
    },
    {
      name: 'includePopularContent',
      description: 'Include popular tracks and reposts',
      required: false,
      type: 'boolean'
    }
  ],
};

// Handler for artist-profile prompt
export const handleArtistProfilePrompt = (args: { 
  userId?: string;
  includeConnections?: string; // Changed from boolean to string
  includePopularContent?: string; // Changed from boolean to string
}) => {
  // Convert string parameters to booleans as needed
  const includeConnections = args.includeConnections === 'true';
  const includePopularContent = args.includePopularContent === 'true';
  const userId = args.userId || '';
  // Build a user query for artist profile
  let userMessage = `I'd like to learn more about an artist on Audius with ID: ${userId}. `;
  
  if (includeConnections) {
    userMessage += `Please include information about their social connections, like followers and who they follow. `;
  }
  
  if (includePopularContent) {
    userMessage += `Please include their most popular tracks and recent reposts. `;
  }
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, use these tools to provide information about the artist:
- Use 'get-user' to get basic profile information about the artist
- Use 'get-user-tracks' to see tracks by the artist
- Use 'user-favorites' to see tracks the artist has favorited
- Use 'user-reposts' to see content the artist has reposted

${includeConnections ? `
For social connections:
- Use 'user-followers' to see the artist's followers
- Use 'user-following' to see who the artist follows
` : ''}

${includePopularContent ? `
For popular content:
- Get tracks by the artist and identify the most popular ones
- Get recent reposts to understand what content they're sharing
` : ''}

Organize the information in a way that gives a comprehensive overview of the artist's profile, musical style, and social presence on Audius.
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