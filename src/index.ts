#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { config } from './config.js';
import { startStreamServer } from './stream-server.js';

// Redirect console.log to console.error to avoid interfering with JSON-RPC
const originalConsoleLog = console.log;
console.log = function(...args: any[]) {
  console.error(...args);
};

// Display basic info
console.error(`Starting ${config.server.name} v${config.server.version}`);
console.error(`Environment: ${config.audius.environment}`);

// Main function
async function main() {
  try {
    // Create MCP server
    const server = createServer();
    
    // Start the streaming server in the background
    console.error('Starting audio streaming server...');
    const streamServer = await startStreamServer().catch(err => {
      console.error('Warning: Audio streaming server failed to start:', err.message);
      console.error('MCP server will continue without streaming functionality');
      return null;
    });
    
    // Create the transport layer
    const transport = new StdioServerTransport();
    
    // Connect the server to the transport
    await server.connect(transport);
    
    console.error('MCP Server running with stdio transport...');
    
    // Handle process termination
    const cleanup = async () => {
      console.error('Shutting down...');
      try {
        // Close the MCP server
        await server.close();
        
        // Close the streaming server if it was started
        if (streamServer) {
          streamServer.close(() => {
            console.error('Streaming server closed successfully');
          });
        }
        
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