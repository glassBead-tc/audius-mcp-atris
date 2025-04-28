// Track analysis prompt

export const trackAnalysisPrompt = {
  name: 'track-analysis',
  description: 'Analyze a track and get insights about it',
  arguments: [
    {
      name: 'trackId',
      description: 'ID of the track to analyze',
      required: true,
    },
  ],
};

// Handler for track-analysis prompt
export const handleTrackAnalysisPrompt = (args: { trackId: string }) => {
  // Create a user query for track analysis
  const userMessage = `I'd like you to analyze the track with ID ${args.trackId} on Audius. Please use the get-track tool to retrieve the track information, and provide insights about:
1. The artist and their style
2. The genre and musical characteristics
3. Any notable features or collaborations
4. Similar tracks or artists that fans might enjoy

Please make your analysis detailed and insightful for music fans.`;
  
  // Create messages for the prompt with proper typing
  const messages = [
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