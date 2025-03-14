// Music creation and collaboration prompt

export const musicCreationPrompt = {
  name: 'music-creation',
  description: 'Guide for creating and publishing music on Audius',
  arguments: [
    {
      name: 'trackTitle',
      description: 'Title for the track to create',
      required: true,
    },
    {
      name: 'userId',
      description: 'ID of the user creating the track',
      required: true,
    },
    {
      name: 'genre',
      description: 'Genre of the track',
      required: false,
    },
    {
      name: 'mood',
      description: 'Mood of the track',
      required: false,
    },
    {
      name: 'creationGoal',
      description: 'The specific goal for this music creation session',
      required: false,
      enum: ['publish-track', 'remix-track', 'collaborate', 'plan-release']
    }
  ],
};

// Handler for music-creation prompt
export const handleMusicCreationPrompt = (args: { 
  trackTitle: string;
  userId: string;
  genre?: string;
  mood?: string;
  creationGoal?: 'publish-track' | 'remix-track' | 'collaborate' | 'plan-release';
}) => {
  // Build a user query for music creation
  let userMessage = `I'm working on a track called "${args.trackTitle}" `;
  
  if (args.genre) {
    userMessage += `in the ${args.genre} genre `;
  }
  
  if (args.mood) {
    userMessage += `with a ${args.mood} mood `;
  }
  
  if (args.creationGoal) {
    switch (args.creationGoal) {
      case 'publish-track':
        userMessage += `and I'm ready to publish it on Audius. Can you guide me through the process of uploading and promoting my track?`;
        break;
      case 'remix-track':
        userMessage += `and I want to create a remix of an existing track. Can you help me understand how remixes work on Audius and guide me through the process?`;
        break;
      case 'collaborate':
        userMessage += `and I'm looking to collaborate with other artists. Can you suggest ways to find collaborators and manage a collaborative project on Audius?`;
        break;
      case 'plan-release':
        userMessage += `and I'm planning a release strategy. Can you help me understand the best practices for releasing music on Audius, including promotion and audience building?`;
        break;
      default:
        userMessage += `and I'd like guidance on creating and publishing it on Audius.`;
    }
  } else {
    userMessage += `and I'd like guidance on creating and publishing it on Audius.`;
  }
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, help the user with their music creation and publishing process:

1. For track publishing:
   - Explain how to use the 'upload-track' tool
   - Provide best practices for metadata, tags, and artwork
   - Suggest strategies for promotion

2. For track updates:
   - Explain how to use the 'update-track' tool
   - Provide guidance on when to update vs. create new versions

3. For social engagement:
   - Suggest how to use comments to engage with listeners
   - Explain the importance of social features (reposts, favorites)
   - Discuss building an audience on Audius

4. For music discovery:
   - Explain how trending algorithms work
   - Suggest genre-appropriate tags and metadata

Provide practical, actionable advice tailored to the user's genre and goals.
  `;
  
  // Create messages for the prompt
  const messages = [
    {
      role: 'system',
      content: {
        type: 'text',
        text: systemMessage,
      },
    },
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