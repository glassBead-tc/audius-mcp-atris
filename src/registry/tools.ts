import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initToolsets } from '../toolsets/index.js';
import { AudiusConfig } from '../schemas/config.schema.js';

/**
 * Register all enabled tools with the MCP server based on configuration
 */
export function registerTools(server: McpServer, config: AudiusConfig): void {
  // Initialize and register toolsets
  const toolsetGroup = initToolsets(
    config.enabledToolsets || ['all'], 
    config.readOnly || false
  );
  
  // Register all enabled tools with the server
  toolsetGroup.registerTools(server);
}