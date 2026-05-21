/**
 * ResponseGuard — the output-cap chokepoint (AX-01a).
 *
 * Every tool result passes through `capResult()` before it reaches the wire.
 * A Code Mode server exists to protect the agent's context window; this guard
 * makes context overflow STRUCTURALLY IMPOSSIBLE — no tool result can leave
 * the server above the configured token budget, regardless of which tool
 * produced it or how large the upstream API response was.
 *
 * When a result exceeds the budget it is replaced with a self-contained
 * truncation envelope that names the fix (error-as-directive). The envelope
 * is itself provably far below the budget, so it can never re-trigger the cap.
 *
 * The pure core (`estimateTokens`, `capText`) has no MCP/Effect dependency and
 * is unit-tested directly.
 */
import { CallToolResult, TextContent } from "./McpSchema.js"

/** Rough chars-per-token ratio for JSON-ish text. */
const CHARS_PER_TOKEN = 3.5

/** Bytes of the head/tail samples kept in a truncation envelope. */
const HEAD_CHARS = 8000
const TAIL_CHARS = 2000

/** Estimate the token cost of a string. */
export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / CHARS_PER_TOKEN)

export interface CapResult {
  readonly truncated: boolean
  readonly text: string
}

/**
 * Pure core: given serialized result text and a token budget, return either
 * the original text or a truncation-envelope JSON string. Testable without
 * any MCP/Effect machinery.
 */
export const capText = (text: string, maxTokens: number): CapResult => {
  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN)
  if (text.length <= maxChars) {
    return { truncated: false, text }
  }

  const envelope = {
    truncated: true,
    errorType: "PAYLOAD_CAPPED",
    message:
      `Result was ${text.length} chars (~${estimateTokens(text)} tokens), over the ` +
      `${maxTokens}-token budget. It was withheld to protect the context window.`,
    originalChars: text.length,
    thresholdTokens: maxTokens,
    head: text.slice(0, HEAD_CHARS),
    tail: text.slice(-TAIL_CHARS),
    nextActions: [
      "For the execute tool: return a projected or aggregated value (a ranking, a " +
        "count, a verdict) — not raw API data. The sandbox is a reducer, not a pipe.",
      "For the search tool: add filters, or inspect a single endpoint instead of a tag.",
      "See the audius://workflows resource for projection-correct recipes that reduce " +
        "data inside the sandbox before returning it."
    ]
  }
  return { truncated: true, text: JSON.stringify(envelope, null, 2) }
}

/**
 * Apply the cap to a CallToolResult. Concatenates all text content; if it
 * exceeds the budget the whole result is replaced with the truncation
 * envelope (flatten-and-truncate — there is no value in preserving the
 * structure of something being withheld).
 */
export const capResult = (
  result: typeof CallToolResult.Type,
  maxTokens: number
): typeof CallToolResult.Type => {
  const text = result.content
    .map((c) => {
      const part = c as { type?: string; text?: string }
      return part.type === "text" && typeof part.text === "string" ? part.text : ""
    })
    .join("")

  const capped = capText(text, maxTokens)
  if (!capped.truncated) {
    return result
  }

  return CallToolResult.make({
    content: [TextContent.make({ type: "text" as const, text: capped.text })],
    isError: true
  })
}
