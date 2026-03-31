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
    "An authenticated `audius` client is available with:\n" +
    "- `audius.request(method, path, options?)` — call Audius REST API endpoints\n" +
    "- `audius.comms(method, path, options?)` — call Audius comms/messaging endpoints (blast, inbox, chat). Auth is handled automatically.\n\n" +
    "Use `console.log()` to output intermediate results. The return value of the last expression is captured. " +
    "Use the search tool first to discover available endpoints.\n\n" +
    "### Send a blast message to all followers\n" +
    "execute({ code: `\n" +
    "  const payload = {\n" +
    "    method: \"chat.blast\",\n" +
    "    params: {\n" +
    "      blast_id: Date.now().toString(36) + Math.random().toString(36).slice(2),\n" +
    "      audience: \"follower_audience\",\n" +
    "      message: \"Hello from Atris!\"\n" +
    "    },\n" +
    "    current_user_id: \"E2AjR\",\n" +
    "    timestamp: Date.now()\n" +
    "  };\n" +
    "  return await audius.comms('POST', '/mutate', { body: payload });\n" +
    "`})\n\n" +
    "### Read your inbox\n" +
    "execute({ code: `\n" +
    "  return await audius.comms('GET', '/chats', { query: { timestamp: Date.now() } });\n" +
    "`})\n\n" +
    "### Get unread message count\n" +
    "execute({ code: `\n" +
    "  return await audius.comms('GET', '/chats/unread', { query: { timestamp: Date.now() } });\n" +
    "`})\n\n" +
    "### Get blast messages sent\n" +
    "execute({ code: `\n" +
    "  return await audius.comms('GET', '/blasts', { query: { timestamp: Date.now() } });\n" +
    "`})\n\n" +
    "Blast audience options: follower_audience, tipper_audience, remixer_audience, customer_audience, coin_holder_audience",
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
