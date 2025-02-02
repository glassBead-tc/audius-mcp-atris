import { Connection, PublicKey } from '@solana/web3.js';
import { USDC } from '@audius/fixed-decimal';
import { sdk } from '@audius/sdk';
import { RPCProxyManager } from './rpc-proxy.js';

// Extend base types since SDK types don't include all properties
interface ExtendedUser {
  associatedSolWallets?: string[];
  userBank?: string;
  ercWallet?: string;
}

// Define wallet association types
interface WalletAssociation {
  signature: string;
}

interface WalletAssociations {
  [address: string]: WalletAssociation;
}

export interface WalletInfo {
  ethWallet?: string;
  solanaWallet?: string;
  userBank?: string;
}

export interface TokenBalance {
  available: string;
  pending: string;
}

export class WalletManager {
  private solanaConnection: Connection;
  private audiusSdk: ReturnType<typeof sdk>;
  private rpcProxy: RPCProxyManager;

  constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
    this.rpcProxy = new RPCProxyManager();
    // Initialize Solana connection
    this.solanaConnection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
  }

  /**
   * Handle RPC requests that would normally go to local transport
   */
  async handleRPCRequest(method: string, params: unknown[]) {
    return this.rpcProxy.handleRPCRequest(method, params);
  }

  /**
   * Get the Ethereum address used for signing
   */
  getSignerAddress(): string {
    return this.rpcProxy.getAddress();
  }

  /**
   * Connect a wallet to a user's account
   */
  async connectWallet(userId: string, walletAddress: string, walletType: 'eth' | 'solana') {
    try {
      // Validate wallet address format
      if (walletType === 'eth') {
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid Ethereum wallet address format');
        }
      } else {
        try {
          new PublicKey(walletAddress);
        } catch {
          throw new Error('Invalid Solana wallet address format');
        }
      }

      // Create wallet association
      const walletAssociation: WalletAssociation = {
        signature: 'placeholder' // In a real implementation, this would be a proper signature
      };

      // Update user profile with wallet
      await this.audiusSdk.users.updateProfile({
        userId,
        metadata: {
          ...(walletType === 'eth' ? {
            associatedWallets: { [walletAddress]: walletAssociation }
          } : {}),
          ...(walletType === 'solana' ? {
            associatedSolWallets: { [walletAddress]: walletAssociation }
          } : {})
        } as any // Cast to any since SDK types don't include all properties
      });

      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect wallet: ${error.message}`);
      }
      throw new Error('Failed to connect wallet: Unknown error');
    }
  }

  /**
   * Get wallet information for a user
   */
  async getWalletInfo(userId: string): Promise<WalletInfo> {
    try {
      const response = await this.audiusSdk.users.getUser({ id: userId });
      const user = response.data as unknown as ExtendedUser;
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        ethWallet: user.ercWallet,
        solanaWallet: user.associatedSolWallets?.[0],
        userBank: user.userBank
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get wallet info: ${error.message}`);
      }
      throw new Error('Failed to get wallet info: Unknown error');
    }
  }

  /**
   * Get token balance for a user
   */
  async getUserBalance(userId: string, tokenType: 'wAUDIO' | 'USDC'): Promise<TokenBalance> {
    try {
      const walletInfo = await this.getWalletInfo(userId);
      
      if (!walletInfo.userBank) {
        throw new Error('User bank not initialized');
      }

      const userBankPubKey = new PublicKey(walletInfo.userBank);
      
      // Get token account info
      const tokenBalance = await this.solanaConnection.getTokenAccountBalance(userBankPubKey);
      
      if (!tokenBalance.value) {
        throw new Error('Failed to fetch token balance');
      }

      // Convert to proper decimal representation
      const balance = tokenType === 'USDC' 
        ? USDC(tokenBalance.value.uiAmount || 0).toString()
        : tokenBalance.value.uiAmountString || '0';

      return {
        available: balance,
        pending: '0' // Implement pending balance logic if needed
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get user balance: ${error.message}`);
      }
      throw new Error('Failed to get user balance: Unknown error');
    }
  }

  /**
   * Initialize a user bank for token operations
   */
  async initializeUserBank(userId: string, tokenType: 'wAUDIO' | 'USDC') {
    try {
      const walletInfo = await this.getWalletInfo(userId);
      
      if (!walletInfo.solanaWallet) {
        throw new Error('Solana wallet must be connected first');
      }

      // For now, simulate user bank creation since SDK doesn't have this method
      const userBankAddress = new PublicKey(walletInfo.solanaWallet).toString();

      // Update user profile with bank info
      await this.audiusSdk.users.updateProfile({
        userId,
        metadata: {
          // Cast to any since the SDK types don't include userBank
          userBank: userBankAddress
        } as any
      });

      return {
        success: true,
        userBankAddress
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize user bank: ${error.message}`);
      }
      throw new Error('Failed to initialize user bank: Unknown error');
    }
  }
}
