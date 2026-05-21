/**
 * Searchable index over the Audius OpenAPI spec.
 *
 * Builds indexes by path, tag, method, and keywords.
 * Returns compact endpoint metadata suitable for LLM consumption.
 */
import { Context, Effect, Layer } from "effect"
import { SpecLoader, type OpenApiOperation, type OpenApiParameter } from "./SpecLoader.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EndpointMeta {
  readonly path: string
  readonly method: string
  readonly operationId?: string
  readonly summary?: string
  readonly tags: string[]
  readonly parameters: Array<{
    name: string
    in: string
    description?: string
    required?: boolean
    type?: string
  }>
  readonly requestBody?: unknown
  readonly responseSchema?: unknown
}

export interface SearchFilters {
  readonly query?: string
  readonly tag?: string
  readonly path?: string
  readonly method?: string
  /** Max rows to return (default 50). Keeps the result bounded by construction. */
  readonly limit?: number
}

/**
 * Compact one-line endpoint metadata — what `search` returns (AX-05).
 * Deliberately omits `responseSchema`/`requestBody`/`parameters`: those are the
 * payload-bomb fields, and belong in `inspect_endpoint`'s focused deep view.
 */
export interface CompactEndpoint {
  readonly method: string
  readonly path: string
  readonly operationId?: string
  readonly summary?: string
  readonly tags: string[]
}

/** Bounded, ranked result of a `search` call. */
export interface SearchResult {
  /** Total endpoints matching the filters, before the limit was applied. */
  readonly total: number
  /** Number of rows actually returned. */
  readonly shown: number
  readonly endpoints: CompactEndpoint[]
}

// ---------------------------------------------------------------------------
// Index building
// ---------------------------------------------------------------------------

interface IndexedEndpoint extends EndpointMeta {
  /** Lowercased searchable text: operationId + summary + description + path */
  readonly searchText: string
}

function buildIndex(
  paths: Record<string, Record<string, OpenApiOperation>>
): IndexedEndpoint[] {
  const endpoints: IndexedEndpoint[] = []

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      // Skip non-HTTP-method keys (e.g. "parameters" at path level)
      if (!["get", "post", "put", "delete", "patch", "head", "options"].includes(method)) {
        continue
      }

      const parameters = (op.parameters ?? []).map((p: OpenApiParameter) => ({
        name: p.name,
        in: p.in,
        description: p.description,
        required: p.required,
        type: extractType(p.schema)
      }))

      // Extract response schema from 200 response
      const responseSchema = extractResponseSchema(op.responses)

      const searchText = [
        op.operationId ?? "",
        op.summary ?? "",
        op.description ?? "",
        path,
        ...(op.tags ?? [])
      ].join(" ").toLowerCase()

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: op.operationId,
        summary: op.summary ?? op.description,
        tags: op.tags ?? [],
        parameters,
        requestBody: op.requestBody ? simplifySchema(op.requestBody) : undefined,
        responseSchema,
        searchText
      })
    }
  }

  return endpoints
}

function extractType(schema: unknown): string | undefined {
  if (!schema || typeof schema !== "object") return undefined
  const s = schema as Record<string, unknown>
  if (typeof s["type"] === "string") return s["type"]
  return undefined
}

function extractResponseSchema(responses: Record<string, unknown> | undefined): unknown {
  if (!responses) return undefined
  const ok = responses["200"] as Record<string, unknown> | undefined
  if (!ok) return undefined
  const content = ok["content"] as Record<string, unknown> | undefined
  if (!content) return undefined
  const json = content["application/json"] as Record<string, unknown> | undefined
  if (!json) return undefined
  return simplifySchema(json["schema"])
}

/** Strip deep nesting, keep just the structure LLMs need. */
function simplifySchema(schema: unknown, depth = 0): unknown {
  if (!schema || typeof schema !== "object") return schema
  if (depth > 3) return { type: "object", description: "(nested)" }

  const s = schema as Record<string, unknown>
  const result: Record<string, unknown> = {}

  if (s["type"]) result["type"] = s["type"]
  if (s["description"]) result["description"] = s["description"]
  if (s["enum"]) result["enum"] = s["enum"]

  if (s["properties"] && typeof s["properties"] === "object") {
    const props: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(s["properties"] as Record<string, unknown>)) {
      props[key] = simplifySchema(value, depth + 1)
    }
    result["properties"] = props
  }

  if (s["items"]) {
    result["items"] = simplifySchema(s["items"], depth + 1)
  }

  if (s["required"]) result["required"] = s["required"]

  return result
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const DEFAULT_SEARCH_LIMIT = 50
const MAX_SUMMARY_CHARS = 100

function truncateSummary(s: string): string {
  const clean = s.replace(/\s+/g, " ").trim()
  return clean.length > MAX_SUMMARY_CHARS
    ? clean.slice(0, MAX_SUMMARY_CHARS - 1) + "…"
    : clean
}

function toCompact(e: IndexedEndpoint): CompactEndpoint {
  return {
    method: e.method,
    path: e.path,
    operationId: e.operationId,
    summary: e.summary ? truncateSummary(e.summary) : undefined,
    tags: e.tags
  }
}

/**
 * Relevance score for ranking — a path/operationId hit outranks a summary
 * hit, which outranks a tag-only match. With no query terms, score is 0 and
 * results fall back to shortest-path ordering (more central endpoints first).
 */
function scoreEndpoint(e: IndexedEndpoint, terms: string[]): number {
  let score = 0
  const path = e.path.toLowerCase()
  const opId = (e.operationId ?? "").toLowerCase()
  const summary = (e.summary ?? "").toLowerCase()
  for (const term of terms) {
    if (path.includes(term)) score += 100
    if (opId.includes(term)) score += 60
    if (summary.includes(term)) score += 20
  }
  return score
}

function searchEndpoints(
  index: IndexedEndpoint[],
  filters: SearchFilters
): SearchResult {
  let results = index

  if (filters.tag) {
    const tag = filters.tag.toLowerCase()
    results = results.filter((e) =>
      e.tags.some((t) => t.toLowerCase() === tag)
    )
  }

  if (filters.method) {
    const method = filters.method.toUpperCase()
    results = results.filter((e) => e.method === method)
  }

  if (filters.path) {
    const pathFilter = filters.path.toLowerCase()
    results = results.filter((e) =>
      e.path.toLowerCase().includes(pathFilter)
    )
  }

  const terms = filters.query
    ? filters.query.toLowerCase().split(/\s+/).filter(Boolean)
    : []

  if (terms.length > 0) {
    results = results.filter((e) =>
      terms.every((term) => e.searchText.includes(term))
    )
  }

  // Rank: query relevance first, then shorter paths (more central endpoints).
  const ranked = [...results].sort((a, b) => {
    const ds = scoreEndpoint(b, terms) - scoreEndpoint(a, terms)
    if (ds !== 0) return ds
    return a.path.length - b.path.length
  })

  const limit =
    filters.limit && filters.limit > 0 ? filters.limit : DEFAULT_SEARCH_LIMIT
  const shown = ranked.slice(0, limit)

  return {
    total: ranked.length,
    shown: shown.length,
    endpoints: shown.map(toCompact)
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SpecIndex extends Context.Tag("SpecIndex")<
  SpecIndex,
  {
    readonly search: (filters: SearchFilters) => SearchResult
    readonly getAllTags: () => string[]
    readonly getEndpointCount: () => number
    /** Full metadata for one endpoint (AX-06 — backs inspect_endpoint). */
    readonly getEndpoint: (path: string, method: string) => EndpointMeta | undefined
  }
>() {}

export const SpecIndexLive: Layer.Layer<SpecIndex, never, SpecLoader> = Layer.effect(
  SpecIndex,
  Effect.gen(function* () {
    const { spec } = yield* SpecLoader
    const index = buildIndex(spec.paths)

    const allTags = [...new Set(index.flatMap((e) => e.tags))].sort()

    // Exact-match lookup for inspect_endpoint, keyed "METHOD /path".
    const byKey = new Map<string, IndexedEndpoint>()
    for (const e of index) {
      byKey.set(`${e.method} ${e.path.toLowerCase()}`, e)
    }

    yield* Effect.logInfo(`Built spec index: ${index.length} endpoints across ${allTags.length} tags`)

    return {
      search: (filters: SearchFilters) => searchEndpoints(index, filters),
      getAllTags: () => allTags,
      getEndpointCount: () => index.length,
      getEndpoint: (path: string, method: string): EndpointMeta | undefined => {
        const found = byKey.get(`${method.toUpperCase()} ${path.toLowerCase()}`)
        if (!found) return undefined
        const { searchText: _ignored, ...rest } = found
        return rest
      }
    }
  })
)
