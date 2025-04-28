#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { config } from './config.js';

// Parse command line arguments
const argv = process.argv.slice(2);
const readOnlyArg = argv.includes('--read-only');
const toolsetsArg = argv.find(arg => arg.startsWith('--toolsets='));
const enabledToolsets = toolsetsArg 
  ? toolsetsArg.split('=')[1].split(',') 
  : ['all'];

// Redirect console.log to console.error to avoid interfering with JSON-RPC
const originalConsoleLog = console.log;
console.log = function(...args: any[]) {
  console.error(...args);
};

// Display basic info
console.error(`Starting ${config.server.name} v${config.server.version}`);
console.error(`Environment: ${config.audius.environment}`);
console.error(`STDIO transport only (v2.0.0+)`);
console.error(`Read-only mode: ${readOnlyArg ? 'enabled' : 'disabled'}`);
console.error(`Enabled toolsets: ${enabledToolsets.join(', ')}`);

// Main function
async function main() {
  try {
    // Create MCP server with toolset options
    const server = createServer({
      enabledToolsets,
      readOnly: readOnlyArg
    });
    
    // Create the transport layer - exclusively using STDIO for all capabilities
    // This enables compatibility with services like Smithery that handle HTTP transport
    const transport = new StdioServerTransport();
    
    // Connect the server to the transport
    await server.connect(transport);
    
    console.error('MCP Server running with stdio transport...');
    
    // Handle process termination
    const cleanup = async () => {
      console.error('Shutting down...');
      try {
        await server.close();
        console.error('Server closed successfully');
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
      process.exit(0);
    };
    
    // Register signal handlers
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
  } catch (error) {
    console.error('Fatal server error:', error);
    process.exit(1);
  }
}

// Start the server
main();