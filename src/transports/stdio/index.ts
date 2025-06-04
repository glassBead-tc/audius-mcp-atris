import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AudiusConfig, getEnvConfig, mergeConfig } from '../../config.js';
import { registerTools, registerResources, registerPrompts } from '../../registry/index.js';
import { AudiusClient } from '../../sdk-client.js';

/**
 * Create and start an STDIO server for local development
 * @param config - Optional partial configuration to override environment defaults
 */
export async function createStdioServer(config?: Partial<AudiusConfig>): Promise<void> {
  // Get environment config and merge with any runtime overrides
  const envConfig = getEnvConfig();
  const finalConfig = mergeConfig(envConfig, config);
  
  // Configure AudiusClient
  AudiusClient.setRuntimeConfig({
    apiKey: finalConfig.apiKey,
    apiSecret: finalConfig.apiSecret,
    environment: finalConfig.environment,
    apiHost: finalConfig.apiHost,
  });
  
  // Create MCP server instance
  const server = new McpServer({
    name: finalConfig.appName,
    version: '2.3.0',
  });
  
  // Register all components
  registerTools(server, finalConfig);
  registerResources(server, finalConfig);
  registerPrompts(server, finalConfig);
  
  // Create and connect STDIO transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error(`${finalConfig.appName} running on stdio transport`);
}