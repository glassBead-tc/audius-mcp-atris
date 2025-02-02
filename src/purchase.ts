import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { USDC } from '@audius/fixed-decimal';
import { sdk } from '@audius/sdk';
import { WalletManager, WalletInfo } from './auth.js';

interface PurchaseRecord {
  trackId: string;
  buyerId: string;
  sellerId: string;
  amount: string;
  timestamp: string;
  transactionId: string;
}

interface TrackPriceInfo {
  price: string;
  currency: 'USDC';
  sellerId: string;
}

export class PurchaseManager {
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
   * Get track price information
   */
  async getTrackPrice(trackId: string): Promise<TrackPriceInfo> {
    try {
      const response = await this.audiusSdk.tracks.getTrack({ trackId });
      
      if (!response.data) {
        throw new Error('Track not found');
      }

      // Extract price info from track metadata
      // Note: This assumes the Audius SDK track type includes price information
      const track = response.data as any;
      
      if (!track.price || !track.userId) {
        throw new Error('Track is not for sale');
      }

      return {
        price: USDC(track.price).toString(),
        currency: 'USDC',
        sellerId: track.userId
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get track price: ${error.message}`);
      }
      throw new Error('Failed to get track price: Unknown error');
    }
  }

  /**
   * Purchase a track using USDC
   */
  async purchaseTrack(trackId: string, buyerId: string): Promise<PurchaseRecord> {
    try {
      // Get track price info
      const priceInfo = await this.getTrackPrice(trackId);
      
      // Get buyer wallet info
      const buyerWallet = await this.walletManager.getWalletInfo(buyerId);
      if (!buyerWallet.userBank) {
        throw new Error('Buyer bank not initialized');
      }

      // Get seller wallet info
      const sellerWallet = await this.walletManager.getWalletInfo(priceInfo.sellerId);
      if (!sellerWallet.userBank) {
        throw new Error('Seller bank not initialized');
      }

      // Check buyer balance
      const balance = await this.walletManager.getUserBalance(buyerId, 'USDC');
      const buyerBalance = USDC(balance.available);
      const trackPrice = USDC(priceInfo.price);
      if (buyerBalance.value < trackPrice.value) {
        throw new Error('Insufficient USDC balance');
      }

      // Create and send transaction
      const transaction = await this.createPurchaseTransaction(
        buyerWallet,
        sellerWallet,
        priceInfo.price
      );

      // Record the purchase
      const purchaseRecord: PurchaseRecord = {
        trackId,
        buyerId,
        sellerId: priceInfo.sellerId,
        amount: priceInfo.price,
        timestamp: new Date().toISOString(),
        transactionId: transaction.signature
      };

      // Update track access permissions
      await this.grantTrackAccess(trackId, buyerId);

      return purchaseRecord;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to purchase track: ${error.message}`);
      }
      throw new Error('Failed to purchase track: Unknown error');
    }
  }

  /**
   * Create a USDC transfer transaction
   */
  private async createPurchaseTransaction(
    buyerWallet: WalletInfo,
    sellerWallet: WalletInfo,
    amount: string
  ): Promise<{ signature: string }> {
    try {
      // Create a new transaction
      const transaction = new Transaction();

      // Add transfer instruction
      // Note: In a real implementation, this would use the proper USDC transfer instruction
      const buyerPubKey = new PublicKey(buyerWallet.userBank!);
      const sellerPubKey = new PublicKey(sellerWallet.userBank!);

      // Simulate transaction for now
      return {
        signature: `sim_${Date.now()}`
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to create purchase transaction: ${error.message}`);
      }
      throw new Error('Failed to create purchase transaction: Unknown error');
    }
  }

  /**
   * Grant access to purchased track
   */
  private async grantTrackAccess(trackId: string, userId: string): Promise<void> {
    try {
      // Update track access permissions
      // Note: This would use the actual Audius SDK method for granting access
      await this.audiusSdk.tracks.updateTrack({
        trackId,
        userId: userId,
        metadata: {
          // Add user to track's access list
          accessList: [userId]
        } as any
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to grant track access: ${error.message}`);
      }
      throw new Error('Failed to grant track access: Unknown error');
    }
  }

  /**
   * Verify track purchase
   */
  async verifyPurchase(trackId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.audiusSdk.tracks.getTrack({ trackId });
      
      if (!response.data) {
        throw new Error('Track not found');
      }

      // Check if user has access to the track
      // Note: This assumes the track data includes access list information
      const track = response.data as any;
      return track.accessList?.includes(userId) || false;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify purchase: ${error.message}`);
      }
      throw new Error('Failed to verify purchase: Unknown error');
    }
  }
}
