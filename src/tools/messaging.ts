import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';
import { RequestHandlerExtra } from '../types/index.js';

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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify the sender exists
    try {
      await audiusClient.getUser(args.fromUserId);
    } catch (error) {
      return createTextResponse(`Unable to verify sender. Please check the fromUserId.`, true);
    }
    
    // Verify the recipient exists
    try {
      await audiusClient.getUser(args.toUserId);
    } catch (error) {
      return createTextResponse(`Unable to verify recipient. Please check the toUserId.`, true);
    }
    
    // Send the message
    const messageResult = await audiusClient.sendMessage(
      args.fromUserId,
      args.toUserId,
      args.message
    );
    
    if (!messageResult || !messageResult.messageId) {
      return createTextResponse(`Failed to send message. The service may be temporarily unavailable.`, true);
    }
    
    return createTextResponse(`Message sent successfully. Message ID: ${messageResult.messageId}`);
  } catch (error) {
    console.error('Error in send-message tool:', error);
    return createTextResponse(
      `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
}, extra: RequestHandlerExtra) => {
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
      return createTextResponse(`Unable to verify users. Please check the provided user IDs.`, true);
    }
    
    // Get the messages
    const messages = await audiusClient.getMessages(
      args.userId,
      args.withUserId,
      limit
    );
    
    if (!messages || messages.length === 0) {
      return createTextResponse(`No messages found between user ${args.userId} and user ${args.withUserId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      withUserId: args.withUserId,
      limit,
      messageCount: messages.length,
      messages: messages,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in get-messages tool:', error);
    return createTextResponse(`Error getting messages: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 20;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get the message threads
    const threads = await audiusClient.getMessageThreads(
      args.userId,
      limit
    );
    
    if (!threads || threads.length === 0) {
      return createTextResponse(`No message threads found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      threadCount: threads.length,
      threads: threads,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in get-message-threads tool:', error);
    return createTextResponse(`Error getting message threads: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
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
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Mark the message as read
    const result = await audiusClient.markMessageAsRead(
      args.userId,
      args.messageId
    );
    
    if (!result) {
      return createTextResponse(`Failed to mark message ${args.messageId} as read for user ${args.userId}.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      messageId: args.messageId,
      timestamp: new Date().toISOString(),
      status: 'read'
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in mark-message-read tool:', error);
    return createTextResponse(`Error marking message as read: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
};