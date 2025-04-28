// Analytics and Insights prompt

export const analyticsPrompt = {
  name: 'analytics',
  description: 'Get analytics and insights for tracks, artists, and overall performance',
  arguments: [
    {
      name: 'userId',
      description: 'ID of the artist to get analytics for',
      required: false,
    },
    {
      name: 'trackId',
      description: 'ID of the track to get analytics for',
      required: false,
    },
    {
      name: 'insightType',
      description: 'Type of insight to focus on',
      required: false,
      enum: ['listeners', 'trending', 'supporters', 'playMetrics', 'comprehensive']
    },
    {
      name: 'timePeriod',
      description: 'Time period to analyze',
      required: false,
      enum: ['week', 'month', 'year', 'allTime']
    }
  ],
};

// Handler for analytics prompt
export const handleAnalyticsPrompt = (args: { 
  userId?: string;
  trackId?: string;
  insightType?: string; // Changed from enum to string
  timePeriod?: string; // Changed from enum to string
}) => {
  // Build a user query for analytics
  let userMessage = '';
  
  // Track-specific analytics
  if (args.trackId && !args.userId) {
    userMessage = `I want to analyze the performance of track ${args.trackId} on Audius. `;
    
    if (args.insightType) {
      switch (args.insightType) {
        case 'listeners':
          userMessage += `I'm particularly interested in the listener demographics and who's engaging with this track. `;
          break;
        case 'trending':
          userMessage += `I'd like to see the trending performance and how it's been received over time. `;
          break;
        case 'playMetrics':
          userMessage += `I want to see the play count metrics and listen data. `;
          break;
        case 'comprehensive':
          userMessage += `Please provide a comprehensive analysis of all available metrics. `;
          break;
      }
    }
    
    if (args.timePeriod) {
      userMessage += `I'm interested in data from the past ${args.timePeriod}. `;
    }
    
    userMessage += `Can you provide insights into this track's performance?`;
  } 
  // Artist-specific analytics
  else if (args.userId && !args.trackId) {
    userMessage = `I want to analyze the performance of artist ${args.userId} on Audius. `;
    
    if (args.insightType) {
      switch (args.insightType) {
        case 'listeners':
          userMessage += `I'm particularly interested in the listener demographics and who's engaging with their music. `;
          break;
        case 'trending':
          userMessage += `I'd like to see their trending performance and how their music has been received over time. `;
          break;
        case 'supporters':
          userMessage += `I want to learn about their supporters and who's backing them. `;
          break;
        case 'playMetrics':
          userMessage += `I want to see their play count metrics across all their tracks. `;
          break;
        case 'comprehensive':
          userMessage += `Please provide a comprehensive analysis of all available metrics. `;
          break;
      }
    }
    
    if (args.timePeriod) {
      userMessage += `I'm interested in data from the past ${args.timePeriod}. `;
    }
    
    userMessage += `Can you provide insights into this artist's performance?`;
  } 
  // Both track and artist analytics
  else if (args.userId && args.trackId) {
    userMessage = `I want to analyze the performance of track ${args.trackId} by artist ${args.userId} on Audius. `;
    
    if (args.insightType) {
      switch (args.insightType) {
        case 'listeners':
          userMessage += `I'm particularly interested in the listener demographics and who's engaging with this track. `;
          break;
        case 'trending':
          userMessage += `I'd like to see how this track is trending compared to the artist's other content. `;
          break;
        case 'supporters':
          userMessage += `I want to learn about the supporters of this track and how they compare to the artist's overall supporter base. `;
          break;
        case 'playMetrics':
          userMessage += `I want to see the play metrics for this track and how they compare to the artist's other tracks. `;
          break;
        case 'comprehensive':
          userMessage += `Please provide a comprehensive analysis comparing this track to the artist's overall performance. `;
          break;
      }
    }
    
    if (args.timePeriod) {
      userMessage += `I'm interested in data from the past ${args.timePeriod}. `;
    }
    
    userMessage += `Can you provide insights into this track's performance in the context of the artist?`;
  } 
  // General analytics guidance
  else {
    userMessage = `I'm interested in getting analytics and insights on Audius. `;
    
    if (args.insightType) {
      switch (args.insightType) {
        case 'listeners':
          userMessage += `I want to understand listener demographics and engagement patterns. `;
          break;
        case 'trending':
          userMessage += `I want to learn about trending metrics and how content performs over time. `;
          break;
        case 'supporters':
          userMessage += `I'm curious about supporter relationships and how they impact performance. `;
          break;
        case 'playMetrics':
          userMessage += `I want to understand play count metrics and what they reveal about content. `;
          break;
        case 'comprehensive':
          userMessage += `I'd like a broad overview of all types of analytics available. `;
          break;
      }
    }
    
    userMessage += `Can you explain what analytics are available and how I can use them effectively?`;
  }
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, help the user understand analytics and insights on Audius:

1. For track-specific analytics:
   - Use 'track-listen-counts' to get play count data
   - Use 'track-top-listeners' to identify key listeners
   - Use 'track-listener-insights' for demographic analysis
   - Use 'track-monthly-trending' for trending performance

2. For artist-specific analytics:
   - Use 'user-track-listen-counts' for track performance
   - Use 'user-play-metrics' for aggregate play metrics
   - Use 'user-supporters' to identify supporters
   - Use 'user-supporting' to see supported artists

3. For comparative analysis:
   - Use both track and user tools to draw comparisons
   - Look for patterns across different metrics
   - Identify relationships between supporter base and play counts

4. For comprehensive insights:
   - Gather data from multiple tools
   - Identify key trends and patterns
   - Provide actionable recommendations based on the data

Organize the information in a clear, insightful way that helps the user understand performance and make data-driven decisions.
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