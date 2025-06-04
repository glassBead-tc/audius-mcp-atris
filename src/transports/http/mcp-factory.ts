import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CreateServerArg } from '@smithery/sdk/server/stateful.js';
import { AudiusClient } from '../../sdk-client.js';
import { registerTools, registerResources, registerPrompts } from '../../registry/index.js';
import { AudiusConfig } from '../../schemas/config.schema.js';

/**
 * Factory function to create an MCP server instance for each session
 * This is called by Smithery SDK for each new connection
 */
export function createMcpServer({ sessionId, config }: CreateServerArg<AudiusConfig>): Server {
  // Configure AudiusClient with runtime config
  AudiusClient.setRuntimeConfig({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    environment: config.environment,
    apiHost: config.apiHost,
  });
  
  // Create MCP server instance
  const mcpServer = new McpServer({
    name: config.appName || 'Atris MCP',
    version: '2.3.0',
  });
  
  // Register all components based on config
  registerTools(mcpServer, config);
  registerResources(mcpServer, config);
  registerPrompts(mcpServer, config);
  
  // Return the underlying Server instance for Smithery SDK
  return mcpServer.server;
}