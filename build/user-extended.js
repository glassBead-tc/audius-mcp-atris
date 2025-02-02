import { z } from 'zod';
/**
 * Manages extended user features for the Audius MCP server
 */
export class UserExtendedManager {
    audiusSdk;
    constructor(audiusSdk) {
        this.audiusSdk = audiusSdk;
    }
    /**
     * Get user's extended profile data
     * @param userId The user's ID
     * @returns Extended user profile data
     */
    async getUserExtendedProfile(userId) {
        try {
            const [userProfile, userTracks] = await Promise.all([
                this.audiusSdk.users.getUser({ id: userId }),
                this.audiusSdk.users.getTracksByUser({
                    id: userId,
                    sortMethod: 'most_listens_by_user',
                    limit: 100
                })
            ]);
            // Get additional user stats
            const followers = await this.audiusSdk.users.getFollowers({ id: userId });
            const following = await this.audiusSdk.users.getFollowing({ id: userId });
            const favorites = await this.audiusSdk.users.getFavorites({ id: userId });
            const reposts = await this.audiusSdk.users.getReposts({ id: userId });
            return {
                profile: userProfile,
                trackHistory: userTracks,
                stats: {
                    followers: followers.data?.length || 0,
                    following: following.data?.length || 0,
                    favorites: favorites.data?.length || 0,
                    reposts: reposts.data?.length || 0,
                    tracks: userTracks.data?.length || 0
                }
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get extended user profile: ${error.message}`);
            }
            throw error;
        }
    }
}
// Schema for extended user features
export const GetUserExtendedProfileSchema = z.object({
    userId: z.string().describe("User ID"),
}).describe("Get user's extended profile data including metrics and track history");
