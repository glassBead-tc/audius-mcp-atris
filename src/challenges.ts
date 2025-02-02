import { sdk } from '@audius/sdk';

// Response types from the Audius API
interface UndisbursedChallengesResponse {
  data: Array<{
    challenge_id: string;
    user_id: string;
    specifier: string;
    amount: string;
    completed_blocknumber: number;
    handle: string;
    wallet: string;
    created_at: string;
    completed_at: string;
    cooldown_days?: number;
  }>;
}

interface UserChallengesResponse {
  data: Array<{
    challenge_id: string;
    user_id: string;
    specifier?: string;
    is_complete: boolean;
    is_active: boolean;
    is_disbursed: boolean;
    current_step_count?: number;
    max_steps?: number;
    challenge_type: string;
    amount: string;
    disbursed_amount: number;
    cooldown_days?: number;
    metadata: Record<string, any>;
  }>;
}

export class ChallengeManager {
  private audiusSdk: ReturnType<typeof sdk>;

  constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
  }

  /**
   * Get all undisbursed challenges
   */
  async getUndisbursedChallenges(options: {
    offset?: number;
    limit?: number;
    userId?: string;
    completedBlocknumber?: number;
    challengeId?: string;
  } = {}): Promise<UndisbursedChallengesResponse['data']> {
    try {
      const response = await this.audiusSdk.challenges.getUndisbursedChallenges({
        offset: options?.offset,
        limit: options?.limit,
        userId: options?.userId,
        completedBlocknumber: options?.completedBlocknumber,
        challengeId: options?.challengeId
      });

      if (!response.data) {
        throw new Error('No data returned from challenges endpoint');
      }

      return response.data as unknown as UndisbursedChallengesResponse['data'];
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get undisbursed challenges: ${error.message}`);
      }
      throw new Error('Failed to get undisbursed challenges: Unknown error');
    }
  }

  /**
   * Get user challenges
   */
  async getUserChallenges(userId: string, showHistorical: boolean = false): Promise<UserChallengesResponse['data']> {
    try {
      const response = await this.audiusSdk.users.getUserChallenges({
        id: userId,
        showHistorical
      });

      if (!response.data) {
        throw new Error('No data returned from user challenges endpoint');
      }

      return response.data as unknown as UserChallengesResponse['data'];
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get user challenges: ${error.message}`);
      }
      throw new Error('Failed to get user challenges: Unknown error');
    }
  }
}
