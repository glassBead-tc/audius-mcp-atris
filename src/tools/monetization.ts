import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for track-access-gates tool
export const trackAccessGatesSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to get access gates for',
    },
  },
  required: ['trackId'],
};

// Implementation of track-access-gates tool
export const getTrackAccessGates = async (args: { 
  trackId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Get track access gates
    const accessGates = await audiusClient.getTrackAccessGates(args.trackId);
    
    if (!accessGates) {
      return {
        content: [{
          type: 'text',
          text: `No access gates found for track ${args.trackId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      accessGates: accessGates,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in track-access-gates tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting track access gates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for check-nft-access tool
export const checkNftAccessSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the NFT-gated track',
    },
    walletAddress: {
      type: 'string',
      description: 'Wallet address to check access for',
    },
  },
  required: ['trackId', 'walletAddress'],
};

// Implementation of check-nft-access tool
export const checkNftAccess = async (args: { 
  trackId: string;
  walletAddress: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Check NFT access
    const accessResult = await audiusClient.checkNftGatedAccess(args.trackId, args.walletAddress);
    
    if (!accessResult) {
      return {
        content: [{
          type: 'text',
          text: `Could not determine NFT access for track ${args.trackId} with wallet ${args.walletAddress}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      walletAddress: args.walletAddress,
      hasAccess: accessResult.hasAccess || false,
      missingNfts: accessResult.missingNfts || [],
      accessDetails: accessResult
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in check-nft-access tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error checking NFT access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for nft-gated-signature tool
export const nftGatedSignatureSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the NFT-gated track',
    },
    walletAddress: {
      type: 'string',
      description: 'Wallet address to get signature for',
    },
  },
  required: ['trackId', 'walletAddress'],
};

// Implementation of nft-gated-signature tool
export const getNftGatedSignature = async (args: { 
  trackId: string;
  walletAddress: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Get NFT gated signature
    const signature = await audiusClient.getNftGatedTrackSignature(args.trackId, args.walletAddress);
    
    if (!signature) {
      return {
        content: [{
          type: 'text',
          text: `No NFT signature available for track ${args.trackId} with wallet ${args.walletAddress}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      walletAddress: args.walletAddress,
      signature: signature,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in nft-gated-signature tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting NFT gated signature: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for purchase-options tool
export const purchaseOptionsSchema = {
  type: 'object',
  properties: {
    contentId: {
      type: 'string',
      description: 'ID of the content to check purchase options for',
    },
    contentType: {
      type: 'string',
      enum: ['track', 'playlist'],
      description: 'Type of content (track or playlist)',
    },
  },
  required: ['contentId', 'contentType'],
};

// Implementation of purchase-options tool
export const getPurchaseOptions = async (args: {
  contentId: string;
  contentType: 'track' | 'playlist';
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify content exists
    try {
      if (args.contentType === 'track') {
        await audiusClient.getTrack(args.contentId);
      } else if (args.contentType === 'playlist') {
        await audiusClient.getPlaylist(args.contentId);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify ${args.contentType}. Please check the provided ID.`,
        }],
        isError: true
      };
    }
    
    // Get purchase options
    const options = await audiusClient.getPurchaseOptions(args.contentId, args.contentType);
    
    if (!options || options.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No purchase options found for ${args.contentType} ${args.contentId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      contentId: args.contentId,
      contentType: args.contentType,
      purchaseOptions: options,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in purchase-options tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting purchase options: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for check-purchase-access tool
export const checkPurchaseAccessSchema = {
  type: 'object',
  properties: {
    contentId: {
      type: 'string',
      description: 'ID of the purchase-gated content',
    },
    contentType: {
      type: 'string',
      enum: ['track', 'playlist'],
      description: 'Type of content (track or playlist)',
    },
    walletAddress: {
      type: 'string',
      description: 'Wallet address to check access for',
    },
  },
  required: ['contentId', 'contentType', 'walletAddress'],
};

// Implementation of check-purchase-access tool
export const checkPurchaseAccess = async (args: {
  contentId: string;
  contentType: 'track' | 'playlist';
  walletAddress: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify content exists
    try {
      if (args.contentType === 'track') {
        await audiusClient.getTrack(args.contentId);
      } else if (args.contentType === 'playlist') {
        await audiusClient.getPlaylist(args.contentId);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify ${args.contentType}. Please check the provided ID.`,
        }],
        isError: true
      };
    }
    
    // Check purchase access
    const accessResult = await audiusClient.checkPurchaseGatedAccess(
      args.contentId,
      args.contentType,
      args.walletAddress
    );
    
    if (!accessResult) {
      return {
        content: [{
          type: 'text',
          text: `Could not determine purchase access for ${args.contentType} ${args.contentId} with wallet ${args.walletAddress}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      contentId: args.contentId,
      contentType: args.contentType,
      walletAddress: args.walletAddress,
      hasAccess: accessResult.hasAccess || false,
      accessDetails: accessResult
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in check-purchase-access tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error checking purchase access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for supported-payment-tokens tool
export const supportedPaymentTokensSchema = {
  type: 'object',
  properties: {},
};

// Implementation of supported-payment-tokens tool
export const getSupportedPaymentTokens = async () => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Get supported payment tokens
    const tokens = await audiusClient.getSupportedPaymentTokens();
    
    if (!tokens || tokens.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No supported payment tokens found.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      supportedTokens: tokens,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in supported-payment-tokens tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting supported payment tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for usdc-gate-info tool
export const usdcGateInfoSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the USDC-gated track',
    },
  },
  required: ['trackId'],
};

// Implementation of usdc-gate-info tool
export const getUsdcGateInfo = async (args: { 
  trackId: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.trackId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Get USDC gate info
    const gateInfo = await audiusClient.getUsdcGateInfo(args.trackId);
    
    if (!gateInfo) {
      return {
        content: [{
          type: 'text',
          text: `No USDC gate information found for track ${args.trackId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      usdcGateInfo: gateInfo,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in usdc-gate-info tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting USDC gate info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for send-tip tool
export const sendTipSchema = {
  type: 'object',
  properties: {
    senderUserId: {
      type: 'string',
      description: 'ID of the user sending the tip',
    },
    receiverUserId: {
      type: 'string',
      description: 'ID of the user receiving the tip',
    },
    amount: {
      type: 'string',
      description: 'Amount to tip',
    },
    tokenType: {
      type: 'string',
      enum: ['AUDIO', 'USDC', 'SOL'],
      description: 'Type of token to send',
    },
    senderWalletAddress: {
      type: 'string',
      description: 'Wallet address of the sender',
    },
    signerPrivateKey: {
      type: 'string',
      description: 'Private key of the sender wallet (IMPORTANT: only use for testing!)',
    },
    message: {
      type: 'string',
      description: 'Optional message to include with the tip',
    },
  },
  required: ['senderUserId', 'receiverUserId', 'amount', 'tokenType', 'senderWalletAddress', 'signerPrivateKey'],
};

// Implementation of send-tip tool
export const sendTip = async (args: {
  senderUserId: string;
  receiverUserId: string;
  amount: string;
  tokenType: 'AUDIO' | 'USDC' | 'SOL';
  senderWalletAddress: string;
  signerPrivateKey: string;
  message?: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify users exist
    try {
      await Promise.all([
        audiusClient.getUser(args.senderUserId),
        audiusClient.getUser(args.receiverUserId)
      ]);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify users. Please check the provided user IDs.`,
        }],
        isError: true
      };
    }
    
    // IMPORTANT NOTE: In a real implementation, you would NEVER handle private keys directly.
    // This is just for demonstration purposes and should use a secure wallet connection method.
    
    // Send tip
    const result = await audiusClient.sendTip({
      senderUserId: args.senderUserId,
      receiverUserId: args.receiverUserId,
      amount: args.amount,
      tokenType: args.tokenType,
      senderWalletAddress: args.senderWalletAddress,
      signerPrivateKey: args.signerPrivateKey,
      message: args.message
    });
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to send tip.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      senderUserId: args.senderUserId,
      receiverUserId: args.receiverUserId,
      amount: args.amount,
      tokenType: args.tokenType,
      message: args.message,
      timestamp: new Date().toISOString(),
      status: 'sent',
      tipDetails: result
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in send-tip tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error sending tip: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for get-sent-tips tool
export const getSentTipsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get sent tips for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of tips to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Implementation of get-sent-tips tool
export const getSentTips = async (args: {
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
    
    // Get sent tips
    const tips = await audiusClient.getSentTips(args.userId, limit);
    
    if (!tips || tips.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No sent tips found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      tipCount: tips.length,
      sentTips: tips,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-sent-tips tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting sent tips: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for get-received-tips tool
export const getReceivedTipsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get received tips for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of tips to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Implementation of get-received-tips tool
export const getReceivedTips = async (args: {
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
    
    // Get received tips
    const tips = await audiusClient.getReceivedTips(args.userId, limit);
    
    if (!tips || tips.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No received tips found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      tipCount: tips.length,
      receivedTips: tips,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-received-tips tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting received tips: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-tip-stats tool
export const userTipStatsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get tip stats for',
    },
  },
  required: ['userId'],
};

// Implementation of user-tip-stats tool
export const getUserTipStats = async (args: {
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
    
    // Get tip stats
    const stats = await audiusClient.getUserTipStats(args.userId);
    
    if (!stats) {
      return {
        content: [{
          type: 'text',
          text: `No tip stats found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      tipStats: stats,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-tip-stats tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting user tip stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for purchase-track tool
export const purchaseTrackSchema = {
  type: 'object',
  properties: {
    contentId: {
      type: 'string',
      description: 'ID of the track to purchase',
    },
    walletAddress: {
      type: 'string',
      description: 'Wallet address of the purchaser',
    },
    purchaseOption: {
      type: 'string',
      description: 'Purchase option ID from the available options',
    },
    paymentToken: {
      type: 'string',
      description: 'Token to use for payment (e.g., USDC)',
    },
    amount: {
      type: 'string',
      description: 'Amount to pay',
    },
    signerPrivateKey: {
      type: 'string',
      description: 'Private key of the purchaser wallet (IMPORTANT: only use for testing!)',
    },
  },
  required: ['contentId', 'walletAddress', 'purchaseOption', 'paymentToken', 'amount', 'signerPrivateKey'],
};

// Implementation of purchase-track tool
export const purchaseTrack = async (args: {
  contentId: string;
  walletAddress: string;
  purchaseOption: string;
  paymentToken: string;
  amount: string;
  signerPrivateKey: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track exists
    try {
      await audiusClient.getTrack(args.contentId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track. Please check the provided track ID.`,
        }],
        isError: true
      };
    }
    
    // Verify the purchase options exist for this track
    const purchaseOptions = await audiusClient.getPurchaseOptions(args.contentId, 'track');
    if (!purchaseOptions || purchaseOptions.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No purchase options found for track ${args.contentId}.`,
        }],
        isError: true
      };
    }
    
    // Verify that the purchase option provided is valid
    const validOption = purchaseOptions.some((option: any) => option.id === args.purchaseOption);
    if (!validOption) {
      return {
        content: [{
          type: 'text',
          text: `Invalid purchase option. Please check the available options with the purchase-options tool.`,
        }],
        isError: true
      };
    }
    
    // Verify the payment token is supported
    const supportedTokens = await audiusClient.getSupportedPaymentTokens();
    const validToken = supportedTokens.some((token: any) => token.symbol === args.paymentToken);
    if (!validToken) {
      return {
        content: [{
          type: 'text',
          text: `Invalid payment token. Please check the supported tokens with the supported-payment-tokens tool.`,
        }],
        isError: true
      };
    }
    
    // IMPORTANT NOTE: In a real implementation, you would NEVER handle private keys directly.
    // This is just for demonstration purposes and should use a secure wallet connection method.
    
    // Execute the purchase
    const result = await audiusClient.purchaseContent({
      contentId: args.contentId,
      contentType: 'track',
      walletAddress: args.walletAddress,
      purchaseOption: args.purchaseOption,
      paymentToken: args.paymentToken,
      amount: args.amount,
      signerPrivateKey: args.signerPrivateKey
    });
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to purchase track.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      contentId: args.contentId,
      contentType: 'track',
      walletAddress: args.walletAddress,
      purchaseOption: args.purchaseOption,
      paymentToken: args.paymentToken,
      amount: args.amount,
      timestamp: new Date().toISOString(),
      status: 'purchased',
      purchaseDetails: result
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in purchase-track tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error purchasing track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};