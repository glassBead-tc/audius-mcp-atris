/**
 * Execute tool — run JavaScript code against the Audius API in a QuickJS sandbox.
 *
 * The sandbox provides an authenticated `audius` client with:
 * - audius.request(method, path, options?) — make API calls
 * - console.log() — captured output
 */
import { Effect } from "effect"
import { Sandbox } from "../sandbox/Sandbox.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

// ---------------------------------------------------------------------------
// Tool definition (for ListTools response)
// ---------------------------------------------------------------------------

export const executeToolDefinition = Tool.make({
  name: "execute",
  title: "Execute Audius API Code",
  description:
    "Execute JavaScript code against the Audius API in an isolated sandbox. " +
    "An authenticated `audius` client is available with `audius.request(method, path, options?)`. " +
    "Use `console.log()` to output intermediate results. The return value of the last expression is captured. " +
    "Use the search tool first to discover available endpoints.",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "JavaScript code to execute. The `audius` client is pre-authenticated."
      },
      timeout: {
        type: "number",
        description: "Maximum execution time in milliseconds (default: 30000)"
      }
    },
    required: ["code"]
  },
  annotations: ToolAnnotations.make({
    title: "Execute Audius API Code",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  })
})

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handleExecute = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, Sandbox> =>
  Effect.gen(function* () {
    const sandbox = yield* Sandbox

    const code = args["code"] as string
    const timeout = args["timeout"] as number | undefined

    if (!code || typeof code !== "string") {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: 'code' argument is required and must be a string."
        })],
        isError: true
      })
    }

    const result = yield* Effect.catchAll(
      sandbox.execute(code, timeout),
      (error) =>
        Effect.succeed({
          output: [] as string[],
          returnValue: undefined as unknown,
          error: error.message
        })
    )

    if (result.error) {
      const text = formatResult(result.output, undefined, result.error)
      return CallToolResult.make({
        content: [TextContent.make({ type: "text" as const, text })],
        isError: true
      })
    }

    const text = formatResult(result.output, result.returnValue)
    return CallToolResult.make({
      content: [TextContent.make({ type: "text" as const, text })]
    })
  })

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatResult(
  output: string[],
  returnValue: unknown,
  error?: string
): string {
  const parts: string[] = []

  if (output.length > 0) {
    parts.push("=== Console Output ===")
    parts.push(...output)
    parts.push("")
  }

  if (error) {
    parts.push("=== Error ===")
    parts.push(error)
  } else if (returnValue !== undefined) {
    parts.push("=== Return Value ===")
    parts.push(
      typeof returnValue === "string"
        ? returnValue
        : JSON.stringify(returnValue, null, 2)
    )
  }

  return parts.join("\n") || "(no output)"
}
