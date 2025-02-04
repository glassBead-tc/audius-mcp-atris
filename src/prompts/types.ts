export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export interface Prompt {
  name: string;
  description: string;
  messages: Message[];
}

export interface PromptRegistry {
  [key: string]: Prompt;
}
