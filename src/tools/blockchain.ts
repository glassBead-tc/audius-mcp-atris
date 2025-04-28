import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';
import { RequestHandlerExtra } from '../types/index.js';

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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get wallet information from both chains
    const [solanaWallets, ethWallet] = await Promise.all([
      audiusClient.getUserSolanaWallets(args.userId),
      audiusClient.getUserEthereumWallet(args.userId).catch(() => null)
    ]);
    
    if ((!solanaWallets || solanaWallets.length === 0) && !ethWallet) {
      return createTextResponse(`No wallet information found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      solanaWallets: solanaWallets || [],
      ethereumWallet: ethWallet,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-wallets tool:', error);
    return createTextResponse(
      `Error getting user wallets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 20;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get transaction history
    const transactions = await audiusClient.getUserTransactionHistory(args.userId, limit);
    
    if (!transactions || transactions.length === 0) {
      return createTextResponse(`No transaction history found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      transactionCount: transactions.length,
      transactions: transactions,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in transaction-history tool:', error);
    return createTextResponse(`Error getting transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
};

// Schema for available-challenges tool
export const availableChallengesSchema = {
  type: 'object',
  properties: {},
};

// Implementation of available-challenges tool
export const getAvailableChallenges = async (_args: undefined, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Get available challenges
    const challenges = await audiusClient.getAvailableChallenges();
    
    if (!challenges || challenges.length === 0) {
      return createTextResponse(`No available challenges found.`);
    }
    
    // Format results
    const formattedResults = {
      challengeCount: challenges.length,
      challenges: challenges,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in available-challenges tool:', error);
    return createTextResponse(`Error getting available challenges: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get claimable tokens
    const claimableTokens = await audiusClient.getUserClaimableTokens(args.userId);
    
    // Get undisbursed challenges
    const undisbursedChallenges = await audiusClient.getUserUndisbursedChallenges(args.userId);
    
    if ((!claimableTokens || claimableTokens.length === 0) && 
        (!undisbursedChallenges || undisbursedChallenges.length === 0)) {
      return createTextResponse(`No claimable tokens or undisbursed challenges found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      claimableTokens: claimableTokens || [],
      undisbursedChallenges: undisbursedChallenges || [],
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-claimable-tokens tool:', error);
    return createTextResponse(`Error getting user claimable tokens: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Claim tokens
    const result = await audiusClient.claimTokens(args.userId, args.challengeId);
    
    if (!result) {
      return createTextResponse(`Failed to claim tokens for challenge ${args.challengeId}.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      challengeId: args.challengeId,
      timestamp: new Date().toISOString(),
      status: 'claimed',
      result: result,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in claim-tokens tool:', error);
    return createTextResponse(`Error claiming tokens: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    let balance;
    
    // Different API calls based on blockchain
    if (args.blockchain === 'ethereum') {
      balance = await audiusClient.getAudioTokenBalance(args.walletAddress);
    } else if (args.blockchain === 'solana') {
      // If tokenMint not provided, default to AUDIO token on Solana
      const tokenMint = args.tokenMint || 'AUDIO_TOKEN_MINT_ADDRESS';
      balance = await audiusClient.getSolanaTokenBalance(args.walletAddress, tokenMint);
    } else {
      return createTextResponse(`Invalid blockchain selected. Must be 'ethereum' or 'solana'.`, true);
    }
    
    if (!balance) {
      return createTextResponse(`Unable to retrieve balance for wallet ${args.walletAddress}.`, true);
    }
    
    // Format results
    const formattedResults = {
      walletAddress: args.walletAddress,
      blockchain: args.blockchain,
      tokenMint: args.tokenMint,
      balance: balance,
      timestamp: new Date().toISOString()
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in token-balance tool:', error);
    return createTextResponse(`Error getting token balance: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
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
}, extra: RequestHandlerExtra) => {
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
      return createTextResponse(`Failed to send tokens.`, true);
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
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in send-tokens tool:', error);
    return createTextResponse(`Error sending tokens: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
};