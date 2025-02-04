#!/usr/bin/env node
import { initializeServer } from "./server/server-config.js";
import { RouteRegistry } from "./server/route-registry.js";

async function main() {
  try {
    // Initialize server with configuration
    const serverInstance = await initializeServer();
    
    // Create and register routes
    const routeRegistry = new RouteRegistry(
      serverInstance.getServer(),
      serverInstance.getAudiusSdk(),
      serverInstance.getManagerFactory()
    );
    routeRegistry.registerRoutes();

    console.error('Audius MCP server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
