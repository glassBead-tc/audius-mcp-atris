// Blockchain and wallet management prompt

export const blockchainPrompt = {
  name: 'blockchain',
  description: 'Get information and guidance on blockchain features like wallets, tokens, and transactions',
  arguments: [
    {
      name: 'userId',
      description: 'ID of the user to get blockchain info for',
      required: false,
    },
    {
      name: 'walletAddress',
      description: 'Wallet address to check (if not using userId)',
      required: false,
    },
    {
      name: 'blockchain',
      description: 'Blockchain to focus on',
      required: false,
      enum: ['ethereum', 'solana', 'both']
    },
    {
      name: 'focus',
      description: 'Specific aspect of blockchain to focus on',
      required: false,
      enum: ['wallets', 'tokens', 'transactions', 'rewards', 'general']
    }
  ],
};

// Handler for blockchain prompt
export const handleBlockchainPrompt = (args: {
  userId?: string;
  walletAddress?: string;
  blockchain?: 'ethereum' | 'solana' | 'both';
  focus?: 'wallets' | 'tokens' | 'transactions' | 'rewards' | 'general';
}) => {
  // Build a user query for blockchain
  let userMessage = '';
  
  // User-specific blockchain info
  if (args.userId) {
    userMessage = `I'd like information about the blockchain accounts for user ${args.userId} on Audius. `;
    
    if (args.focus) {
      switch (args.focus) {
        case 'wallets':
          userMessage += `I'm specifically interested in their wallet connections. `;
          break;
        case 'tokens':
          userMessage += `I want to know about their token balances. `;
          break;
        case 'transactions':
          userMessage += `I'd like to see their transaction history. `;
          break;
        case 'rewards':
          userMessage += `I want to know about their rewards and claimable tokens. `;
          break;
        case 'general':
          userMessage += `I'd like a general overview of their blockchain activity. `;
          break;
      }
    }
    
    if (args.blockchain) {
      switch (args.blockchain) {
        case 'ethereum':
          userMessage += `Please focus on Ethereum-related information. `;
          break;
        case 'solana':
          userMessage += `Please focus on Solana-related information. `;
          break;
        case 'both':
          userMessage += `Please include information from both Ethereum and Solana. `;
          break;
      }
    }
    
    userMessage += `Can you provide this blockchain information?`;
  }
  // Wallet-specific blockchain info
  else if (args.walletAddress) {
    userMessage = `I'd like information about the wallet address ${args.walletAddress} on Audius. `;
    
    if (args.blockchain) {
      switch (args.blockchain) {
        case 'ethereum':
          userMessage += `This is an Ethereum wallet. `;
          break;
        case 'solana':
          userMessage += `This is a Solana wallet. `;
          break;
        default:
          userMessage += `I'm not sure which blockchain this wallet is on. `;
          break;
      }
    }
    
    if (args.focus) {
      switch (args.focus) {
        case 'tokens':
          userMessage += `I'm specifically interested in token balances for this wallet. `;
          break;
        case 'transactions':
          userMessage += `I'd like to see transaction history for this wallet. `;
          break;
        default:
          userMessage += `I'd like general information about this wallet. `;
          break;
      }
    }
    
    userMessage += `Can you provide this wallet information?`;
  }
  // General blockchain info
  else {
    userMessage = `I'd like to learn about the blockchain features on Audius. `;
    
    if (args.focus) {
      switch (args.focus) {
        case 'wallets':
          userMessage += `I'm specifically interested in wallet connections and management. `;
          break;
        case 'tokens':
          userMessage += `I want to understand the token system. `;
          break;
        case 'transactions':
          userMessage += `I'd like to learn about on-chain transactions. `;
          break;
        case 'rewards':
          userMessage += `I want to know about rewards and challenges. `;
          break;
        case 'general':
          userMessage += `I'd like a broad overview of blockchain integration. `;
          break;
      }
    }
    
    if (args.blockchain) {
      switch (args.blockchain) {
        case 'ethereum':
          userMessage += `Please focus on Ethereum-related features. `;
          break;
        case 'solana':
          userMessage += `Please focus on Solana-related features. `;
          break;
        case 'both':
          userMessage += `Please include information about both Ethereum and Solana. `;
          break;
      }
    }
    
    userMessage += `Can you explain how blockchain works on Audius?`;
  }
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, help the user understand blockchain features on Audius:

1. For wallet information:
   - Use 'user-wallets' to get wallet connections
   - Explain the multi-chain nature of Audius (Ethereum and Solana)
   - Describe how wallet connections work

2. For token information:
   - Use 'token-balance' to check balances
   - Explain the AUDIO token and its utility
   - Describe how tokens work across chains

3. For transaction information:
   - Use 'transaction-history' to view user transactions
   - Explain transaction types and meanings
   - Note the differences between chain-specific transactions

4. For rewards and challenges:
   - Use 'available-challenges' to show current opportunities
   - Use 'user-claimable-tokens' to check rewards
   - Explain how the reward system works

5. For sending tokens:
   - Explain that you'd typically use 'send-tokens' but remind users about wallet security
   - Emphasize never sharing private keys
   - Describe proper token transfer workflows

Provide clear, accurate information while emphasizing blockchain security best practices.
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