/**
 * Login tool — "Log in with Audius" from inside the session.
 *
 * Workaround path for MCP clients that complete OAuth but never attach the
 * bearer token (anthropics/claude-code#46140): the tool hands the user the
 * Audius consent URL; the approval lands on this server's /oauth/callback,
 * which deposits the tokens in the in-memory session store (UserAuth).
 * Subsequent execute/play calls without an Authorization header use the
 * stored login automatically.
 *
 * Flow: login {action:"start"} → user opens URL and approves →
 *       login {action:"status", login_id} → authenticated (verified via /me).
 */
import { Effect } from "effect"
import { AudiusClient } from "../api/AudiusClient.js"
import { UserAuth } from "../auth/UserAuth.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const loginToolDefinition = Tool.make({
  name: "login",
  title: "Log in with Audius",
  description:
    "Authenticate the user with their Audius account for this session. " +
    "`action: \"start\"` returns a consent URL — show it to the user and ask them to open it " +
    "and approve access. Then call `action: \"status\"` with the returned `login_id` to confirm; " +
    "once authenticated, all sandbox `audius.request` calls carry the user's identity " +
    "(including write scope: favorites, reposts, playlists). " +
    "`action: \"logout\"` revokes and clears the session login.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["start", "status", "logout"],
        description: "start: begin a login and get the consent URL; status: check/complete a started login; logout: revoke the session login"
      },
      login_id: {
        type: "string",
        description: "The login_id returned by action:\"start\" (required for action:\"status\")"
      }
    },
    required: ["action"]
  },
  annotations: ToolAnnotations.make({
    title: "Log in with Audius",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  })
})

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const text = (payload: unknown, isError = false): typeof CallToolResult.Type =>
  CallToolResult.make({
    content: [TextContent.make({ type: "text" as const, text: JSON.stringify(payload, null, 2) })],
    ...(isError ? { isError: true } : {})
  })

export const handleLogin = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, UserAuth | AudiusClient> =>
  Effect.gen(function* () {
    const userAuth = yield* UserAuth
    const audiusClient = yield* AudiusClient
    const action = args["action"] as string

    if (!userAuth.enabled) {
      return text({
        error: "Login is not configured on this server: MCP_AUTH_SECRET is not set. " +
          "Ask the server operator to set it (any long random string) and restart."
      }, true)
    }

    if (action === "start") {
      const started = userAuth.startLogin()
      if (!started) {
        return text({ error: "Failed to start a login session." }, true)
      }
      return text({
        status: "awaiting_approval",
        login_id: started.loginId,
        consent_url: started.url,
        instructions: "Show the consent_url to the user and ask them to open it in a browser and approve " +
          "access. Then call login with { action: \"status\", login_id } to complete."
      })
    }

    if (action === "status") {
      const loginId = args["login_id"] as string | undefined
      const claim = loginId ? userAuth.claimLogin(loginId) : (userAuth.isActive() ? "pending" as const : "unknown" as const)

      if (claim === "unknown") {
        return text({
          status: "not_authenticated",
          hint: "No completed login found for this login_id. The user may not have approved yet (ask them to open the consent_url), or the login expired (10 min) — start again."
        })
      }

      // "claimed" (fresh) or "pending" (an earlier login is already active) —
      // verify against Audius and report who we are.
      const bearer = yield* Effect.promise(() => userAuth.bearer())
      if (!bearer) {
        return text({
          status: "not_authenticated",
          hint: "The stored login is no longer valid (refresh failed). Start a new login."
        })
      }
      const me = yield* Effect.catchAll(
        audiusClient.request("GET", "/me", undefined, { bearerToken: bearer }),
        (error) => Effect.succeed({ error: error.message } as unknown)
      )
      const data = me as Record<string, unknown>
      if (data["error"]) {
        return text({ status: "not_authenticated", hint: `Token did not validate: ${data["error"]}. Start a new login.` })
      }
      const u = (data["data"] as Record<string, unknown>) ?? {}
      if (typeof u["id"] === "string") {
        // The verified id is what authorizes app-signed writes downstream.
        userAuth.setUserId(u["id"])
      }
      return text({
        status: "authenticated",
        user: { id: u["id"], handle: u["handle"], name: u["name"], verified: u["verified"] },
        note: "All sandbox audius.request calls now carry this user's identity when no explicit bearer is supplied."
      })
    }

    if (action === "logout") {
      const had = yield* Effect.promise(() => userAuth.logout())
      return text({ status: had ? "logged_out" : "no_active_login" })
    }

    return text({ error: `Unknown action: ${String(action)} — use start, status, or logout.` }, true)
  })
