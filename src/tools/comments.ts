import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';

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
    let track;
    let user;
    try {
      const [trackResult, userResult] = await Promise.all([
        audiusClient.getTrack(args.trackId),
        audiusClient.getUser(args.userId)
      ]);
      track = trackResult;
      user = userResult;
      
      if (!track || !user) {
        return createTextResponse(
          `Unable to verify track or user. Please check the provided IDs.`,
          true
        );
      }
    } catch (error) {
      return createTextResponse(
        `Unable to verify track or user. Please check the provided IDs.`,
        true
      );
    }
    
    // Add the comment
    const result = await audiusClient.addTrackComment(
      args.trackId,
      args.userId,
      args.comment
    );
    
    if (!result) {
      return createTextResponse(
        `Failed to add comment to track ${args.trackId}.`,
        true
      );
    }
    
    // Create a more readable response
    const response = [
      `✅ Comment added successfully!`,
      ``,
      `💬 "${args.comment}"`,
      ``,
      `🎵 Track: "${track.title}" by ${track.user.name}`,
      `👤 Commented as: ${user.name}`,
      `🕒 Posted: ${new Date().toLocaleString()}`,
      `🆔 Comment ID: ${result.id || 'unknown'}`
    ].join('\n');
    
    return createTextResponse(response);
  } catch (error) {
    console.error('Error in add-track-comment tool:', error);
    return createTextResponse(
      `Error adding comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
    let user;
    try {
      user = await audiusClient.getUser(args.userId);
      if (!user) {
        return createTextResponse(
          `Unable to verify user. Please check the provided user ID.`,
          true
        );
      }
    } catch (error) {
      return createTextResponse(
        `Unable to verify user. Please check the provided user ID.`,
        true
      );
    }
    
    // Delete the comment
    const result = await audiusClient.deleteTrackComment(
      args.commentId,
      args.userId
    );
    
    if (!result) {
      return createTextResponse(
        `Failed to delete comment ${args.commentId}.`,
        true
      );
    }
    
    // Create a more readable response
    const response = [
      `🗑️ Comment deleted successfully`,
      ``,
      `👤 Deleted by: ${user.name}`,
      `🆔 Comment ID: ${args.commentId}`,
      `🕒 Deleted at: ${new Date().toLocaleString()}`
    ].join('\n');
    
    return createTextResponse(response);
  } catch (error) {
    console.error('Error in delete-track-comment tool:', error);
    return createTextResponse(
      `Error deleting comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};