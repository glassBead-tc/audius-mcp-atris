import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ethers } from 'ethers';

export class RPCProxyManager {
  private wallet: ethers.Wallet;

  constructor() {
    // Initialize with a deterministic wallet for consistent signatures
    // This is just for testing - in production we'd want proper key management
    this.wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey);
  }

  async handleRPCRequest(method: string, params: unknown[]) {
    try {
      switch (method) {
        case 'personal_sign':
          if (!Array.isArray(params) || params.length !== 2 || 
              typeof params[0] !== 'string' || typeof params[1] !== 'string') {
            throw new McpError(
              ErrorCode.InvalidParams,
              'personal_sign requires [message: string, address: string]'
            );
          }
          return await this.handlePersonalSign([params[0], params[1]]);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unsupported RPC method: ${method}`
          );
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `RPC error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handlePersonalSign([message, address]: [string, string]): Promise<string> {
    try {
      // Verify the address matches our wallet
      if (address.toLowerCase() !== this.wallet.address.toLowerCase()) {
        throw new Error(`Address mismatch: ${address} vs ${this.wallet.address}`);
      }

      // Convert hex message to text if needed
      const messageToSign = message.startsWith('0x') 
        ? Buffer.from(message.slice(2), 'hex').toString('utf8')
        : message;

      // Sign the message
      const signature = await this.wallet.signMessage(messageToSign);
      
      return signature;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to sign message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  getAddress(): string {
    return this.wallet.address;
  }
}
