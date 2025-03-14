import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

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
    
    // Get notifications
    const notifications = await audiusClient.getUserNotifications(args.userId, limit, args.timestamp);
    
    if (!notifications || notifications.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No notifications found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      notificationCount: notifications.length,
      notifications: notifications,
      nextTimestamp: notifications.length > 0 ? notifications[notifications.length - 1].timestamp : null
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-notifications tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
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
    
    // Get notification settings
    const settings = await audiusClient.getUserNotificationSettings(args.userId);
    
    if (!settings) {
      return {
        content: [{
          type: 'text',
          text: `No notification settings found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      settings: settings,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in notification-settings tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
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
    
    // Extract settings from args
    const { userId, ...settings } = args;
    
    // Update notification settings
    const result = await audiusClient.updateUserNotificationSettings(userId, settings);
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to update notification settings for user ${userId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      userId: userId,
      settings: settings,
      timestamp: new Date().toISOString(),
      status: 'updated'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in update-notification-settings tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error updating notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
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
      description: 'IDs of notifications to mark as read',
    },
  },
  required: ['userId', 'notificationIds'],
};

// Implementation of mark-notifications-read tool
export const markNotificationsRead = async (args: {
  userId: string;
  notificationIds: string[];
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
    
    // Check if notification IDs are provided
    if (!args.notificationIds || args.notificationIds.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No notification IDs provided. Please specify which notifications to mark as read.`,
        }],
        isError: true
      };
    }
    
    // Mark notifications as read
    const result = await audiusClient.markNotificationsAsRead(args.userId, args.notificationIds);
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to mark notifications as read for user ${args.userId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      notificationIds: args.notificationIds,
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
    console.error('Error in mark-notifications-read tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error marking notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
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
    
    // Mark all notifications as read
    const result = await audiusClient.markAllNotificationsAsRead(args.userId);
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to mark all notifications as read for user ${args.userId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      timestamp: new Date().toISOString(),
      status: 'all notifications marked as read'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in mark-all-notifications-read tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error marking all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for announcement-notifications tool
export const announcementNotificationsSchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      description: 'Maximum number of announcements to return (default: 10)',
    },
  },
};

// Implementation of announcement-notifications tool
export const getAnnouncementNotifications = async (args: {
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    // Get announcement notifications
    const announcements = await audiusClient.getAnnouncementNotifications(limit);
    
    if (!announcements || announcements.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No announcement notifications found.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      limit,
      announcementCount: announcements.length,
      announcements: announcements,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in announcement-notifications tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting announcement notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for milestone-notifications tool
export const milestoneNotificationsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get milestone notifications for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of milestone notifications to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of milestone-notifications tool
export const getMilestoneNotifications = async (args: {
  userId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
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
    
    // Get milestone notifications
    const milestones = await audiusClient.getMilestoneNotifications(args.userId, limit);
    
    if (!milestones || milestones.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No milestone notifications found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      milestoneCount: milestones.length,
      milestones: milestones,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in milestone-notifications tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting milestone notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for notification-counts tool
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

// Implementation of notification-counts tool
export const getNotificationCounts = async (args: {
  userId: string;
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
    
    // Get notification counts
    const counts = await audiusClient.getUserNotificationCounts(args.userId);
    
    if (!counts) {
      return {
        content: [{
          type: 'text',
          text: `No notification counts found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      counts: counts,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in notification-counts tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting notification counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for notification-history tool
export const notificationHistorySchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to get notification history for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of history items to return (default: 50)',
    },
  },
  required: ['userId'],
};

// Implementation of notification-history tool
export const getNotificationHistory = async (args: {
  userId: string;
  limit?: number;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 50;
    
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
    
    // Get notification history
    const history = await audiusClient.getUserNotificationHistory(args.userId, limit);
    
    if (!history || history.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No notification history found for user ${args.userId}.`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      limit,
      historyCount: history.length,
      history: history,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in notification-history tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error getting notification history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for send-notification tool
export const sendNotificationSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user to send the notification to',
    },
    type: {
      type: 'string',
      description: 'Type of notification',
    },
    message: {
      type: 'string',
      description: 'Message content of the notification',
    },
    relatedEntityId: {
      type: 'string',
      description: 'ID of the related entity (e.g., track, user)',
    },
    relatedEntityType: {
      type: 'string',
      description: 'Type of the related entity (e.g., track, user)',
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
    
    // Send notification
    const result = await audiusClient.sendUserNotification({
      userId: args.userId,
      type: args.type,
      message: args.message,
      relatedEntityId: args.relatedEntityId,
      relatedEntityType: args.relatedEntityType
    });
    
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Failed to send notification to user ${args.userId}.`,
        }],
        isError: true
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      type: args.type,
      message: args.message,
      relatedEntityId: args.relatedEntityId,
      relatedEntityType: args.relatedEntityType,
      timestamp: new Date().toISOString(),
      status: 'sent',
      notificationId: result.id || 'unknown'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in send-notification tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error sending notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};