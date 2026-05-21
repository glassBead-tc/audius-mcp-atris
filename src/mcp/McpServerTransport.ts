/**
 * Server-side Streamable HTTP transport for MCP.
 *
 * Provides a single /mcp endpoint that:
 * - POST: receives JSON-RPC requests, dispatches to handler, returns responses
 * - DELETE: no-op (stateless — nothing to clean up)
 *
 * Stateless design: session IDs are generated and returned on initialize so
 * MCP clients are satisfied, but are never stored or validated server-side.
 * Bearer token always comes from the Authorization header on each request.
 * Uses mcpJson serialization bridge for JSON-RPC ↔ Effect RPC translation.
 */
import { Effect, Scope } from "effect"
import * as Http from "node:http"
import { mcpJson } from "./McpSerialization.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type McpRequestHandler = (
  decoded: unknown,
  bearerToken?: string
) => Promise<unknown>

export interface McpTransportConfig {
  readonly port: number
  readonly handler: McpRequestHandler
}

// ---------------------------------------------------------------------------
// Session ID generation (stateless — IDs are returned to clients but never stored)
// ---------------------------------------------------------------------------

let sessionCounter = 0

function generateSessionId(): string {
  return `session-${++sessionCounter}-${Date.now().toString(36)}`
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/**
 * Start the MCP Streamable HTTP server.
 *
 * Returns an Effect that starts the HTTP server and runs until interrupted.
 */
export const startServer = (
  config: McpTransportConfig
): Effect.Effect<Http.Server, Error, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.async<Http.Server, Error>((resume) => {
      const parser = mcpJson.unsafeMake()

      const server = Http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", process.env["MCP_ALLOW_ORIGIN"] ?? "http://localhost")
      res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, MCP-Session-Id, MCP-Protocol-Version")
      res.setHeader("Access-Control-Expose-Headers", "MCP-Session-Id, MCP-Protocol-Version")

      // Handle preflight
      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)

      // Health check for Cloud Run and load balancers
      if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ status: "ok" }))
        return
      }

      // Only handle /mcp endpoint
      if (url.pathname !== "/mcp") {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Not found. Use POST /mcp" }))
        return
      }

      // DELETE — stateless, nothing to clean up
      if (req.method === "DELETE") {
        res.writeHead(204)
        res.end()
        return
      }

      // Extract bearer token from Authorization header
      const authHeader = req.headers["authorization"] as string | undefined
      const requestBearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined

      // POST — handle JSON-RPC request
      if (req.method === "POST") {
        const contentType = req.headers["content-type"] ?? ""
        if (!contentType.includes("application/json")) {
          res.writeHead(415, { "Content-Type": "application/json" })
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Content-Type must be application/json" }
          }))
          return
        }

        // Read body
        const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1MB limit
        const chunks: Buffer[] = []
        let totalBytes = 0
        for await (const chunk of req) {
          totalBytes += (chunk as Buffer).length
          if (totalBytes > MAX_BODY_BYTES) {
            res.writeHead(413, { "Content-Type": "application/json" })
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: { code: -32700, message: "Request body too large" }
            }))
            req.destroy()
            return
          }
          chunks.push(chunk as Buffer)
        }
        const body = Buffer.concat(chunks).toString("utf-8")

        if (!body.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Empty request body" }
          }))
          return
        }

        try {
          // Decode JSON-RPC → internal format
          const decoded = parser.decode(body)

          // Bearer token comes from the request header on every request
          const bearerToken = requestBearerToken

          // Process each message
          const responses: unknown[] = []
          for (const msg of decoded) {
            const internal = msg as Record<string, unknown>

            // Handle the request
            let result: unknown
            try {
              result = await config.handler(msg, bearerToken)
            } catch (cause) {
              result = {
                _tag: "Exit",
                requestId: internal["id"] ?? "",
                exit: {
                  _tag: "Failure",
                  cause: {
                    _tag: "Fail",
                    error: {
                      code: -32603,
                      message: `Internal error: ${cause}`
                    }
                  }
                }
              }
            }

            if (result !== undefined) {
              // Encode response
              const encoded = parser.encode(result)
              if (encoded) {
                responses.push(encoded)
              }
            }

            // Return a session ID on initialize so MCP clients are satisfied
            if (internal["tag"] === "initialize") {
              const newSessionId = generateSessionId()
              res.setHeader("MCP-Session-Id", newSessionId)
            }
          }

          // Set protocol version header
          res.setHeader("MCP-Protocol-Version", "2025-11-25")

          if (responses.length === 0) {
            // Notification — accepted, no content
            res.writeHead(202)
            res.end()
          } else if (responses.length === 1) {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(responses[0] as string)
          } else {
            // Batch response — each was individually JSON-encoded, combine as array
            res.writeHead(200, { "Content-Type": "application/json" })
            const parsed = responses.map((r) => JSON.parse(r as string))
            res.end(JSON.stringify(parsed))
          }
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: `Parse error: ${e}` }
          }))
        }
        return
      }

      // Unsupported method
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Method not allowed" }))
    })

      server.listen(config.port, () => {
        resume(Effect.succeed(server))
      })

      server.on("error", (err) => {
        resume(Effect.fail(new Error(`Server error: ${err.message}`)))
      })
    }),
    // Release: close the server on interruption/finalization
    (server) => Effect.sync(() => { server.close() })
  )
