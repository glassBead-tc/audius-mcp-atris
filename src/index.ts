#!/usr/bin/env node
import { createStdioServer } from './transports/stdio/index.js';
import { getEnvConfig } from './config.js';

// Redirect console.log to console.error to avoid interfering with JSON-RPC
const originalConsoleLog = console.log;
console.log = function(...args: any[]) {
  console.error(...args);
};

// Parse command line arguments
const argv = process.argv.slice(2);
const readOnlyArg = argv.includes('--read-only');
const toolsetsArg = argv.find(arg => arg.startsWith('--toolsets='));
const enabledToolsets = toolsetsArg 
  ? toolsetsArg.split('=')[1].split(',') 
  : undefined; // Let config handle defaults

// Determine transport type
const isHttpMode = process.env.PORT || process.env.MCP_TRANSPORT === 'http';
const httpMode = process.env.MCP_MODE as 'stateful' | 'stateless' || 'stateful';

// Main function
async function main() {
  try {
    if (isHttpMode) {
      // HTTP transport mode (for Smithery deployment)
      console.error('Starting Atris MCP in HTTP mode...');
      console.error(`Mode: ${httpMode}`);
      
      // Dynamically import HTTP transport to avoid loading Smithery SDK in STDIO mode
      const { createHttpServer } = await import('./transports/http/index.js');
      const { app } = await createHttpServer(httpMode);
      const port = process.env.PORT || 3000;
      
      app.listen(port, () => {
        console.error(`Atris MCP HTTP server running on port ${port}`);
        console.error(`Endpoint: http://localhost:${port}/mcp`);
      });
    } else {
      // STDIO transport mode (for local development)
      const config = getEnvConfig();
      console.error(`Starting ${config.appName} v2.3.0`);
      console.error(`Environment: ${config.environment}`);
      console.error(`Transport: STDIO`);
      console.error(`Read-only mode: ${readOnlyArg ? 'enabled' : 'disabled'}`);
      
      // Create config overrides from CLI args
      const configOverrides: any = {};
      if (readOnlyArg) configOverrides.readOnly = true;
      if (enabledToolsets) configOverrides.enabledToolsets = enabledToolsets;
      
      await createStdioServer(configOverrides);
    }
    
    // Handle process termination
    const cleanup = async () => {
      console.error('Shutting down...');
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