/**
 * Type definitions for the Audius MCP server
 *
 * Re-exports MCP SDK types so tool files have a single import path.
 */

import { RequestHandlerExtra as _SDKRequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Server-scoped RequestHandlerExtra with generics pre-filled.
 */
export type RequestHandlerExtra = _SDKRequestHandlerExtra<ServerRequest, ServerNotification>;

/**
 * Tool handler function type
 */
export interface ToolHandler<T = any> {
  (params: T, extra: RequestHandlerExtra): Promise<CallToolResult>;
}

/**
 * Tool definition with schema and handler
 */
export interface ToolDefinition {
  schema: any;
  handler: ToolHandler;
}