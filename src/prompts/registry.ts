import { Prompt, PromptRegistry } from './types.js';

const performanceWarning: Prompt = {
  name: 'performance-warning',
  description: 'Critical warning about performance implications when requesting multiple tracks or playlists',
  messages: [
    {
      role: 'system',
      content: {
        type: 'text',
        text: 'WARNING: Requesting more than 10 tracks or playlists at once will result in extremely long wait times that may appear as if the client has crashed. Please limit batch requests to 10 or fewer items for optimal performance.'
      }
    }
  ]
};

export const prompts: PromptRegistry = {
  'performance-warning': performanceWarning
};
