export class CommentManager {
    audiusSdk;
    constructor(audiusSdk) {
        this.audiusSdk = audiusSdk;
    }
    /**
     * Get an unclaimed comment ID
     */
    async getUnclaimedCommentId() {
        try {
            const response = await this.audiusSdk.comments.getUnclaimedCommentID();
            if (!response.data) {
                throw new Error('No data returned from unclaimed comment ID endpoint');
            }
            return response.data.comment_id;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get unclaimed comment ID: ${error.message}`);
            }
            throw new Error('Failed to get unclaimed comment ID: Unknown error');
        }
    }
    /**
     * Get replies to a comment
     */
    async getCommentReplies(commentId) {
        try {
            const response = await this.audiusSdk.comments.getCommentReplies({
                commentId,
                limit: 100 // Default limit
            });
            if (!response.data) {
                throw new Error('No data returned from comment replies endpoint');
            }
            return response.data;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get comment replies: ${error.message}`);
            }
            throw new Error('Failed to get comment replies: Unknown error');
        }
    }
}
