export class ChallengeManager {
    audiusSdk;
    constructor(audiusSdk) {
        this.audiusSdk = audiusSdk;
    }
    /**
     * Get all undisbursed challenges
     */
    async getUndisbursedChallenges(options = {}) {
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
            return response.data;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get undisbursed challenges: ${error.message}`);
            }
            throw new Error('Failed to get undisbursed challenges: Unknown error');
        }
    }
    /**
     * Get user challenges
     */
    async getUserChallenges(userId, showHistorical = false) {
        try {
            const response = await this.audiusSdk.users.getUserChallenges({
                id: userId,
                showHistorical
            });
            if (!response.data) {
                throw new Error('No data returned from user challenges endpoint');
            }
            return response.data;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get user challenges: ${error.message}`);
            }
            throw new Error('Failed to get user challenges: Unknown error');
        }
    }
}
