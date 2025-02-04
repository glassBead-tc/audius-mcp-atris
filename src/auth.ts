import { sdk } from '@audius/sdk';

export class WalletManager {
  private audiusSdk: ReturnType<typeof sdk>;

  constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
  }

  /**
   * Get wallet information for a user
   */
  async getWalletInfo(userId: string) {
    try {
      const response = await this.audiusSdk.users.getUser({ id: userId });
      if (!response.data) {
        throw new Error('User not found');
      }
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get user info: ${error.message}`);
      }
      throw new Error('Failed to get user info: Unknown error');
    }
  }
}
