/**
 * Play tool — resolve a track to its Audius URLs (AX-14).
 *
 * Atris is deployed on Cloud Run: a headless container, not the user's
 * device. A server-side process cannot open media on a remote user's
 * machine, so this tool does NOT shell out and does NOT claim playback.
 * It resolves the track and hands back openable URLs — the web link and
 * the `audius://` desktop deep link — and whoever sits beside the user
 * (the MCP client) performs the actual open.
 */
import { Effect } from "effect"
import { AudiusClient } from "../api/AudiusClient.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const playToolDefinition = Tool.make({
  name: "play",
  title: "Resolve a Track on Audius",
  description:
    "Resolve a track to its Audius URLs — a web link (audius.co/...) and an " +
    "audius:// desktop deep link. Provide either a track ID or a search query. " +
    "Returns the URLs for the MCP client to open; it does not play audio itself.",
  inputSchema: {
    type: "object",
    properties: {
      trackId: {
        type: "string",
        description: "Audius track ID to resolve (e.g., 'D7KyD')"
      },
      query: {
        type: "string",
        description:
          "Search query to find a track (uses the first result). " +
          "Use this when you know the track name but not the ID."
      }
    }
  },
  annotations: ToolAnnotations.make({
    title: "Resolve a Track on Audius",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  })
})

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handlePlay = (
  args: Record<string, unknown>,
  bearerToken?: string
): Effect.Effect<typeof CallToolResult.Type, never, AudiusClient> =>
  Effect.gen(function* () {
    const audiusClient = yield* AudiusClient
    const authContext = bearerToken ? { bearerToken } : undefined
    const trackId = args["trackId"] as string | undefined
    const query = args["query"] as string | undefined

    if (!trackId && !query) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: provide either 'trackId' or 'query' to resolve a track."
        })],
        isError: true
      })
    }

    // Resolve the track via the Audius API.
    let track: Record<string, unknown> | undefined

    if (trackId) {
      const result = yield* Effect.catchAll(
        audiusClient.request("GET", `/tracks/${trackId}`, undefined, authContext),
        (error) => Effect.succeed({ error: error.message } as unknown)
      )
      const data = result as Record<string, unknown>
      if (data["error"]) {
        return CallToolResult.make({
          content: [TextContent.make({
            type: "text" as const,
            text: `Error resolving track ${trackId}: ${data["error"]}`
          })],
          isError: true
        })
      }
      track = (data["data"] as Record<string, unknown>) ?? data
    } else if (query) {
      const result = yield* Effect.catchAll(
        audiusClient.request("GET", "/tracks/search", { query: { query } }, authContext),
        (error) => Effect.succeed({ error: error.message } as unknown)
      )
      const data = result as Record<string, unknown>
      if (data["error"]) {
        return CallToolResult.make({
          content: [TextContent.make({
            type: "text" as const,
            text: `Error searching for "${query}": ${data["error"]}`
          })],
          isError: true
        })
      }
      const tracks = (data["data"] as unknown[]) ?? []
      if (tracks.length === 0) {
        return CallToolResult.make({
          content: [TextContent.make({
            type: "text" as const,
            text: `No tracks found for "${query}".`
          })],
          isError: true
        })
      }
      track = tracks[0] as Record<string, unknown>
    }

    if (!track) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: could not resolve a track."
        })],
        isError: true
      })
    }

    // Build the openable URLs.
    const permalink = track["permalink"] as string | undefined
    const id = (track["id"] as string | undefined) ?? trackId ?? ""
    const title = (track["title"] as string | undefined) ?? "Unknown Track"
    const artist =
      ((track["user"] as Record<string, unknown>)?.["name"] as string | undefined) ??
      "Unknown Artist"

    const webUrl = permalink
      ? (permalink.startsWith("http") ? permalink : `https://audius.co${permalink}`)
      : `https://audius.co/tracks/${id}`
    const deepLink = `audius://${webUrl.replace(/^https?:\/\//, "")}`

    return CallToolResult.make({
      content: [TextContent.make({
        type: "text" as const,
        text: JSON.stringify({
          status: "resolved",
          track: { id, title, artist },
          webUrl,
          deepLink,
          note: "Open webUrl (or deepLink for the desktop app) on the user's device."
        }, null, 2)
      })]
    })
  })
