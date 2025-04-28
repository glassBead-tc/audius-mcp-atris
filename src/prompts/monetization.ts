// Monetization and premium content prompt

export const monetizationPrompt = {
  name: 'monetization',
  description: 'Get information about monetization options, premium content, and tipping on Audius',
  arguments: [
    {
      name: 'userId',
      description: 'ID of the user to get monetization info for',
      required: false,
    },
    {
      name: 'trackId',
      description: 'ID of the track to check monetization for',
      required: false,
    },
    {
      name: 'walletAddress',
      description: 'Wallet address to check access with',
      required: false,
    },
    {
      name: 'monetizationType',
      description: 'Type of monetization to focus on',
      required: false,
      enum: ['nft-gates', 'purchase-gates', 'tipping', 'usdc-payments', 'all']
    }
  ],
};

// Handler for monetization prompt
export const handleMonetizationPrompt = (args: {
  userId?: string;
  trackId?: string;
  walletAddress?: string;
  monetizationType?: string; // Changed from enum to string
}) => {
  // Build a user query for monetization
  let userMessage = '';
  
  // Track-specific monetization info
  if (args.trackId && !args.userId) {
    userMessage = `I want to understand the monetization options for track ${args.trackId} on Audius. `;
    
    if (args.walletAddress) {
      userMessage += `I have the wallet ${args.walletAddress} and want to check access. `;
    }
    
    if (args.monetizationType) {
      switch (args.monetizationType) {
        case 'nft-gates':
          userMessage += `I'm particularly interested in NFT-gated access requirements. `;
          break;
        case 'purchase-gates':
          userMessage += `I'd like to know about purchase options for this track. `;
          break;
        case 'usdc-payments':
          userMessage += `I want to understand USDC payment options for this track. `;
          break;
        case 'tipping':
          userMessage += `I'm curious about tipping the creator of this track. `;
          break;
        case 'all':
          userMessage += `Please tell me about all available monetization features for this track. `;
          break;
      }
    }
    
    userMessage += `Can you provide information about the monetization for this track?`;
  } 
  // User-specific monetization info
  else if (args.userId && !args.trackId) {
    userMessage = `I'm interested in monetization information for user ${args.userId} on Audius. `;
    
    if (args.monetizationType) {
      switch (args.monetizationType) {
        case 'nft-gates':
          userMessage += `I'm particularly interested in their NFT-gated content. `;
          break;
        case 'purchase-gates':
          userMessage += `I'd like to know about their premium purchasable content. `;
          break;
        case 'usdc-payments':
          userMessage += `I want to understand USDC payment options for their content. `;
          break;
        case 'tipping':
          userMessage += `I'm curious about their tipping activity and history. `;
          break;
        case 'all':
          userMessage += `Please tell me about all monetization aspects for this user. `;
          break;
      }
    }
    
    userMessage += `Can you provide monetization insights for this user?`;
  } 
  // General monetization info
  else {
    userMessage = `I'd like to learn about the monetization options available on Audius. `;
    
    if (args.monetizationType) {
      switch (args.monetizationType) {
        case 'nft-gates':
          userMessage += `I'm particularly interested in how NFT-gated content works. `;
          break;
        case 'purchase-gates':
          userMessage += `I'd like to know about purchasing premium content. `;
          break;
        case 'usdc-payments':
          userMessage += `I want to understand USDC payment functionality. `;
          break;
        case 'tipping':
          userMessage += `I'm curious about the tipping system. `;
          break;
        case 'all':
          userMessage += `Please give me an overview of all monetization features. `;
          break;
      }
    }
    
    userMessage += `Can you explain how these monetization features work on Audius?`;
  }
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, help the user understand monetization on Audius:

1. For NFT-gated content:
   - Use 'track-access-gates' to check access requirements
   - Use 'check-nft-access' to verify wallet access
   - Explain how NFT-gating works on Audius

2. For purchasable content:
   - Use 'purchase-options' to show buying options
   - Use 'check-purchase-access' for access verification
   - Use 'supported-payment-tokens' to explain payment methods

3. For USDC payments:
   - Use 'usdc-gate-info' to get USDC-specific details
   - Explain stablecoin benefits for content sales

4. For tipping:
   - Use 'user-tip-stats' to show tipping activity
   - Use 'get-sent-tips' and 'get-received-tips' for history
   - Explain the economic benefits of tipping for creators

5. For wallets and payment methods:
   - Explain connection between wallets and monetization
   - Describe supported tokens and blockchains
   - Emphasize security best practices with sensitive data

Provide clear, practical explanations tailored to the user's specific interests about monetization.
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