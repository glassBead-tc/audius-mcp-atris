/**
 * Tool Registry for Audius MCP Atris
 * 
 * This file defines a registry system for MCP tools, allowing for
 * dynamic registration and retrieval of tool definitions.
 */

import { z } from 'zod';

/**
 * Tool response format
 */
export interface MCPToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Interface defining the structure of a tool definition
 */
export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
  /**
   * The name of the tool
   */
  name: string;
  
  /**
   * A description of what the tool does
   */
  description: string;
  
  /**
   * The Zod schema used to validate input to the tool
   */
  schema: TSchema;
  
  /**
   * Function that executes the tool with validated arguments
   * @param args The validated arguments for the tool
   * @returns A promise resolving to the tool's response
   */
  execute: (args: z.infer<TSchema>) => Promise<MCPToolResponse>;
}

/**
 * Registry to store tool definitions
 */
const toolRegistry = new Map<string, ToolDefinition<any>>();

/**
 * Register a tool in the registry
 * @param tool The tool definition to register
 * @throws Error if a tool with the same name is already registered
 */
export function registerTool<TSchema extends z.ZodType>(tool: ToolDefinition<TSchema>): void {
  if (toolRegistry.has(tool.name)) {
    throw new Error(`Tool with name "${tool.name}" is already registered`);
  }
  
  toolRegistry.set(tool.name, tool);
  console.debug(`Registered tool: ${tool.name}`);
}

/**
 * Get a tool definition from the registry
 * @param toolName The name of the tool to retrieve
 * @returns The tool definition or undefined if not found
 */
export function getToolDefinition(toolName: string): ToolDefinition | undefined {
  return toolRegistry.get(toolName);
}

/**
 * Get all registered tools
 * @returns An array of all registered tool definitions
 */
export function getAllToolDefinitions(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

/**
 * Check if a tool is registered
 * @param toolName The name of the tool to check
 * @returns True if the tool is registered, false otherwise
 */
export function hasToolDefinition(toolName: string): boolean {
  return toolRegistry.has(toolName);
}

/**
 * Export the registry for direct access if needed
 */
export { toolRegistry };