/**
 * Errors.ts — typed, agent-directed error model (AX-09).
 *
 * Tool errors are read by the model, not a human: an error is a recovery
 * script. This module turns an Audius API failure into a structured
 * directive — a named errorType, recovery context, and explicit nextActions —
 * instead of a JSON-string nested inside a string.
 */

export type ErrorType =
  | "AUTH_REQUIRED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "BAD_PARAMS"
  | "BAD_PATH"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "REQUEST_BUDGET"
  | "SUBGRAPH_UNCONFIGURED"

export interface ErrorDirective {
  readonly ok: false
  readonly errorType: ErrorType
  readonly status: number
  readonly message: string
  readonly context: { path?: string; method?: string }
  readonly nextActions: string[]
  readonly prohibition: string
  readonly retryAfter?: number
}

function mapStatus(status: number): ErrorType {
  if (status === 401 || status === 403) return "AUTH_REQUIRED"
  if (status === 404) return "NOT_FOUND"
  if (status === 429) return "RATE_LIMITED"
  if (status === 400 || status === 422) return "BAD_PARAMS"
  return "UPSTREAM_ERROR"
}

const NEXT_ACTIONS: Record<ErrorType, string[]> = {
  AUTH_REQUIRED: [
    "This endpoint needs a user bearer token, which this session does not have.",
    "Tell the user the action requires connecting their Audius account, or use a public endpoint instead."
  ],
  RATE_LIMITED: [
    "The Audius API rate-limited this request — an upstream limit, not a bug in your code.",
    "Wait briefly and retry; if looping, reduce the number of requests per execute call."
  ],
  NOT_FOUND: [
    "The path or resource id does not exist.",
    "Re-check the id, or use the search / inspect_endpoint tools to find the correct path."
  ],
  BAD_PARAMS: [
    "The request parameters were rejected by the API.",
    "Use inspect_endpoint on this path to see the exact parameter names, types, and an example."
  ],
  BAD_PATH: [
    "The API path was malformed (paths must start with '/').",
    "Use the search tool to find a valid endpoint path."
  ],
  UPSTREAM_ERROR: [
    "The Audius API returned an unexpected error.",
    "Retry once; if it persists the upstream service may be degraded."
  ],
  TIMEOUT: [
    "The request exceeded its time budget.",
    "Retry, or split the work into fewer / smaller calls."
  ],
  REQUEST_BUDGET: [
    "This execute call hit its request budget (too many audius.request calls).",
    "Batch or aggregate: fetch less data, or paginate with a smaller total."
  ],
  SUBGRAPH_UNCONFIGURED: [
    "The subgraph tool is not configured on this deployment (no Graph API key).",
    "Use the REST API via execute for content data; subgraph covers only on-chain protocol data."
  ]
}

export interface BuildErrorOptions {
  status: number
  errorType?: ErrorType
  message: string
  path?: string
  method?: string
  retryAfter?: number
}

/** Build a structured recovery directive. */
export function buildErrorDirective(opts: BuildErrorOptions): ErrorDirective {
  const errorType = opts.errorType ?? mapStatus(opts.status)
  return {
    ok: false,
    errorType,
    status: opts.status,
    message: opts.message,
    context: { path: opts.path, method: opts.method },
    nextActions: NEXT_ACTIONS[errorType],
    prohibition:
      "Do not retry this call verbatim — it will fail identically. Change something first.",
    ...(opts.retryAfter !== undefined ? { retryAfter: opts.retryAfter } : {})
  }
}

/**
 * Parse a failure thrown by AudiusClient ("Audius API <status>: <body>")
 * into a structured directive. Falls back to UPSTREAM_ERROR / TIMEOUT when
 * the message is not in that shape.
 */
export function directiveFromError(
  err: unknown,
  path?: string,
  method?: string
): ErrorDirective {
  const raw = err instanceof Error ? err.message : String(err)

  const m = /Audius API (\d+): ([\s\S]*)/.exec(raw)
  if (m) {
    const status = parseInt(m[1], 10)
    let message = m[2].trim()
    // The body is often itself JSON like {"code":401,"error":"..."}.
    try {
      const parsed = JSON.parse(message) as { error?: unknown }
      if (parsed && typeof parsed.error === "string") message = parsed.error
    } catch {
      // leave message as the raw body
    }
    return buildErrorDirective({ status, message, path, method })
  }

  if (/timed out|timeout/i.test(raw)) {
    return buildErrorDirective({
      status: 0,
      errorType: "TIMEOUT",
      message: raw,
      path,
      method
    })
  }

  return buildErrorDirective({
    status: 0,
    errorType: "UPSTREAM_ERROR",
    message: raw,
    path,
    method
  })
}
