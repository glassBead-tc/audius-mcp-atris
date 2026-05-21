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
import { workflowsResource, WORKFLOWS_URI, WORKFLOWS_CONTENT } from "../resources/Workflows.js"
import { CallToolResult } from "./McpSchema.js"
import { capResult } from "./ResponseGuard.js"

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

Access the Audius music platform (219 REST API endpoints) through a small set of
tools. You discover endpoints, then write JavaScript that runs in a sandbox and
calls them — instead of facing hundreds of individual tools.

## Tools
1. **search** — find Audius API endpoints. Returns compact ranked rows
   (method, path, summary, tags). Filter by \`tag\`, \`query\`, \`path\`, or \`method\`;
   call with no filter for the list of tags.
2. **execute** — run JavaScript in a sandbox. An authenticated \`audius\` client is
   available: \`audius.request(method, path, options?)\`. \`console.log()\` is
   captured; the value you \`return\` is the result.
3. **play** — resolve a track (by id or search query) to its Audius URLs.
4. **subgraph** — query the Audius protocol subgraph (on-chain staking, governance).

## Recommended workflow
1. \`search({ tag: "tracks" })\` — discover the endpoints you need.
2. \`execute(...)\` — call them, and REDUCE the data before returning.

## CRITICAL: the sandbox is a reducer, not a pipe
Your \`execute\` return value is charged to the model's context window, and Audius
API responses are large (one track is ~6 KB; trending is ~800 KB). NEVER \`return\`
a raw API response — compute inside the sandbox and return only the conclusion:

\`\`\`js
// GOOD — returns ~600 chars
const t = await audius.request('GET', '/tracks/trending', { query: { genre: 'Electronic', limit: 100 } })
return t.data.slice(0, 5).map(x => ({ title: x.title, artist: x.user.name, plays: x.play_count }))

// BAD — returns ~800 KB; the server will withhold it and return a truncation notice
return await audius.request('GET', '/tracks/trending')
\`\`\`

Results larger than the server's token budget are withheld and replaced with a
truncation envelope that explains how to narrow them.

## Response envelope
Audius list endpoints wrap their payload: \`{ data: [ ... ] }\`. Read \`.data\`.
User-scoped endpoints (e.g. \`/me\`) require a user bearer token from the MCP client;
public reads (trending, search) work with the server API key alone.

## Query params
Pass query params as an object inside \`options.query\`, not as a bare string:
\`\`\`js
// correct
audius.request("GET", "/tracks/search", { query: { query: "deadmau5" } })
// wrong — rejected
audius.request("GET", "/tracks/search", { query: "deadmau5" })
\`\`\`

## Ready-made recipes
The \`audius://workflows\` resource holds 13 ready-to-run analysis recipes — genre
popularity, rising stars, artist comparison, BPM landscape and more — each a single
\`execute\` call that reduces data correctly. Read it and adapt.
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
export type McpEffectHandler = (decoded: unknown, bearerToken?: string) => Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient>

export const createHandler = (): McpEffectHandler => {
  return (decoded: unknown, bearerToken?: string): Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient> => {
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
            tools: {},
            resources: {}
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
        return handleToolCall(id, payload ?? {}, bearerToken)

      case "logging/setLevel":
        // Acknowledge but don't do anything
        return Effect.succeed(makeResponse(id, {}))

      case "resources/list":
        return Effect.succeed(makeResponse(id, {
          resources: [workflowsResource]
        }))

      case "resources/read": {
        const uri = (payload ?? {})["uri"] as string
        if (uri === WORKFLOWS_URI) {
          return Effect.succeed(makeResponse(id, {
            contents: [{
              uri: WORKFLOWS_URI,
              mimeType: "text/markdown",
              text: WORKFLOWS_CONTENT
            }]
          }))
        }
        return Effect.succeed(makeErrorResponse(id, -32602, `Resource not found: ${uri}`))
      }

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
  payload: Record<string, unknown>,
  bearerToken?: string
): Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient> {
  return Effect.gen(function* () {
    const config = yield* AppConfig
    const name = payload["name"] as string
    const args = (payload["arguments"] as Record<string, unknown>) ?? {}

    let result: typeof CallToolResult.Type
    switch (name) {
      case "search":
        result = yield* handleSearch(args)
        break
      case "execute":
        result = yield* handleExecute(args, bearerToken)
        break
      case "play":
        result = yield* handlePlay(args, bearerToken)
        break
      case "subgraph":
        result = yield* handleSubgraph(args)
        break
      default:
        return makeErrorResponse(id, -32602, `Unknown tool: ${name}`)
    }

    // AX-01a — every tool result passes through the output cap before the wire,
    // so no payload can ever exceed the agent's context budget.
    return makeResponse(id, capResult(result, config.responseTokenBudget))
  })
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
