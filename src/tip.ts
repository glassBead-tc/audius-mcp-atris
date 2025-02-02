import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { sdk } from '@audius/sdk';
import { WalletManager, WalletInfo } from './auth.js';

interface TipRecord {
  senderId: string;
  recipientId: string;
  amount: string;
  timestamp: string;
  transactionId: string;
  contentId?: string;  // Optional - can be trackId, playlistId, etc.
  contentType?: string; // Optional - 'track', 'playlist', etc.
  reaction?: string;    // Optional - user's reaction to the tip
}

interface TipReaction {
  userId: string;
  reaction: string;
  timestamp: string;
}

export class TipManager {
  private solanaConnection: Connection;
  private audiusSdk: ReturnType<typeof sdk>;
  private walletManager: WalletManager;

  constructor(audiusSdk: ReturnType<typeof sdk>, walletManager: WalletManager) {
    this.audiusSdk = audiusSdk;
    this.walletManager = walletManager;
    this.solanaConnection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
  }

  /**
   * Send a tip using wAUDIO
   */
  async sendTip(
    senderId: string,
    recipientId: string,
    amount: string,
    contentId?: string,
    contentType?: string
  ): Promise<TipRecord> {
    try {
      // Get sender wallet info
      const senderWallet = await this.walletManager.getWalletInfo(senderId);
      if (!senderWallet.userBank) {
        throw new Error('Sender bank not initialized');
      }

      // Get recipient wallet info
      const recipientWallet = await this.walletManager.getWalletInfo(recipientId);
      if (!recipientWallet.userBank) {
        throw new Error('Recipient bank not initialized');
      }

      // Check sender balance
      const balance = await this.walletManager.getUserBalance(senderId, 'wAUDIO');
      const senderBalance = parseFloat(balance.available);
      const tipAmount = parseFloat(amount);
      
      if (senderBalance < tipAmount) {
        throw new Error('Insufficient wAUDIO balance');
      }

      // Create and send transaction
      const transaction = await this.createTipTransaction(
        senderWallet,
        recipientWallet,
        amount
      );

      // Record the tip
      const tipRecord: TipRecord = {
        senderId,
        recipientId,
        amount,
        timestamp: new Date().toISOString(),
        transactionId: transaction.signature,
        contentId,
        contentType
      };

      // Update user's tip history
      await this.updateTipHistory(tipRecord);

      return tipRecord;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to send tip: ${error.message}`);
      }
      throw new Error('Failed to send tip: Unknown error');
    }
  }

  /**
   * Create a wAUDIO transfer transaction
   */
  private async createTipTransaction(
    senderWallet: WalletInfo,
    recipientWallet: WalletInfo,
    amount: string
  ): Promise<{ signature: string }> {
    try {
      // Create a new transaction
      const transaction = new Transaction();

      // Add transfer instruction
      // Note: In a real implementation, this would use the proper wAUDIO transfer instruction
      const senderPubKey = new PublicKey(senderWallet.userBank!);
      const recipientPubKey = new PublicKey(recipientWallet.userBank!);

      // Simulate transaction for now
      return {
        signature: `sim_${Date.now()}`
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to create tip transaction: ${error.message}`);
      }
      throw new Error('Failed to create tip transaction: Unknown error');
    }
  }

  /**
   * Get tip history for a user
   */
  async getTipHistory(
    userId: string,
    type: 'sent' | 'received' = 'received'
  ): Promise<TipRecord[]> {
    try {
      // Note: In a real implementation, this would fetch from a database or the Audius API
      // For now, return an empty array as placeholder
      return [];
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get tip history: ${error.message}`);
      }
      throw new Error('Failed to get tip history: Unknown error');
    }
  }

  /**
   * Add a reaction to a tip
   */
  async addTipReaction(
    tipId: string,
    userId: string,
    reaction: string
  ): Promise<TipReaction> {
    try {
      // Validate reaction (could be emoji, text, etc.)
      if (!reaction.trim()) {
        throw new Error('Invalid reaction');
      }

      const tipReaction: TipReaction = {
        userId,
        reaction,
        timestamp: new Date().toISOString()
      };

      // Note: In a real implementation, this would store the reaction in a database
      // and update the associated tip record

      return tipReaction;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to add tip reaction: ${error.message}`);
      }
      throw new Error('Failed to add tip reaction: Unknown error');
    }
  }

  /**
   * Get reactions for a tip
   */
  async getTipReactions(tipId: string): Promise<TipReaction[]> {
    try {
      // Note: In a real implementation, this would fetch from a database
      // For now, return an empty array as placeholder
      return [];
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get tip reactions: ${error.message}`);
      }
      throw new Error('Failed to get tip reactions: Unknown error');
    }
  }

  /**
   * Update tip history
   */
  private async updateTipHistory(tipRecord: TipRecord): Promise<void> {
    try {
      // Note: In a real implementation, this would store the tip record in a database
      // or update the Audius API with the tip information
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to update tip history: ${error.message}`);
      }
      throw new Error('Failed to update tip history: Unknown error');
    }
  }
}
