/**
 * inspect_endpoint tool (AX-06) — the focused "describe one endpoint" view.
 *
 * Where `search` answers "which endpoints exist?" with cheap compact rows,
 * `inspect_endpoint` answers "how do I call exactly this one?" — parameters,
 * response schema, the {data} envelope, an auth flag, and a runnable example.
 */
import { Effect } from "effect"
import { SpecIndex, type EndpointMeta } from "../api/SpecIndex.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

export const inspectEndpointToolDefinition = Tool.make({
  name: "inspect_endpoint",
  title: "Inspect an Audius API endpoint",
  description:
    "Describe one Audius API endpoint in depth: its parameters, response schema, the " +
    "{data} response envelope, whether it needs a user bearer token, and a runnable " +
    "example call. Use after `search` to learn how to call a specific endpoint.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Endpoint path, e.g. '/tracks/trending'"
      },
      method: {
        type: "string",
        description: "HTTP method (default GET)",
        enum: ["GET", "POST", "PUT", "DELETE"]
      }
    },
    required: ["path"]
  },
  annotations: ToolAnnotations.make({
    title: "Inspect an Audius API endpoint",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  })
})

/** Heuristic: user-scoped or mutating endpoints require a bearer token. */
function requiresAuth(path: string, method: string): boolean {
  return path.toLowerCase().startsWith("/me") || method !== "GET"
}

function buildExample(ep: EndpointMeta): string {
  const requiredQuery = (ep.parameters ?? [])
    .filter((p) => p.required && p.in === "query")
    .map((p) => {
      const v = p.type === "integer" || p.type === "number" ? "0" : "'…'"
      return `${p.name}: ${v}`
    })
  const queryPart =
    requiredQuery.length > 0 ? `, { query: { ${requiredQuery.join(", ")} } }` : ""
  return `await audius.request('${ep.method}', '${ep.path}'${queryPart})`
}

export const handleInspectEndpoint = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, SpecIndex> =>
  Effect.gen(function* () {
    const specIndex = yield* SpecIndex

    const path = args["path"] as string | undefined
    const method = ((args["method"] as string | undefined) ?? "GET").toUpperCase()

    if (!path || typeof path !== "string") {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: 'path' is required, e.g. inspect_endpoint({ path: '/tracks/trending' })."
        })],
        isError: true
      })
    }

    const ep = specIndex.getEndpoint(path, method)
    if (!ep) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: JSON.stringify({
            error: `No endpoint ${method} ${path} in the Audius API spec.`,
            nextActions: [
              "Check the path and method.",
              "Use search({ path: '<partial path>' }) to find the correct endpoint."
            ]
          }, null, 2)
        })],
        isError: true
      })
    }

    const detail = {
      method: ep.method,
      path: ep.path,
      operationId: ep.operationId,
      summary: ep.summary,
      requiresAuth: requiresAuth(ep.path, ep.method),
      parameters: ep.parameters,
      requestBody: ep.requestBody,
      responseEnvelope: "List endpoints wrap their payload as { data: [ ... ] }.",
      responseSchema: ep.responseSchema,
      example: buildExample(ep)
    }

    return CallToolResult.make({
      content: [TextContent.make({
        type: "text" as const,
        text: JSON.stringify(detail, null, 2)
      })]
    })
  })
