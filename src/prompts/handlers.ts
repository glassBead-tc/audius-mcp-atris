import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { prompts } from './registry.js';

export function registerPromptHandlers(server: Server) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: Object.values(prompts)
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const prompt = prompts[request.params.name];
    if (!prompt) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Prompt not found: ${request.params.name}`
      );
    }

    return {
      messages: prompt.messages
    };
  });
}
