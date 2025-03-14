import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for add-track-comment tool
export const addTrackCommentSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to comment on',
    },
    userId: {
      type: 'string',
      description: 'ID of the user making the comment',
    },
    comment: {
      type: 'string',
      description: 'Comment text to add to the track',
    },
  },
  required: ['trackId', 'userId', 'comment'],
};

// Implementation of add-track-comment tool
export const addTrackComment = async (args: { 
  trackId: string, 
  userId: string, 
  comment: string 
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // First verify the track and user exist
    try {
      await Promise.all([
        audiusClient.getTrack(args.trackId),
        audiusClient.getUser(args.userId)
      ]);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify track or user. Please check the provided IDs.`,
        }],
        isError: true
      };
    }
    
    // Add the comment
    const result = await audiusClient.addTrackComment(
      args.trackId,
      args.userId,
      args.comment
    );
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to add comment to track ${args.trackId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      userId: args.userId,
      comment: args.comment,
      commentId: result.id || 'unknown',
      timestamp: new Date().toISOString(),
      status: 'success'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in add-track-comment tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error adding comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for delete-track-comment tool
export const deleteTrackCommentSchema = {
  type: 'object',
  properties: {
    commentId: {
      type: 'string',
      description: 'ID of the comment to delete',
    },
    userId: {
      type: 'string',
      description: 'ID of the user deleting the comment (must be comment author)',
    },
  },
  required: ['commentId', 'userId'],
};

// Implementation of delete-track-comment tool
export const deleteTrackComment = async (args: { 
  commentId: string, 
  userId: string 
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify user. Please check the provided user ID.`,
        }],
        isError: true
      };
    }
    
    // Delete the comment
    const result = await audiusClient.deleteTrackComment(
      args.commentId,
      args.userId
    );
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to delete comment ${args.commentId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      commentId: args.commentId,
      userId: args.userId,
      timestamp: new Date().toISOString(),
      status: 'deleted'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in delete-track-comment tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error deleting comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};