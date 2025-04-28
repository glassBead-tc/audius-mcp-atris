/**
 * Helper utilities for formatting MCP tool responses in a type-safe way
 */

/**
 * Define types to match MCP SDK expectations
 */
type TextContent = {
  type: "text";
  text: string;
}

type ImageContent = {
  type: "image";
  mimeType: string;
  data: string;
}

type ResourceContent = {
  type: "resource";
  resource: {
    text?: string;
    uri?: string;
    mimeType?: string;
  } | {
    uri?: string;
    mimeType?: string;
    blob?: string;
  }
}

type Content = TextContent | ImageContent | ResourceContent;

/**
 * Creates a text response for MCP tools with proper type literals
 */
export function createTextResponse(text: string, isError?: boolean) {
  const content: TextContent = {
    type: "text",
    text
  };
  
  const response = {
    content: [content]
  };
  
  if (isError !== undefined) {
    return { ...response, isError };
  }
  
  return response;
}

/**
 * Creates an image response for MCP tools with proper type literals
 */
export function createImageResponse(data: string, mimeType: string, isError?: boolean) {
  const content: ImageContent = {
    type: "image",
    data,
    mimeType
  };
  
  const response = {
    content: [content]
  };
  
  if (isError !== undefined) {
    return { ...response, isError };
  }
  
  return response;
}

/**
 * Creates a resource response for MCP tools with proper type literals
 */
export function createResourceResponse(uri: string, mimeType: string, isError?: boolean) {
  const content: ResourceContent = {
    type: "resource",
    resource: {
      uri,
      mimeType
    }
  };
  
  const response = {
    content: [content]
  };
  
  if (isError !== undefined) {
    return { ...response, isError };
  }
  
  return response;
}

/**
 * Creates a mixed content response for MCP tools
 * Allows combining multiple content types in one response
 */
export function createMixedResponse(
  contents: Content[], 
  isError?: boolean
) {
  const response = { content: contents };
  
  if (isError !== undefined) {
    return { ...response, isError };
  }
  
  return response;
}