import { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RequestHandlerExtra, ToolHandler, ToolDefinition } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Represents a tool that can be registered with the MCP server
 */
export interface AudiusTool {
  name: string;
  schema: any; // JSON Schema to describe tool parameters
  handler: (args: any, extra: RequestHandlerExtra) => CallToolResult | Promise<CallToolResult>;
  readOnly: boolean;
  description: string;
}

/**
 * Interface for a server tool that contains the registered schema and handler
 */
export interface ServerTool {
  name: string;
  schema: z.ZodRawShape;
  handler: (args: any, extra: RequestHandlerExtra) => CallToolResult | Promise<CallToolResult>;
  readOnly: boolean;
  description: string;
}

/**
 * Creates a new Audius Server Tool with the given properties
 */
export function createServerTool(
  name: string,
  schema: any,
  handler: (args: any, extra: RequestHandlerExtra) => CallToolResult | Promise<CallToolResult>,
  readOnly: boolean = true,
  description: string = ''
): ServerTool {
  return {
    name,
    schema,
    handler,
    readOnly,
    description
  };
}

/**
 * Converts JSON Schema to Zod schema for tool registration
 */
export const jsonSchemaToZod = (schema: any): any => {
  // If already a Zod object, return it directly
  if (schema instanceof z.ZodType) {
    return schema;
  }
  
  // If it's a direct object with Zod validators, like { param1: z.string() }
  if (schema && typeof schema === 'object' && !schema.type) {
    // Check if it contains any Zod validators
    const hasZodValidator = Object.values(schema).some(
      val => val instanceof z.ZodType
    );
    
    if (hasZodValidator) {
      return schema; // Return it directly
    }
  }
  
  // Similar to the existing implementation in server.ts
  if (schema && schema.type === 'object' && schema.properties) {
    const zodProps: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, prop] of Object.entries(schema.properties) as [string, any][]) {
      if (prop.type === 'string') {
        zodProps[key] = schema.required?.includes(key) 
          ? z.string() 
          : z.string().optional();
      } else if (prop.type === 'number') {
        zodProps[key] = schema.required?.includes(key) 
          ? z.number() 
          : z.number().optional();
      } else if (prop.type === 'boolean') {
        zodProps[key] = schema.required?.includes(key) 
          ? z.boolean() 
          : z.boolean().optional();
      } else if (prop.type === 'array') {
        // Handle array types
        let itemType: z.ZodTypeAny = z.any();
        if (prop.items?.type === 'string') {
          itemType = z.string();
        } else if (prop.items?.type === 'number') {
          itemType = z.number();
        } else if (prop.items?.type === 'boolean') {
          itemType = z.boolean();
        }
        
        zodProps[key] = schema.required?.includes(key)
          ? z.array(itemType)
          : z.array(itemType).optional();
      } else if (prop.type === 'object' && prop.properties) {
        // Handle nested objects recursively
        const nestedProps = jsonSchemaToZod(prop);
        zodProps[key] = schema.required?.includes(key)
          ? z.object(nestedProps)
          : z.object(nestedProps).optional();
      } else if (prop.enum) {
        // Handle enum types
        zodProps[key] = schema.required?.includes(key)
          ? z.enum(prop.enum as [string, ...string[]])
          : z.enum(prop.enum as [string, ...string[]]).optional();
      } else {
        // For simplicity, treat other types as passthrough
        zodProps[key] = schema.required?.includes(key) 
          ? z.any() 
          : z.any().optional();
      }
    }
    
    // Return the properties as a simple object
    return zodProps;
  }
  
  // Fallback for other schema types
  return {};
};

/**
 * Represents a toolset that groups related tools
 */
export class Toolset {
  name: string;
  description: string;
  private enabled: boolean;
  private readOnly: boolean;
  private readTools: ServerTool[];
  private writeTools: ServerTool[];

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.enabled = false;
    this.readOnly = false;
    this.readTools = [];
    this.writeTools = [];
  }

  /**
   * Adds read-only tools to the toolset
   */
  addReadTools(...tools: ServerTool[]): Toolset {
    for (const tool of tools) {
      if (!tool.readOnly) {
        throw new Error(`Tool ${tool.name} must be read-only to be added to readTools`);
      }
      this.readTools.push(tool);
    }
    return this;
  }

  /**
   * Adds write tools to the toolset
   */
  addWriteTools(...tools: ServerTool[]): Toolset {
    if (this.readOnly) {
      console.warn(`Toolset ${this.name} is read-only, ignoring writeTools addition`);
      return this;
    }
    
    for (const tool of tools) {
      if (tool.readOnly) {
        throw new Error(`Tool ${tool.name} is marked as read-only but being added to writeTools`);
      }
      this.writeTools.push(tool);
    }
    return this;
  }

  /**
   * Gets all active tools (read-only or both read and write, depending on settings)
   */
  getActiveTools(): ServerTool[] {
    if (!this.enabled) {
      return [];
    }
    
    if (this.readOnly) {
      return this.readTools;
    }
    
    return [...this.readTools, ...this.writeTools];
  }

  /**
   * Gets all available tools in the toolset
   */
  getAvailableTools(): ServerTool[] {
    return [...this.readTools, ...this.writeTools];
  }

  /**
   * Sets the toolset to read-only mode
   */
  setReadOnly(): void {
    this.readOnly = true;
  }

  /**
   * Sets the enabled state of the toolset
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Checks if the toolset is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Registers all active tools with the MCP server
   */
  registerTools(server: McpServer): void {
    if (!this.enabled) {
      return;
    }

    // Register read tools
    for (const tool of this.readTools) {
      try {
        // Convert JSON Schema to Zod schema
        const zodSchema = jsonSchemaToZod(tool.schema);
        
        // Register the tool with the MCP server
        server.tool(
          tool.name,  // Name of the tool
          tool.description,  // Description
          zodSchema,  // Schema as a simple object with Zod validators
          async (args) => {  // Handler function 
            return await tool.handler(args, {} as any);
          }
        );
      } catch (error) {
        console.error(`Error registering tool ${tool.name}:`, error);
      }
    }

    // Register write tools if not in read-only mode
    if (!this.readOnly) {
      for (const tool of this.writeTools) {
        try {
          // Convert JSON Schema to Zod schema
          const zodSchema = jsonSchemaToZod(tool.schema);
          
          // Register the tool with the MCP server
          server.tool(
            tool.name,  // Name of the tool
            tool.description,  // Description
            zodSchema,  // Schema as a simple object with Zod validators
            async (args) => {  // Handler function
              return await tool.handler(args, {} as any);
            }
          );
        } catch (error) {
          console.error(`Error registering tool ${tool.name}:`, error);
        }
      }
    }
  }
}

/**
 * Represents a group of toolsets
 */
export class ToolsetGroup {
  private toolsets: Map<string, Toolset>;
  private readOnly: boolean;
  private everythingOn: boolean;

  constructor(readOnly: boolean = false) {
    this.toolsets = new Map();
    this.readOnly = readOnly;
    this.everythingOn = false;
  }

  /**
   * Adds a toolset to the group
   */
  addToolset(toolset: Toolset): void {
    if (this.readOnly) {
      toolset.setReadOnly();
    }
    this.toolsets.set(toolset.name, toolset);
  }

  /**
   * Checks if a toolset is enabled
   */
  isEnabled(name: string): boolean {
    if (this.everythingOn) {
      return true;
    }

    const toolset = this.toolsets.get(name);
    if (!toolset) {
      return false;
    }
    
    return toolset.isEnabled();
  }

  /**
   * Enables a specific toolset
   */
  enableToolset(name: string): boolean {
    const toolset = this.toolsets.get(name);
    if (!toolset) {
      console.warn(`Toolset "${name}" does not exist`);
      return false;
    }
    
    toolset.setEnabled(true);
    return true;
  }

  /**
   * Enables multiple toolsets at once
   */
  enableToolsets(names: string[]): void {
    // Special case for "all"
    if (names.includes('all')) {
      this.everythingOn = true;
      for (const [_, toolset] of this.toolsets) {
        toolset.setEnabled(true);
      }
      return;
    }

    // Enable individual toolsets
    for (const name of names) {
      this.enableToolset(name);
    }
  }

  /**
   * Registers all enabled toolsets with the MCP server
   */
  registerTools(server: McpServer): void {
    for (const [_, toolset] of this.toolsets) {
      toolset.registerTools(server);
    }
  }

  /**
   * Gets all toolsets in the group
   */
  getAllToolsets(): Map<string, Toolset> {
    return this.toolsets;
  }
}