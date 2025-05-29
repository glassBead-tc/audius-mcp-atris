/**
 * Type definitions for the Audius MCP server
 */

/**
 * Extra parameters passed to request handlers
 */
export interface RequestHandlerExtra {
  /**
   * AbortSignal for cancelling the request
   */
  signal?: AbortSignal;
  
  /**
   * Additional context that might be passed
   */
  [key: string]: any;
}

/**
 * Tool handler function type
 */
export interface ToolHandler<T = any> {
  (params: T, extra?: RequestHandlerExtra): Promise<any>;
}

/**
 * Tool definition with schema and handler
 */
export interface ToolDefinition {
  schema: any;
  handler: ToolHandler;
}