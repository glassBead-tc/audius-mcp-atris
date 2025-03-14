import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for send-message tool
export const sendMessageSchema = {
  type: 'object',
  properties: {
    fromUserId: {
      type: 'string',
      description: 'ID of the user sending the message',
    },
    toUserId: {
      type: 'string',
      description: 'ID of the user receiving the message',
    },
    message: {
      type: 'string',
      description: 'Message content to send',
    },
  },
  required: ['fromUserId', 'toUserId', 'message'],
};

// Implementation of send-message tool
export const sendMessage = async (args: { 
  fromUserId: string;
  toUserId: string;
  message: string;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify both users exist
    try {
      await Promise.all([
        audiusClient.getUser(args.fromUserId),
        audiusClient.getUser(args.toUserId)
      ]);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify users. Please check the provided user IDs.`,
        }],
        isError: true
      };
    }
    
    // Send the message
    const result = await audiusClient.sendMessage(
      args.fromUserId,
      args.toUserId,
      args.message
    );
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to send message from user ${args.fromUserId} to user ${args.toUserId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      message: args.message,
      messageId: result.id || `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in send-message tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for get-messages tool
export const getMessagesSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user retrieving messages',
    },
    withUserId: {
      type: 'string',
      description: 'ID of the other user in the conversation',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of messages to return (default: 50)',
    },
  },
  required: ['userId', 'withUserId'],
};

// Implementation of get-messages tool
export const getMessages = async (args: { 
  userId: string;
  withUserId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 50;
    
    // Verify both users exist
    try {
      await Promise.all([
        audiusClient.getUser(args.userId),
        audiusClient.getUser(args.withUserId)
      ]);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Unable to verify users. Please check the provided user IDs.`,
        }],
        isError: true
      };
    }
    
    // Get the messages
    const messages = await audiusClient.getMessages(
      args.userId,
      args.withUserId,
      limit
    );
    
    if (!messages || messages.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No messages found between user ${args.userId} and user ${args.withUserId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      withUserId: args.withUserId,
      limit,
      messageCount: messages.length,
      messages: messages,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-messages tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for get-message-threads tool
export const getMessageThreadsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user retrieving message threads',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of threads to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Implementation of get-message-threads tool
export const getMessageThreads = async (args: { 
  userId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 20;
    
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
    
    // Get the message threads
    const threads = await audiusClient.getMessageThreads(
      args.userId,
      limit
    );
    
    if (!threads || threads.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No message threads found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      threadCount: threads.length,
      threads: threads,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-message-threads tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting message threads: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for mark-message-read tool
export const markMessageReadSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user marking the message as read',
    },
    messageId: {
      type: 'string',
      description: 'ID of the message to mark as read',
    },
  },
  required: ['userId', 'messageId'],
};

// Implementation of mark-message-read tool
export const markMessageRead = async (args: { 
  userId: string;
  messageId: string;
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
    
    // Mark the message as read
    const result = await audiusClient.markMessageAsRead(
      args.userId,
      args.messageId
    );
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to mark message ${args.messageId} as read for user ${args.userId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      messageId: args.messageId,
      timestamp: new Date().toISOString(),
      status: 'marked as read'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in mark-message-read tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error marking message as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};