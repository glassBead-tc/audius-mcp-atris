# Changes in Version 2.0.0

## Simplified MCP Server Implementation

- Removed HTTP server implementation (http-server.ts) to focus exclusively on STDIO transport
- Removed HTTP-related dependencies from package.json:
  - @types/body-parser
  - @types/express
- Updated index.ts with clarifying comments about STDIO transport usage
- The server now relies solely on STDIO transport for all capabilities
- This change simplifies our deployment and development model
- Enables compatibility with services like Smithery that handle HTTP transport on their end

## Rationale

Using STDIO as the exclusive transport method:
- Simplifies our codebase
- Reduces dependencies
- Improves compatibility with MCP service providers like Smithery
- Makes maintenance easier by focusing on a single transport method

All existing capabilities (tools, resources, prompts) remain fully functional through the STDIO transport.