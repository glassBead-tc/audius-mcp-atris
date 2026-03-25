/**
 * MCP Server — handler wiring for Code Mode.
 *
 * Dispatches JSON-RPC requests to the appropriate handler:
 * - initialize → server info + capabilities
 * - tools/list → search + execute tool definitions
 * - tools/call → dispatch to search or execute handler
 * - ping → empty response
 *
 * This module works directly with the internal Effect RPC message format
 * (decoded by McpSerialization), not raw JSON-RPC.
 */
import { Effect } from "effect"
import { SpecIndex } from "../api/SpecIndex.js"
import { Sandbox } from "../sandbox/Sandbox.js"
import { AppConfig } from "../AppConfig.js"
import { AudiusClient } from "../api/AudiusClient.js"
import { searchToolDefinition, handleSearch } from "../tools/SearchTool.js"
import { executeToolDefinition, handleExecute } from "../tools/ExecuteTool.js"
import { playToolDefinition, handlePlay } from "../tools/PlayTool.js"
import { subgraphToolDefinition, handleSubgraph } from "../tools/SubgraphTool.js"

// ---------------------------------------------------------------------------
// Server info
// ---------------------------------------------------------------------------

const SERVER_INFO = {
  name: "audius-mcp",
  version: "2.0.0",
  description: "Audius Music Platform MCP Server (Code Mode)"
}

const PROTOCOL_VERSION = "2025-11-25"

const INSTRUCTIONS = `
# Audius MCP Server — Code Mode

This server provides access to the Audius music platform API through two tools:

## Workflow
1. **search** — Discover API endpoints by tag, path, method, or keyword
2. **execute** — Run JavaScript code against the API in a sandbox

## Examples

### Find trending tracks
1. search({ tag: "tracks" })
2. execute({ code: "return await audius.request('GET', '/tracks/trending')" })

### Search for an artist
1. search({ query: "search users" })
2. execute({ code: "return await audius.request('GET', '/users/search', { query: { query: 'deadmau5' } })" })

### Get track details
1. execute({ code: "return await audius.request('GET', '/tracks/D7KyD')" })

### Play a track
- play({ query: "Tiny Little Adiantum" }) — searches and opens in desktop app or browser
- play({ trackId: "D7KyD" }) — opens specific track by ID

## Play music
The play tool opens tracks in the Audius desktop app (if installed) or browser.

## On-chain data
The subgraph tool queries protocol data (staking, governance, nodes) via The Graph.

## Available in the sandbox
- \`audius.request(method, path, options?)\` — authenticated API calls
- \`console.log()\` — output captured and returned
- Return values are automatically captured

## API Categories
Use search({ tag: "<tag>" }) with: tracks, users, playlists, challenges, tips, and more.
`.trim()

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Create the MCP request handler.
 *
 * Takes an internal Effect RPC message (decoded by McpSerialization)
 * and returns the response in internal format.
 */
export type McpEffectHandler = (decoded: unknown) => Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient>

export const createHandler = (): McpEffectHandler => {
  return (decoded: unknown): Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient> => {
    const msg = decoded as Record<string, unknown>
    const tag = msg["tag"] as string
    const id = msg["id"] as string
    const payload = msg["payload"] as Record<string, unknown> | undefined

    // Notifications (no id) — acknowledge silently
    if (!id && tag.startsWith("notifications/")) {
      return Effect.succeed(undefined)
    }

    switch (tag) {
      case "initialize":
        return Effect.succeed(makeResponse(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {}
          },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS
        }))

      case "ping":
        return Effect.succeed(makeResponse(id, {}))

      case "tools/list":
        return Effect.succeed(makeResponse(id, {
          tools: [
            stripMake(searchToolDefinition),
            stripMake(executeToolDefinition),
            stripMake(playToolDefinition),
            stripMake(subgraphToolDefinition)
          ]
        }))

      case "tools/call":
        return handleToolCall(id, payload ?? {})

      case "logging/setLevel":
        // Acknowledge but don't do anything
        return Effect.succeed(makeResponse(id, {}))

      case "resources/list":
        return Effect.succeed(makeResponse(id, { resources: [] }))

      case "resources/templates/list":
        return Effect.succeed(makeResponse(id, { resourceTemplates: [] }))

      case "prompts/list":
        return Effect.succeed(makeResponse(id, { prompts: [] }))

      case "completion/complete":
        return Effect.succeed(makeResponse(id, {
          completion: { values: [], total: 0, hasMore: false }
        }))

      default:
        return Effect.succeed(makeErrorResponse(id, -32601, `Method not found: ${tag}`))
    }
  }
}

// ---------------------------------------------------------------------------
// Tool call dispatch
// ---------------------------------------------------------------------------

function handleToolCall(
  id: string,
  payload: Record<string, unknown>
): Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient> {
  const name = payload["name"] as string
  const args = (payload["arguments"] as Record<string, unknown>) ?? {}

  switch (name) {
    case "search":
      return Effect.map(
        handleSearch(args),
        (result) => makeResponse(id, result)
      )

    case "execute":
      return Effect.map(
        handleExecute(args),
        (result) => makeResponse(id, result)
      )

    case "play":
      return Effect.map(
        handlePlay(args),
        (result) => makeResponse(id, result)
      )

    case "subgraph":
      return Effect.map(
        handleSubgraph(args),
        (result) => makeResponse(id, result)
      )

    default:
      return Effect.succeed(
        makeErrorResponse(id, -32602, `Unknown tool: ${name}`)
      )
  }
}

// ---------------------------------------------------------------------------
// Internal message format helpers
// ---------------------------------------------------------------------------

function makeResponse(id: string, result: unknown): unknown {
  return {
    _tag: "Exit",
    requestId: id,
    exit: {
      _tag: "Success",
      value: result
    }
  }
}

function makeErrorResponse(id: string, code: number, message: string): unknown {
  return {
    _tag: "Exit",
    requestId: id,
    exit: {
      _tag: "Failure",
      cause: {
        _tag: "Fail",
        error: { code, message }
      }
    }
  }
}

/**
 * Strip the Effect Schema wrapper to get a plain object.
 * Tool.make returns a branded type — we need the raw object for serialization.
 */
function stripMake(tool: unknown): unknown {
  return JSON.parse(JSON.stringify(tool))
}
