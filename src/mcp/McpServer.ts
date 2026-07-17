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
import { readFileSync, appendFileSync as appendFileSyncAuth } from "node:fs"
import { Effect } from "effect"
import { SpecIndex } from "../api/SpecIndex.js"
import { Sandbox } from "../sandbox/Sandbox.js"
import { AppConfig } from "../AppConfig.js"
import { AudiusClient } from "../api/AudiusClient.js"
import { searchToolDefinition, handleSearch } from "../tools/SearchTool.js"
import { executeToolDefinition, handleExecute } from "../tools/ExecuteTool.js"
import { playToolDefinition, handlePlay } from "../tools/PlayTool.js"
import { loginToolDefinition, handleLogin } from "../tools/LoginTool.js"
import { UserAuth } from "../auth/UserAuth.js"
import { makeBearerIdentity } from "../auth/BearerIdentity.js"
import { workflowsResource, WORKFLOWS_URI, WORKFLOWS_CONTENT } from "../resources/Workflows.js"
import { CallToolResult } from "./McpSchema.js"
import { capResult } from "./ResponseGuard.js"

// ---------------------------------------------------------------------------
// Server info
// ---------------------------------------------------------------------------

/**
 * Version is read from package.json at module load so the server never lies
 * about itself (capability roadmap P1-5). Falls back to 0.0.0 if the file
 * is unreachable (e.g. exotic packaging).
 */
const PACKAGE_VERSION = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8")
    ) as { version?: string }
    return pkg.version ?? "0.0.0"
  } catch {
    return "0.0.0"
  }
})()

const SERVER_INFO = {
  name: "audius-mcp",
  version: PACKAGE_VERSION,
  description: "Audius Music Platform MCP Server (Code Mode)"
}

const PROTOCOL_VERSION = "2025-11-25"

const makeInstructions = (endpointCount: number, authEnabled: boolean) => `
# Audius MCP Server — Code Mode

Access the Audius music platform (${endpointCount} REST API endpoints) through a small
set of tools. You discover endpoints, then write JavaScript that runs in a sandbox and
calls them — instead of facing hundreds of individual tools.

## Tools
1. **search** — find Audius API endpoints. Returns compact ranked rows
   (method, path, summary, tags). Filter by \`tag\`, \`query\`, \`path\`, or \`method\`;
   call with no filter for the list of tags.
2. **execute** — run JavaScript in a sandbox. An authenticated \`audius\` client is
   available: \`audius.request(method, path, options?)\`. \`console.log()\` is
   captured; the value you \`return\` is the result.
3. **play** — resolve a track (by id or search query) to its Audius URLs. It may
   also open the track locally when the server runs on the user's machine; the
   result's \`opened\` field says whether it did. Never assume audio is playing.

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
${authEnabled ? `
## Authentication (Log in with Audius)
Two ways for the user to connect their Audius account:
1. **MCP-native OAuth** (default): if the MCP client attaches a bearer token, it
   wins over the session login. The server verifies it (\`/me\`) and full write
   scope follows automatically.
2. **login tool** (fallback for clients that never attach bearers): call
   \`login {action:"start"}\`, show the user the \`consent_url\`, have them approve
   in a browser, then \`login {action:"status", login_id}\`. The server holds the
   session and auto-refreshes tokens.
Once authenticated, every \`audius.request\` carries the user's identity: \`/me\`,
their library, favorites, reposts, playlists, and (write scope) mutations on
their behalf. If a user-scoped call returns 401, no login is active — use the
login tool.` : ""}

## Errors, mutations, and data fidelity
- \`audius.request\` NEVER throws on API failures — it resolves to
  \`{ error: "Audius API 404: ..." }\`. Always check \`res.error\` before \`res.data\`,
  or you'll see a misleading "cannot read property of undefined".
- POST/PUT/DELETE perform REAL mutations (favorites, reposts, playlists, follows)
  once the user is authenticated (MCP OAuth or login tool). The server signs
  writes and injects the required \`user_id\` automatically.
- **Writes are TWO-PHASE**: a 200 with \`{ block_number, transaction_hash }\` is a
  transaction receipt, NOT proof of effect — the change only exists once the
  network indexes it (typically seconds). Verify with a follow-up read:
  \`await audius.sleep(3000)\` then re-fetch. Never report a mutation as done
  based on the receipt alone.
- DELETE is destructive and requires \`{ confirm: true }\` in options — confirm
  with the user first.
- Integer amounts longer than 15 digits (wei-scale balances, tips, coin amounts)
  arrive as strings to preserve precision — don't coerce them back to Number.
- Binary endpoints (e.g. \`/tracks/{id}/stream\`) don't return audio bytes; they
  resolve to \`{ url }\` — the final signed CDN URL.
- **Gated reads**: a 403 whose error shows an empty \`authedWallet=\` means the
  endpoint wants a signed request, not a bearer. Retry with
  \`{ auth: "signed" }\` in options (e.g. \`/fan_club/feed?mint=...\`) — the server
  personal-signs the request with its app key and the logged-in user's grant
  authorizes it. Requires an active login.

## Protocol reads (Open Audio Protocol)
Inside \`execute\`, a second client \`protocol.request(path, body?)\` queries the OAP
chain directly (ConnectRPC JSON, read-only). Paths are \`/<pkg>.v1.<Service>/<Method>\`:
- \`/core.v1.CoreService/GetStatus\` — chain health, current height, validators/peers,
  mempool. First stop when writes mine but never index (halted chain vs indexer drop).
- \`/core.v1.CoreService/GetBlock\` \`{height}\`, \`GetBlocks\` \`{height:[...]}\`,
  \`GetTransaction\` \`{txHash}\` — full transaction contents, including ManageEntity
  writes (userId, entityType, action, signer) — any write receipt is auditable on-chain.
- \`/etl.v1.ETLService/\` \`GetPlays\`, \`GetManageEntities\`, \`GetValidators\`
- \`/eth.v1.EthService/\` \`GetRegisteredEndpoints\`, \`GetServiceProviders\` — the
  Ethereum L1 staking registry (node operators, stake, delegation).
- \`/storage.v1.StorageService/GetStatus\`, \`/system.v1.SystemService/Ping\`
Protocol responses are LARGE (GetStatus ~30 KB) — reduce in-sandbox like everything else.

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
export type McpEffectHandler = (decoded: unknown, bearerToken?: string) => Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient | UserAuth>

export const createHandler = (): McpEffectHandler => {
  return (decoded: unknown, bearerToken?: string): Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient | UserAuth> => {
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
        return Effect.gen(function* () {
          const config = yield* AppConfig
          const specIndex = yield* SpecIndex
          return makeResponse(id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: SERVER_INFO,
            instructions: makeInstructions(
              specIndex.getEndpointCount(),
              Boolean(config.mcpAuthSecret)
            )
          })
        })

      case "ping":
        return Effect.succeed(makeResponse(id, {}))

      case "tools/list":
        return Effect.gen(function* () {
          const config = yield* AppConfig
          const tools = [
            stripMake(searchToolDefinition),
            stripMake(executeToolDefinition),
            stripMake(playToolDefinition)
          ]
          // login requires the OAuth broker (MCP_AUTH_SECRET).
          if (config.mcpAuthSecret) {
            tools.push(stripMake(loginToolDefinition))
          }
          return makeResponse(id, { tools })
        })

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

/**
 * Verified identities for MCP-native OAuth bearers (the broker hands clients
 * the raw Audius access token, so /me validates it). Module-level: one cache
 * per server process, shared across sessions.
 */
const bearerIdentity = makeBearerIdentity()

// Auth diagnostics: mirror identity decisions to MCP_DEBUG_LOG (ids only, never tokens)
const authDebug = (msg: string) => {
  const debugLog = process.env["MCP_DEBUG_LOG"]
  if (debugLog) {
    try {
      appendFileSyncAuth(debugLog, `${new Date().toISOString()} [auth] ${msg}\n`)
    } catch { /* diagnostics only */ }
  }
}

function handleToolCall(
  id: string,
  payload: Record<string, unknown>,
  bearerToken?: string
): Effect.Effect<unknown, never, AppConfig | SpecIndex | Sandbox | AudiusClient | UserAuth> {
  return Effect.gen(function* () {
    const config = yield* AppConfig
    const userAuth = yield* UserAuth
    const audiusClient = yield* AudiusClient
    const name = payload["name"] as string
    const args = (payload["arguments"] as Record<string, unknown>) ?? {}

    // Effective user identity: an explicit Authorization header wins; else
    // fall back to the session login established via the `login` tool. Either
    // way, only a VERIFIED user id (GET /me) authorizes app-signed writes in
    // AudiusClient. Bearer verification is cached and only runs for the tools
    // that carry user identity into the sandbox.
    const needsIdentity = name === "execute" || name === "play"
    const bearerUserId = bearerToken && needsIdentity
      ? yield* Effect.promise(() =>
          bearerIdentity.resolve(bearerToken, (token) =>
            Effect.runPromise(
              audiusClient.request("GET", "/me", undefined, { bearerToken: token }).pipe(
                Effect.map((me) => {
                  const u = ((me as Record<string, unknown>)["data"] ?? {}) as Record<string, unknown>
                  return typeof u["id"] === "string" ? u["id"] : undefined
                }),
                Effect.tap((id) => Effect.sync(() => authDebug(`verify /me -> userId=${id}`))),
                Effect.catchAll((e) => {
                  authDebug(`verify /me FAILED: ${e instanceof Error ? e.message : String(e)}`)
                  return Effect.succeed(undefined)
                })
              )
            )
          )
        )
      : undefined
    if (needsIdentity && bearerToken) authDebug(`tool=${name} resolved bearerUserId=${bearerUserId}`)
    const sessionBearer = bearerToken ? undefined : yield* Effect.promise(() => userAuth.bearer())
    const authContext = bearerToken
      ? { bearerToken, ...(bearerUserId !== undefined ? { userId: bearerUserId } : {}) }
      : sessionBearer
        ? { bearerToken: sessionBearer, ...(userAuth.userId() ? { userId: userAuth.userId() } : {}) }
        : undefined

    let result: typeof CallToolResult.Type
    switch (name) {
      case "search":
        result = yield* handleSearch(args)
        break
      case "execute":
        result = yield* handleExecute(args, authContext)
        break
      case "play":
        result = yield* handlePlay(args, authContext)
        break
      case "login":
        result = yield* handleLogin(args)
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
