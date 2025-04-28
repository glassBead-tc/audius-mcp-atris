import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

// Schema for get-notifications tool
export const getNotificationsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get notifications for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of notifications to return (default: 20)',
    },
    timestamp: {
      type: 'string',
      description: 'Timestamp to get notifications from (pagination)',
    },
  },
  required: ['userId'],
};

// Implementation of get-notifications tool
export const getNotifications = async (args: {
  userId: string;
  limit?: number;
  timestamp?: string;
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
    
    // Get notifications
    const notifications = await audiusClient.getUserNotifications(args.userId, limit, args.timestamp);
    
    if (!notifications || notifications.length === 0) {
      return createTextResponse(`No notifications found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      timestamp: args.timestamp,
      notificationCount: notifications.length,
      notifications: notifications,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in get-notifications tool:', error);
    return createTextResponse(
      `Error getting notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for notification-settings tool
export const notificationSettingsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get notification settings for',
    },
  },
  required: ['userId'],
};

// Implementation of notification-settings tool
export const getNotificationSettings = async (args: {
  userId: string;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get notification settings
    const settings = await audiusClient.getUserNotificationSettings(args.userId);
    
    if (!settings) {
      return createTextResponse(`No notification settings found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      settings: settings,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in notification-settings tool:', error);
    return createTextResponse(
      `Error getting notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for update-notification-settings tool
export const updateNotificationSettingsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to update notification settings for',
    },
    milestones: {
      type: 'boolean',
      description: 'Whether to receive milestone notifications',
    },
    followers: {
      type: 'boolean',
      description: 'Whether to receive new follower notifications',
    },
    reposts: {
      type: 'boolean',
      description: 'Whether to receive repost notifications',
    },
    favorites: {
      type: 'boolean',
      description: 'Whether to receive favorite notifications',
    },
    messages: {
      type: 'boolean',
      description: 'Whether to receive message notifications',
    },
    announcements: {
      type: 'boolean',
      description: 'Whether to receive announcement notifications',
    },
    comments: {
      type: 'boolean',
      description: 'Whether to receive comment notifications',
    },
    remixes: {
      type: 'boolean',
      description: 'Whether to receive remix notifications',
    },
    tastemakers: {
      type: 'boolean',
      description: 'Whether to receive tastemaker notifications',
    },
    tips: {
      type: 'boolean',
      description: 'Whether to receive tip notifications',
    },
    supporterRank: {
      type: 'boolean',
      description: 'Whether to receive supporter rank notifications',
    },
    supportingRank: {
      type: 'boolean',
      description: 'Whether to receive supporting rank notifications',
    },
  },
  required: ['userId'],
};

// Implementation of update-notification-settings tool
export const updateNotificationSettings = async (args: {
  userId: string;
  milestones?: boolean;
  followers?: boolean;
  reposts?: boolean;
  favorites?: boolean;
  messages?: boolean;
  announcements?: boolean;
  comments?: boolean;
  remixes?: boolean;
  tastemakers?: boolean;
  tips?: boolean;
  supporterRank?: boolean;
  supportingRank?: boolean;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Create settings object from provided args
    const settings: Record<string, boolean> = {};
    if (args.milestones !== undefined) settings.milestones = args.milestones;
    if (args.followers !== undefined) settings.followers = args.followers;
    if (args.reposts !== undefined) settings.reposts = args.reposts;
    if (args.favorites !== undefined) settings.favorites = args.favorites;
    if (args.messages !== undefined) settings.messages = args.messages;
    if (args.announcements !== undefined) settings.announcements = args.announcements;
    if (args.comments !== undefined) settings.comments = args.comments;
    if (args.remixes !== undefined) settings.remixes = args.remixes;
    if (args.tastemakers !== undefined) settings.tastemakers = args.tastemakers;
    if (args.tips !== undefined) settings.tips = args.tips;
    if (args.supporterRank !== undefined) settings.supporterRank = args.supporterRank;
    if (args.supportingRank !== undefined) settings.supportingRank = args.supportingRank;
    
    // Update notification settings
    const updatedSettings = await audiusClient.updateUserNotificationSettings(args.userId, settings);
    
    if (!updatedSettings) {
      return createTextResponse(`Failed to update notification settings for user ${args.userId}.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      settings: updatedSettings,
      updated: true
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in update-notification-settings tool:', error);
    return createTextResponse(
      `Error updating notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for mark-notifications-read tool
export const markNotificationsReadSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user marking notifications as read',
    },
    notificationIds: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Array of notification IDs to mark as read',
    },
  },
  required: ['userId', 'notificationIds'],
};

// Implementation of mark-notifications-read tool
export const markNotificationsRead = async (args: {
  userId: string;
  notificationIds: string[];
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Mark notifications as read
    const success = await audiusClient.markNotificationsAsRead(args.userId, args.notificationIds);
    
    if (!success) {
      return createTextResponse(`Failed to mark notifications as read for user ${args.userId}.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      notificationIds: args.notificationIds,
      markedAsRead: true
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in mark-notifications-read tool:', error);
    return createTextResponse(
      `Error marking notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for mark-all-notifications-read tool
export const markAllNotificationsReadSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user marking all notifications as read',
    },
  },
  required: ['userId'],
};

// Implementation of mark-all-notifications-read tool
export const markAllNotificationsRead = async (args: {
  userId: string;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Mark all notifications as read
    const success = await audiusClient.markAllNotificationsAsRead(args.userId);
    
    if (!success) {
      return createTextResponse(`Failed to mark all notifications as read for user ${args.userId}.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      allMarkedAsRead: true
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in mark-all-notifications-read tool:', error);
    return createTextResponse(
      `Error marking all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for get-announcement-notifications tool
export const announcementNotificationsSchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      description: 'Maximum number of notifications to return (default: 10)',
    },
  },
  required: [],
};

// Implementation of get-announcement-notifications tool
export const getAnnouncementNotifications = async (args: {
  limit?: number;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Get announcement notifications
    const announcements = await audiusClient.getAnnouncementNotifications(limit);
    
    if (!announcements || announcements.length === 0) {
      return createTextResponse(`No announcement notifications found.`);
    }
    
    // Format results
    const formattedResults = {
      limit,
      announcementCount: announcements.length,
      announcements: announcements,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in get-announcement-notifications tool:', error);
    return createTextResponse(
      `Error getting announcement notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for get-milestone-notifications tool
export const milestoneNotificationsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get milestone notifications for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of notifications to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of get-milestone-notifications tool
export const getMilestoneNotifications = async (args: {
  userId: string;
  limit?: number;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get milestone notifications
    const milestones = await audiusClient.getMilestoneNotifications(args.userId, limit);
    
    if (!milestones || milestones.length === 0) {
      return createTextResponse(`No milestone notifications found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      milestoneCount: milestones.length,
      milestones: milestones,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in get-milestone-notifications tool:', error);
    return createTextResponse(
      `Error getting milestone notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for get-notification-counts tool
export const notificationCountsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get notification counts for',
    },
  },
  required: ['userId'],
};

// Implementation of get-notification-counts tool
export const getNotificationCounts = async (args: {
  userId: string;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Get notification counts
    const counts = await audiusClient.getUserNotificationCounts(args.userId);
    
    if (!counts) {
      return createTextResponse(`Failed to retrieve notification counts for user ${args.userId}.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      counts: counts,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in get-notification-counts tool:', error);
    return createTextResponse(
      `Error getting notification counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for get-notification-history tool
export const notificationHistorySchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get notification history for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of notifications to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Implementation of get-notification-history tool
export const getNotificationHistory = async (args: {
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
    
    // Get notification history
    const history = await audiusClient.getUserNotificationHistory(args.userId, limit);
    
    if (!history || history.length === 0) {
      return createTextResponse(`No notification history found for user ${args.userId}.`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      historyCount: history.length,
      history: history,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in get-notification-history tool:', error);
    return createTextResponse(
      `Error getting notification history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for send-notification tool
export const sendNotificationSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to send notification to',
    },
    type: {
      type: 'string',
      description: 'Type of notification to send (e.g. "message", "comment", "follow")',
    },
    message: {
      type: 'string',
      description: 'Message content of the notification',
    },
    relatedEntityId: {
      type: 'string',
      description: 'Optional ID of a related entity (track, playlist, etc.)',
    },
    relatedEntityType: {
      type: 'string',
      description: 'Optional type of the related entity (track, playlist, etc.)',
    },
  },
  required: ['userId', 'type', 'message'],
};

// Implementation of send-notification tool
export const sendNotification = async (args: {
  userId: string;
  type: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Send notification
    const success = await audiusClient.sendUserNotification({
      userId: args.userId,
      type: args.type,
      message: args.message,
      relatedEntityId: args.relatedEntityId,
      relatedEntityType: args.relatedEntityType
    });
    
    if (!success) {
      return createTextResponse(`Failed to send notification to user ${args.userId}.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      type: args.type,
      message: args.message,
      relatedEntityId: args.relatedEntityId,
      relatedEntityType: args.relatedEntityType,
      sent: true,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in send-notification tool:', error);
    return createTextResponse(
      `Error sending notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};