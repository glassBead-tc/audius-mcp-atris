// Direct messaging prompt

export const messagingPrompt = {
  name: 'messaging',
  description: 'Send and manage direct messages on Audius',
  arguments: [
    {
      name: 'userId',
      description: 'ID of the user sending/accessing messages',
      required: true,
    },
    {
      name: 'recipientId',
      description: 'ID of the recipient for a new message',
      required: false,
    },
    {
      name: 'initialMessage',
      description: 'Initial message content (if sending a new message)',
      required: false,
    },
    {
      name: 'purpose',
      description: 'Purpose of the messaging interaction',
      required: false,
      enum: ['collaboration', 'feedback', 'networking', 'fanInteraction', 'viewThreads']
    }
  ],
};

// Handler for messaging prompt
export const handleMessagingPrompt = (args: { 
  userId: string;
  recipientId?: string;
  initialMessage?: string;
  purpose?: 'collaboration' | 'feedback' | 'networking' | 'fanInteraction' | 'viewThreads';
}) => {
  // Build a user query for messaging
  let userMessage = '';
  
  if (args.purpose === 'viewThreads' || (!args.purpose && !args.recipientId)) {
    // View threads flow
    userMessage = `I want to see my message threads on Audius. Can you help me view and manage my conversations?`;
  } else if (args.recipientId && args.initialMessage) {
    // New message flow
    userMessage = `I want to send a message to user ${args.recipientId} on Audius. `;
    
    if (args.purpose) {
      switch (args.purpose) {
        case 'collaboration':
          userMessage += `I'm reaching out for potential collaboration. `;
          break;
        case 'feedback':
          userMessage += `I want to give/receive feedback. `;
          break;
        case 'networking':
          userMessage += `I'm interested in networking with this user. `;
          break;
        case 'fanInteraction':
          userMessage += `I want to connect with this user as a fan. `;
          break;
      }
    }
    
    userMessage += `My initial message would be: "${args.initialMessage}". Can you guide me through sending this message and managing the conversation?`;
  } else if (args.recipientId) {
    // View conversation flow
    userMessage = `I want to see my conversation with user ${args.recipientId} on Audius. Can you help me view and manage this conversation?`;
  } else if (args.purpose) {
    // Purpose-driven messaging
    userMessage = `I want to use Audius messaging for `;
    
    switch (args.purpose) {
      case 'collaboration':
        userMessage += `collaborating with other artists. Can you give me tips on how to effectively reach out for collaborations?`;
        break;
      case 'feedback':
        userMessage += `getting feedback on my music. Can you suggest best practices for requesting constructive feedback?`;
        break;
      case 'networking':
        userMessage += `networking with other music professionals. Can you advise on effective networking strategies?`;
        break;
      case 'fanInteraction':
        userMessage += `interacting with my fans. Can you suggest ways to engage meaningfully with listeners?`;
        break;
    }
  } else {
    // Default flow
    userMessage = `I want to use the direct messaging features on Audius. Can you explain how I can send, receive, and manage messages?`;
  }
  
  // Add instructions on tools to use
  const systemMessage = `
To fulfill this request, help the user with direct messaging on Audius:

1. For viewing message threads:
   - Explain how to use the 'get-message-threads' tool
   - Show how to navigate conversations

2. For sending messages:
   - Explain how to use the 'send-message' tool
   - Provide etiquette tips based on messaging purpose
   - Suggest effective communication strategies

3. For viewing conversations:
   - Explain how to use the 'get-messages' tool
   - Show how to mark messages as read with 'mark-message-read'

4. For purpose-specific messaging:
   - Provide templates and examples based on the stated purpose
   - Suggest follow-up strategies
   - Explain best practices for that type of communication

Use the appropriate tools based on the user's needs and provide practical, actionable advice.
  `;
  
  // Create messages for the prompt
  const messages = [
    {
      role: 'system',
      content: {
        type: 'text',
        text: systemMessage,
      },
    },
    {
      role: 'user',
      content: {
        type: 'text',
        text: userMessage,
      },
    },
  ];
  
  return {
    messages,
  };
};