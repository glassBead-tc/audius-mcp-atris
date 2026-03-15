/**
 * Search tool — query the Audius API specification.
 *
 * Lets LLMs discover endpoints, parameters, and response schemas
 * before writing code with the execute() tool.
 */
import { Effect } from "effect"
import { SpecIndex, type SearchFilters } from "../api/SpecIndex.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

// ---------------------------------------------------------------------------
// Tool definition (for ListTools response)
// ---------------------------------------------------------------------------

export const searchToolDefinition = Tool.make({
  name: "search",
  title: "Search Audius API",
  description:
    "Search the Audius API specification to discover endpoints, parameters, and response schemas. " +
    "Use this before writing code with execute(). Filter by tag (e.g., 'tracks', 'users', 'playlists'), " +
    "path pattern, HTTP method, or free-text query.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Free-text search across endpoint descriptions, paths, and operation IDs"
      },
      tag: {
        type: "string",
        description: "Filter by API category (e.g., tracks, users, playlists, challenges)"
      },
      path: {
        type: "string",
        description: "Filter by URL path pattern (e.g., '/tracks/trending')"
      },
      method: {
        type: "string",
        description: "Filter by HTTP method (GET, POST, PUT, DELETE)",
        enum: ["GET", "POST", "PUT", "DELETE"]
      }
    }
  },
  annotations: ToolAnnotations.make({
    title: "Search Audius API",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  })
})

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handleSearch = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, SpecIndex> =>
  Effect.gen(function* () {
    const specIndex = yield* SpecIndex

    const filters: SearchFilters = {
      query: args["query"] as string | undefined,
      tag: args["tag"] as string | undefined,
      path: args["path"] as string | undefined,
      method: args["method"] as string | undefined
    }

    const results = specIndex.search(filters)

    // If no filters provided, return available tags instead of all endpoints
    if (!filters.query && !filters.tag && !filters.path && !filters.method) {
      const tags = specIndex.getAllTags()
      const count = specIndex.getEndpointCount()
      const text = JSON.stringify({
        message: `Audius API has ${count} endpoints across ${tags.length} tags. Provide a filter to search.`,
        availableTags: tags,
        exampleQueries: [
          { tag: "tracks" },
          { query: "trending" },
          { path: "/users" },
          { method: "POST" }
        ]
      }, null, 2)

      return CallToolResult.make({
        content: [TextContent.make({ type: "text" as const, text })]
      })
    }

    const text = JSON.stringify({
      count: results.length,
      endpoints: results
    }, null, 2)

    return CallToolResult.make({
      content: [TextContent.make({ type: "text" as const, text })]
    })
  })
