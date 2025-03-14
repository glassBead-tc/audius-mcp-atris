// Example of how an LLM can interact with the Audius MCP server

/**
 * This file shows examples of how an LLM should interact with the Audius MCP server.
 * These examples demonstrate the patterns for calling tools, accessing resources,
 * and using prompts to provide comprehensive music-related functionality.
 */

// Example: Basic search for tracks
async function searchTracksExample() {
  // The LLM should format the call like this:
  const request = {
    method: 'call_tool',
    params: {
      name: 'search-tracks',
      arguments: {
        query: 'electronic dance music',
        limit: 5
      }
    }
  };
  
  // The response will be in this format:
  const exampleResponse = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          query: 'electronic dance music',
          tracks: [
            {
              id: '12345',
              title: 'Summer Vibes',
              user: { id: '789', name: 'DJ Awesome' },
              duration: 180,
              artwork: { url: 'https://example.com/artwork.jpg' },
              // ...more track details
            },
            // ...more tracks
          ]
        }, null, 2)
      }
    ]
  };
  
  // The LLM should then use this data to provide a helpful response
  // For example: "I found some electronic dance tracks for you. 'Summer Vibes' by DJ Awesome is a popular one."
}

// Example: Get details about an artist and their music
async function artistProfileExample() {
  // Step 1: Use the artist-profile prompt for a guided experience
  const promptRequest = {
    method: 'get_prompt',
    params: {
      name: 'artist-profile',
      arguments: {
        userId: '789',
        includeConnections: true,
        includePopularContent: true
      }
    }
  };
  
  // The response will include system and user messages
  const promptResponse = {
    messages: [
      {
        role: 'system',
        content: {
          type: 'text',
          text: 'To create a comprehensive artist profile, use these tools...'
        }
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: "I'd like to learn more about DJ Awesome. Can you tell me about their style, popular tracks, and connections in the Audius community?"
        }
      }
    ]
  };
  
  // Step 2: The LLM should follow the instructions and use multiple tools
  // For example, get the artist's details
  const userRequest = {
    method: 'call_tool',
    params: {
      name: 'get-user',
      arguments: {
        userId: '789'
      }
    }
  };
  
  // Step 3: Get the artist's tracks
  const tracksRequest = {
    method: 'call_tool',
    params: {
      name: 'get-user-tracks',
      arguments: {
        userId: '789',
        limit: 10
      }
    }
  };
  
  // Step 4: Get the artist's followers
  const followersRequest = {
    method: 'call_tool',
    params: {
      name: 'user-followers',
      arguments: {
        userId: '789',
        limit: 5
      }
    }
  };
  
  // The LLM should combine all this information into a comprehensive profile
  // "DJ Awesome is an electronic music producer with 10,000 followers. Their most popular track is 'Summer Vibes'..."
}

// Example: Create a playlist based on user preferences
async function createPlaylistExample() {
  // Step 1: Search for tracks matching the theme
  const searchRequest = {
    method: 'call_tool',
    params: {
      name: 'advanced-search',
      arguments: {
        query: 'relaxing',
        genres: ['Ambient', 'Chillout'],
        moods: ['Relaxing'],
        limit: 10
      }
    }
  };
  
  // Step 2: Create a new playlist
  const createPlaylistRequest = {
    method: 'call_tool',
    params: {
      name: 'create-playlist',
      arguments: {
        userId: '123',
        playlistName: 'Evening Relaxation',
        description: 'Calm ambient tracks for relaxing in the evening',
        isPrivate: false
      }
    }
  };
  
  // The response will include the new playlist ID
  const playlistResponse = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          playlistId: '456',
          message: 'Playlist created successfully'
        })
      }
    ]
  };
  
  // Step 3: Add the tracks to the playlist
  const addTracksRequest = {
    method: 'call_tool',
    params: {
      name: 'add-tracks-to-playlist',
      arguments: {
        userId: '123',
        playlistId: '456',
        trackIds: ['789', '101112', '131415']
      }
    }
  };
  
  // The LLM should then provide a summary of the action
  // "I've created a new playlist called 'Evening Relaxation' with 3 ambient tracks that are perfect for unwinding."
}

// Example: Get and analyze track analytics
async function trackAnalyticsExample() {
  // Step 1: Get listen counts for a track
  const listenCountsRequest = {
    method: 'call_tool',
    params: {
      name: 'track-listen-counts',
      arguments: {
        trackId: '12345'
      }
    }
  };
  
  // Step 2: Get top listeners
  const topListenersRequest = {
    method: 'call_tool',
    params: {
      name: 'track-top-listeners',
      arguments: {
        trackId: '12345',
        limit: 5
      }
    }
  };
  
  // Step 3: Get listener insights
  const insightsRequest = {
    method: 'call_tool',
    params: {
      name: 'track-listener-insights',
      arguments: {
        trackId: '12345'
      }
    }
  };
  
  // The LLM should analyze this data and provide insights
  // "Your track has 10,000 plays with most listeners coming from the US and Germany. It's most popular among 18-24 year olds."
}

// Example: Working with blockchain features
async function blockchainExample() {
  // Step 1: Get user's wallet information
  const walletRequest = {
    method: 'call_tool',
    params: {
      name: 'user-wallets',
      arguments: {
        userId: '123'
      }
    }
  };
  
  // Step 2: Get token balance
  const balanceRequest = {
    method: 'call_tool',
    params: {
      name: 'token-balance',
      arguments: {
        walletAddress: '0x123abc...',
        blockchain: 'ethereum'
      }
    }
  };
  
  // Step 3: Send a tip to an artist
  const tipRequest = {
    method: 'call_tool',
    params: {
      name: 'send-tip',
      arguments: {
        senderUserId: '123',
        receiverUserId: '456',
        amount: '5',
        tokenType: 'AUDIO',
        senderWalletAddress: '0x123abc...',
        signerPrivateKey: '0xprivate...',
        message: 'Love your music!'
      }
    }
  };
  
  // The LLM should provide helpful context about these blockchain interactions
  // "I've sent a 5 AUDIO token tip to the artist. Your current balance is now 95 AUDIO tokens."
}

// These examples demonstrate the patterns for how LLMs should interact with the Audius MCP server
// Using these patterns, LLMs can provide comprehensive music-related functionality to users