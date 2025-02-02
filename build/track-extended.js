import { z } from 'zod';
/**
 * Manages extended track features for the Audius MCP server
 */
export class TrackExtendedManager {
    audiusSdk;
    constructor(audiusSdk) {
        this.audiusSdk = audiusSdk;
    }
    /**
     * Get comprehensive track data including details, comments, and top listeners
     * @param trackId The track's ID
     * @returns Comprehensive track data
     */
    async getTrackExtendedData(trackId) {
        try {
            const [trackDetails, comments, streamUrl, topListeners] = await Promise.all([
                this.audiusSdk.tracks.getTrack({ trackId }),
                this.audiusSdk.tracks.trackComments({ trackId }),
                this.audiusSdk.tracks.getTrackStreamUrl({ trackId }),
                this.audiusSdk.tracks.getTrackTopListeners({ trackId })
            ]);
            return {
                details: {
                    ...trackDetails,
                    streamUrl
                },
                engagement: {
                    comments: comments.data || [],
                    topListeners: topListeners.data || [],
                    commentCount: comments.data?.length || 0,
                    topListenerCount: topListeners.data?.length || 0
                },
                metadata: {
                    // Include all available track details
                    ...trackDetails,
                    // Add stream URL separately since it comes from a different endpoint
                    streamUrl
                }
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get extended track data: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Get track top listeners with detailed user info
     * @param trackId The track's ID
     * @returns Track's top listeners
     */
    async getTrackTopListeners(trackId) {
        try {
            const topListeners = await this.audiusSdk.tracks.getTrackTopListeners({ trackId });
            return {
                listeners: topListeners.data || [],
                total: topListeners.data?.length || 0
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get track top listeners: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Get track comments with user info
     * @param trackId The track's ID
     * @returns Track's comments
     */
    async getTrackComments(trackId) {
        try {
            const comments = await this.audiusSdk.tracks.trackComments({ trackId });
            return {
                comments: comments.data || [],
                total: comments.data?.length || 0
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get track comments: ${error.message}`);
            }
            throw error;
        }
    }
}
// Schemas for extended track features
export const GetTrackExtendedDataSchema = z.object({
    trackId: z.string().describe("Track ID"),
}).describe("Get comprehensive track data including details, comments, and top listeners");
export const GetTrackTopListenersSchema = z.object({
    trackId: z.string().describe("Track ID"),
}).describe("Get track's top listeners with detailed user info");
export const GetTrackCommentsExtendedSchema = z.object({
    trackId: z.string().describe("Track ID"),
}).describe("Get track's comments with user info");
