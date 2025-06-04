import { createStatefulServer, createStatelessServer, createLRUStore } from '../../smithery-wrapper.js';
import { AudiusConfigSchema } from '../../schemas/config.schema.js';
import { createMcpServer } from './mcp-factory.js';

/**
 * Create an HTTP server using Smithery SDK
 * @param mode - Whether to run in stateful or stateless mode
 * @returns Express application configured for MCP
 */
export async function createHttpServer(mode: 'stateful' | 'stateless' = 'stateful') {
  if (mode === 'stateful') {
    const sessionStore = await createLRUStore(1000); // Support up to 1000 concurrent sessions
    return await createStatefulServer(createMcpServer, {
      schema: AudiusConfigSchema,
      sessionStore,
    });
  } else {
    return await createStatelessServer(createMcpServer, {
      schema: AudiusConfigSchema,
    });
  }
}