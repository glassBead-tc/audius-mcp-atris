import { sdk } from '@audius/sdk';

interface UnclaimedCommentResponse {
  data: {
    comment_id: string;
  };
}

interface CommentRepliesResponse {
  data: Array<{
    comment_id: string;
    parent_comment_id: string;
    user_id: string;
    body: string;
    timestamp: string;
    is_deleted: boolean;
    is_verified: boolean;
  }>;
}

export class CommentManager {
  private audiusSdk: ReturnType<typeof sdk>;

  constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
  }

  /**
   * Get an unclaimed comment ID
   */
  async getUnclaimedCommentId(): Promise<string> {
    try {
      const response = await this.audiusSdk.comments.getUnclaimedCommentID();

      if (!response.data) {
        throw new Error('No data returned from unclaimed comment ID endpoint');
      }

      return (response as unknown as UnclaimedCommentResponse).data.comment_id;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get unclaimed comment ID: ${error.message}`);
      }
      throw new Error('Failed to get unclaimed comment ID: Unknown error');
    }
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(commentId: string): Promise<CommentRepliesResponse['data']> {
    try {
      const response = await this.audiusSdk.comments.getCommentReplies({ 
        commentId,
        limit: 100 // Default limit
      });

      if (!response.data) {
        throw new Error('No data returned from comment replies endpoint');
      }

      return response.data as unknown as CommentRepliesResponse['data'];
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get comment replies: ${error.message}`);
      }
      throw new Error('Failed to get comment replies: Unknown error');
    }
  }
}
