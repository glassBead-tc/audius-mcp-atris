/**
 * Server-side Streamable HTTP transport for MCP.
 *
 * Provides a single /mcp endpoint that:
 * - POST: receives JSON-RPC requests, dispatches to handler, returns responses
 * - DELETE: terminates session
 *
 * Session management via MCP-Session-Id header.
 * Uses mcpJson serialization bridge for JSON-RPC ↔ Effect RPC translation.
 */
import { Effect } from "effect"
import * as Http from "node:http"
import { mcpJson } from "./McpSerialization.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type McpRequestHandler = (
  decoded: unknown
) => Promise<unknown>

export interface McpTransportConfig {
  readonly port: number
  readonly handler: McpRequestHandler
  readonly onSessionStart?: () => string
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

let sessionCounter = 0

function generateSessionId(): string {
  return `session-${++sessionCounter}-${Date.now().toString(36)}`
}

// Active sessions
const sessions = new Map<string, { createdAt: number }>()

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
): Effect.Effect<Http.Server, Error> =>
  Effect.async<Http.Server, Error>((resume) => {
    const parser = mcpJson.unsafeMake()

    const server = Http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, MCP-Session-Id, MCP-Protocol-Version")
      res.setHeader("Access-Control-Expose-Headers", "MCP-Session-Id, MCP-Protocol-Version")

      // Handle preflight
      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      // Only handle /mcp endpoint
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
      if (url.pathname !== "/mcp") {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Not found. Use POST /mcp" }))
        return
      }

      // DELETE — terminate session
      if (req.method === "DELETE") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined
        if (sessionId) {
          sessions.delete(sessionId)
        }
        res.writeHead(204)
        res.end()
        return
      }

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
        const chunks: Buffer[] = []
        for await (const chunk of req) {
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

          // Process each message
          const responses: unknown[] = []
          for (const msg of decoded) {
            const internal = msg as Record<string, unknown>

            // Check if this is the initialize request
            const isInitialize = internal["tag"] === "initialize"

            // Handle the request
            let result: unknown
            try {
              result = await config.handler(msg)
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

            // Create session on initialize
            if (isInitialize) {
              const sessionId = config.onSessionStart?.() ?? generateSessionId()
              sessions.set(sessionId, { createdAt: Date.now() })
              res.setHeader("MCP-Session-Id", sessionId)
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
  })
