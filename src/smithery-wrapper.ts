/**
 * Wrapper module for Smithery SDK to handle ESM/CJS compatibility issues
 * This uses dynamic imports to avoid the okay-error module resolution problem
 */

// Re-export types statically (these don't cause runtime issues)
export type { CreateServerArg, CreateServerFn, StatefulServerOptions } from '@smithery/sdk/server/stateful.js';

// Create async factory functions for the actual implementations
let statefulServerModule: any;
let statelessServerModule: any;
let sessionModule: any;

export async function createStatefulServer(createMcpServer: any, options?: any) {
  if (!statefulServerModule) {
    statefulServerModule = await import('@smithery/sdk/server/stateful.js');
  }
  return statefulServerModule.createStatefulServer(createMcpServer, options);
}

export async function createStatelessServer(createMcpServer: any, options?: any) {
  if (!statelessServerModule) {
    statelessServerModule = await import('@smithery/sdk/server/stateless.js');
  }
  return statelessServerModule.createStatelessServer(createMcpServer, options);
}

export async function createLRUStore(maxSize: number) {
  if (!sessionModule) {
    sessionModule = await import('@smithery/sdk/server/session.js');
  }
  return sessionModule.createLRUStore(maxSize);
}