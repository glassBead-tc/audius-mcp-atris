# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Start**: `npm run start` - Runs the compiled server
- **Dev mode**: `npm run dev` - Builds and runs in one command
- **Lint**: `npm run lint` - Runs ESLint on TypeScript files
- **Test**: `npm run test` - Currently runs build as test
- **Test client**: `npm run test-client` - Builds and runs the test client

## Architecture Overview

This is an MCP (Model Context Protocol) server that provides LLM access to the Audius music platform via STDIO-based JSON-RPC communication.

### Key Architectural Patterns

1. **Toolset System**: The codebase uses a modular toolset architecture where related tools are grouped together. Each toolset can be selectively enabled via command-line arguments and supports read/write separation.

2. **SDK Client Singleton**: The `AudiusClient` class in `sdk-client.ts` provides a singleton wrapper around the Audius SDK, ensuring consistent API access throughout the application.

3. **Tool Registration Pattern**: Each tool follows a consistent structure with:
   - JSON Schema definition for parameters
   - Handler function that accepts typed arguments and `RequestHandlerExtra`
   - Response formatting using `utils/response.ts` helpers

4. **Resource URI Pattern**: Resources use URIs like `audius://track/{id}` for accessing Audius entities.

5. **Error Handling**: Consistent try-catch pattern with formatted error responses using `createTextResponse(error, true)`.

### Command-Line Options

- `--read-only`: Enables read-only mode, disabling write operations
- `--toolsets`: Comma-separated list of toolsets to enable (e.g., `tracks,users,search`)

### Available Toolsets

tracks, users, playlists, albums, search, social, comments, track-management, playlist-management, messaging, analytics, blockchain, monetization, notifications

Note: The `albums` toolset provides album-specific functionality (get album details, tracks, and user albums).

### Important Implementation Notes

1. **Missing Types**: The codebase references `RequestHandlerExtra` and other types from `../types/index.js` which doesn't exist. When implementing new tools, use the pattern from existing tools.

2. **Console Output**: All console.log calls are redirected to console.error to avoid interfering with STDIO JSON-RPC communication.

3. **Response Formatting**: Always use the helpers in `utils/response.ts` for consistent response formatting:
   - `createTextResponse()` for text responses
   - `createImageResponse()` for images
   - `createResourceResponse()` for resources
   - `createMixedResponse()` for combined content

4. **Zod Validation**: The toolset system converts JSON Schemas to Zod schemas for runtime validation. Ensure all tool parameters have proper JSON Schema definitions.

5. **Async/Await**: All tool handlers are async functions. Use try-catch blocks for error handling.

6. **SDK Client Usage**: Access the Audius SDK through the singleton:
   ```typescript
   const client = AudiusClient.getInstance();
   const result = await client.someMethod(params);
   ```