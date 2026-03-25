# Transport & Protocol

## Table of Contents
1. [MCP Protocol Compliance](#mcp-protocol-compliance)
2. [Streamable HTTP Transport](#streamable-http-transport)
3. [JSON-RPC Serialization Bridge](#json-rpc-serialization-bridge)
4. [Session Management](#session-management)
5. [Adding New Protocol Methods](#adding-new-protocol-methods)
6. [Error Handling Levels](#error-handling-levels)

## MCP Protocol Compliance

This server implements MCP protocol version `2025-11-25`. The spec is at:
https://modelcontextprotocol.io/specification/2025-11-25

Current capabilities declared in initialize response:
```json
{
  "protocolVersion": "2025-11-25",
  "capabilities": { "tools": {} },
  "serverInfo": { "name": "audius-mcp", "version": "2.0.0" },
  "instructions": "..."
}
```

Currently supported methods:
- `initialize` — returns server info, capabilities, instructions
- `ping` — empty response
- `tools/list` — returns tool definitions
- `tools/call` — dispatches to tool handlers
- `logging/setLevel` — acknowledged, no-op
- `resources/list` — empty list
- `resources/templates/list` — empty list
- `prompts/list` — empty list
- `completion/complete` — empty completion

## Streamable HTTP Transport

The transport (`src/mcp/McpServerTransport.ts`) is a raw `node:http` server:

- **`POST /mcp`** — JSON-RPC requests (single or batch)
- **`DELETE /mcp`** — terminate session
- **`OPTIONS /mcp`** — CORS preflight

Key behaviors:
- Content-Type must be `application/json` (returns 415 otherwise)
- Body limit: 1MB
- Notifications (no id) return 202 with no body
- Batch requests are supported — responses are collected and returned as JSON array
- Session is created on `initialize` and stored in-memory
- Non-initialize requests require valid `MCP-Session-Id` header (returns 404 otherwise)

CORS headers are configurable via `MCP_ALLOW_ORIGIN` env var (defaults to `http://localhost`).

### Comparison to Cloudflare Reference

The Cloudflare server uses `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js` which handles most transport concerns. This server implements the transport from scratch for full control, which means:
- More code to maintain, but no MCP SDK dependency
- Custom session management
- Custom batch handling
- Direct access to Effect-based serialization

## JSON-RPC Serialization Bridge

`src/mcp/McpSerialization.ts` translates between:
- **Wire format**: JSON-RPC 2.0 (`{ jsonrpc: "2.0", method: "...", params: {...}, id: "..." }`)
- **Internal format**: Effect RPC (`{ _tag: "Request", tag: "...", id: "...", payload: {...} }`)

Two variants:
- `mcpJson` — for HTTP (single JSON objects)
- `mcpNdJson` — for STDIO (newline-delimited JSON)

The `decode` method parses JSON-RPC and returns internal messages. The `encode` method takes Effect RPC responses and produces JSON-RPC strings.

### How encoding works (for adding new methods)

Decode maps:
- `method: "initialize"` → `{ tag: "initialize", id, payload: params }`
- `method: "tools/call"` → `{ tag: "tools/call", id, payload: params }`
- Notifications (no `id`): `{ tag: "notifications/initialized" }`

Encode maps:
- `{ _tag: "Exit", exit: { _tag: "Success", value } }` → `{ jsonrpc: "2.0", id, result: value }`
- `{ _tag: "Exit", exit: { _tag: "Failure", cause } }` → `{ jsonrpc: "2.0", id, error: {...} }`

## Session Management

Sessions are simple in-memory maps:
```typescript
const sessions = new Map<string, { createdAt: number }>()
```

- Created on `initialize` with a generated ID
- ID returned via `MCP-Session-Id` response header
- Validated on all subsequent non-initialize requests
- Deleted on `DELETE /mcp`

No persistence across restarts. No session data beyond creation timestamp.

## Adding New Protocol Methods

To support a new MCP method (e.g., `resources/read`):

1. **McpSerialization.ts** — if the method uses a non-standard parameter mapping, add handling in `decode`

2. **McpServer.ts** — add a case to the main switch in `createHandler`:
```typescript
case "resources/read":
  return handleResourceRead(id, payload ?? {})
```

3. **Update capabilities** in the initialize response if the new method belongs to a capability group

## Error Handling Levels

There are three levels of errors in the MCP protocol — it's important to use the right one:

### 1. Transport-level (HTTP errors)
Returned directly as HTTP status codes by McpServerTransport:
- 404: wrong path or invalid session
- 405: wrong HTTP method
- 413: body too large
- 415: wrong content type

### 2. Protocol-level (JSON-RPC errors)
Returned as `{ jsonrpc: "2.0", id: null, error: { code, message } }`:
- -32700: Parse error
- -32600: Invalid request (bad session)
- -32601: Method not found
- -32603: Internal error

### 3. Tool-level (in CallToolResult)
Returned as a successful JSON-RPC response, but with `isError: true` in the result:
```typescript
CallToolResult.make({
  content: [TextContent.make({ type: "text", text: "Error: ..." })],
  isError: true
})
```

**Rule**: Tool execution failures (bad arguments, API errors, sandbox errors) should be tool-level, not protocol-level. Protocol-level errors are for MCP protocol violations, not tool logic failures.
