// Notifications prompt

export const notificationsPrompt = {
  name: 'notifications',
  description: 'Get information and manage notifications on Audius',
  arguments: [
    {
      name: 'userId',
      description: 'ID of the user to get notifications for',
      required: true,
    },
    {
      name: 'notificationType',
      description: 'Type of notifications to focus on',
      required: false,
      enum: ['all', 'milestones', 'social', 'announcements', 'unread', 'settings']
    },
    {
      name: 'limit',
      description: 'Number of notifications to retrieve',
      required: false,
      type: 'number'
    },
    {
      name: 'markAsRead',
      description: 'Whether to mark notifications as read',
      required: false,
      type: 'boolean'
    }
  ],
};

// Handler for notifications prompt
export const handleNotificationsPrompt = (args: {
  userId?: string;
  notificationType?: string; // Changed from enum to string
  limit?: string; // Changed from number to string
  markAsRead?: string; // Changed from boolean to string
}) => {
  // Convert string parameters to appropriate types
  const userId = args.userId || '';
  const limit = args.limit ? parseInt(args.limit, 10) : undefined;
  const markAsRead = args.markAsRead === 'true';
  // Build a user query for notifications
  let userMessage = `I'd like to see notifications for the user with ID: ${userId} on Audius. `;
  
  if (args.notificationType) {
    switch (args.notificationType) {
      case 'all':
        userMessage += `Please show me all types of notifications. `;
        break;
      case 'milestones':
        userMessage += `I'm specifically interested in milestone notifications. `;
        break;
      case 'social':
        userMessage += `I want to see social interaction notifications like follows, reposts, and comments. `;
        break;
      case 'announcements':
        userMessage += `I'd like to see platform announcements. `;
        break;
      case 'unread':
        userMessage += `I want to focus on unread notifications. `;
        break;
      case 'settings':
        userMessage += `I'd like to see and manage my notification settings. `;
        break;
    }
  }
  
  if (limit) {
    userMessage += `Please limit the results to ${limit} notifications. `;
  }
  
  if (markAsRead) {
    userMessage += `I'd also like to mark these notifications as read after viewing them. `;
  }
  
  userMessage += `Can you help me with these notifications?`;
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, help the user manage their Audius notifications:

1. For basic notification retrieval:
   - Use 'get-notifications' to fetch recent notifications
   - Organize them by type and relevance
   - Highlight important notifications

2. For notification management:
   - Use 'mark-notifications-read' to mark specific notifications as read
   - Use 'mark-all-notifications-read' for clearing all notifications
   - Show notification counts with 'notification-counts'

3. For notification settings:
   - Use 'notification-settings' to view current settings
   - Explain how to use 'update-notification-settings' to change preferences
   - Recommend useful notification settings based on user activity

4. For special notification types:
   - Use 'milestone-notifications' for achievements and milestones
   - Use 'announcement-notifications' for platform announcements
   - Use 'notification-history' for a longer view of past notifications

Present the information in a clear, organized way and provide actionable suggestions for managing notifications effectively.
  `;
  
  // Create messages for the prompt with proper typing, only using allowed roles
  const messages = [
    {
      role: "assistant" as const,
      content: {
        type: "text" as const,
        text: systemMessage,
      },
    },
    {
      role: "user" as const,
      content: {
        type: "text" as const,
        text: userMessage,
      },
    },
  ];
  
  return {
    messages,
  };
};