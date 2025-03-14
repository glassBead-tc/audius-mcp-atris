import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for user-wallets tool
export const userWalletsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get wallet information for',
    },
  },
  required: ['userId'],
};

// Implementation of user-wallets tool
export const getUserWallets = async (args: { 
  userId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Get wallet information from both chains
    const [solanaWallets, ethWallet] = await Promise.all([
      audiusClient.getUserSolanaWallets(args.userId),
      audiusClient.getUserEthereumWallet(args.userId).catch(() => null)
    ]);
    
    if ((!solanaWallets || solanaWallets.length === 0) && !ethWallet) {
      return {
        content: [{
          type: 'text',
          text: `No wallet information found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      solanaWallets: solanaWallets || [],
      ethereumWallet: ethWallet,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-wallets tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting user wallets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for transaction-history tool
export const transactionHistorySchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get transaction history for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of transactions to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Implementation of transaction-history tool
export const getTransactionHistory = async (args: { 
  userId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 20;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Get transaction history
    const transactions = await audiusClient.getUserTransactionHistory(args.userId, limit);
    
    if (!transactions || transactions.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No transaction history found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      transactionCount: transactions.length,
      transactions: transactions,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in transaction-history tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for available-challenges tool
export const availableChallengesSchema = {
  type: 'object',
  properties: {},
};

// Implementation of available-challenges tool
export const getAvailableChallenges = async () => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Get available challenges
    const challenges = await audiusClient.getAvailableChallenges();
    
    if (!challenges || challenges.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No available challenges found.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      challengeCount: challenges.length,
      challenges: challenges,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in available-challenges tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting available challenges: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-claimable-tokens tool
export const userClaimableTokensSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get claimable tokens for',
    },
  },
  required: ['userId'],
};

// Implementation of user-claimable-tokens tool
export const getUserClaimableTokens = async (args: { 
  userId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Get claimable tokens
    const claimableTokens = await audiusClient.getUserClaimableTokens(args.userId);
    
    // Get undisbursed challenges
    const undisbursedChallenges = await audiusClient.getUserUndisbursedChallenges(args.userId);
    
    if ((!claimableTokens || claimableTokens.length === 0) && 
        (!undisbursedChallenges || undisbursedChallenges.length === 0)) {
      return {
        content: [{
          type: 'text',
          text: `No claimable tokens or undisbursed challenges found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      claimableTokens: claimableTokens || [],
      undisbursedChallenges: undisbursedChallenges || [],
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-claimable-tokens tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting user claimable tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for claim-tokens tool
export const claimTokensSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user claiming tokens',
    },
    challengeId: {
      type: 'string',
      description: 'ID of the challenge to claim tokens for',
    },
  },
  required: ['userId', 'challengeId'],
};

// Implementation of claim-tokens tool
export const claimTokens = async (args: { 
  userId: string;
  challengeId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Claim tokens
    const result = await audiusClient.claimTokens(args.userId, args.challengeId);
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to claim tokens for challenge ${args.challengeId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      challengeId: args.challengeId,
      timestamp: new Date().toISOString(),
      status: 'claimed',
      result: result,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in claim-tokens tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error claiming tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for token-balance tool
export const tokenBalanceSchema = {
  type: 'object',
  properties: {
    walletAddress: {
      type: 'string',
      description: 'Wallet address to check token balance for',
    },
    blockchain: {
      type: 'string',
      enum: ['ethereum', 'solana'],
      description: 'Blockchain network (ethereum or solana)',
    },
    tokenMint: {
      type: 'string',
      description: 'Token mint address (required for Solana SPL tokens)',
    },
  },
  required: ['walletAddress', 'blockchain'],
};

// Implementation of token-balance tool
export const getTokenBalance = async (args: { 
  walletAddress: string;
  blockchain: 'ethereum' | 'solana';
  tokenMint?: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    let balance;
    // Check token balance based on blockchain
    if (args.blockchain === 'ethereum') {
      balance = await audiusClient.getAudioTokenBalance(args.walletAddress);
    } else if (args.blockchain === 'solana') {
      if (!args.tokenMint) {
        return {
          content: [{
            type: 'text',
            text: `Token mint address is required for Solana SPL tokens.`,
          }],
          isError: true
        };
      }
      
      balance = await audiusClient.getSolanaTokenBalance(args.walletAddress, args.tokenMint);
    } else {
      return {
        content: [{
          type: 'text',
          text: `Invalid blockchain specified. Use 'ethereum' or 'solana'.`,
        }],
        isError: true
      };
    }
    
    if (!balance) {
      return {
        content: [{
          type: 'text',
          text: `No token balance found for wallet ${args.walletAddress} on ${args.blockchain}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      walletAddress: args.walletAddress,
      blockchain: args.blockchain,
      tokenMint: args.tokenMint,
      balance: balance,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in token-balance tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting token balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for send-tokens tool
export const sendTokensSchema = {
  type: 'object',
  properties: {
    senderWalletAddress: {
      type: 'string',
      description: 'Wallet address of the sender',
    },
    receiverWalletAddress: {
      type: 'string',
      description: 'Wallet address of the receiver',
    },
    amount: {
      type: 'string',
      description: 'Amount of tokens to send',
    },
    privateKey: {
      type: 'string',
      description: 'Private key of the sender wallet (IMPORTANT: only use for testing!)',
    },
  },
  required: ['senderWalletAddress', 'receiverWalletAddress', 'amount', 'privateKey'],
};

// Implementation of send-tokens tool
export const sendTokens = async (args: { 
  senderWalletAddress: string;
  receiverWalletAddress: string;
  amount: string;
  privateKey: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // IMPORTANT NOTE: In a real implementation, you would NEVER handle private keys directly.
    // This is just for demonstration purposes and should use a secure wallet connection method.
    
    // Send tokens
    const result = await audiusClient.sendAudioTokens({
      senderWalletAddress: args.senderWalletAddress,
      receiverWalletAddress: args.receiverWalletAddress,
      amount: args.amount,
      privateKey: args.privateKey
    });
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to send tokens.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      senderWalletAddress: args.senderWalletAddress,
      receiverWalletAddress: args.receiverWalletAddress,
      amount: args.amount,
      timestamp: new Date().toISOString(),
      status: 'sent',
      transactionHash: result.transactionHash || 'unknown',
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in send-tokens tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error sending tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};