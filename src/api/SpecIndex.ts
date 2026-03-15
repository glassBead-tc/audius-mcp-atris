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

function searchEndpoints(
  index: IndexedEndpoint[],
  filters: SearchFilters
): EndpointMeta[] {
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

  if (filters.query) {
    const terms = filters.query.toLowerCase().split(/\s+/)
    results = results.filter((e) =>
      terms.every((term) => e.searchText.includes(term))
    )
  }

  // Return without internal searchText field
  return results.map(({ searchText: _, ...rest }) => rest)
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SpecIndex extends Context.Tag("SpecIndex")<
  SpecIndex,
  {
    readonly search: (filters: SearchFilters) => EndpointMeta[]
    readonly getAllTags: () => string[]
    readonly getEndpointCount: () => number
  }
>() {}

export const SpecIndexLive: Layer.Layer<SpecIndex, never, SpecLoader> = Layer.effect(
  SpecIndex,
  Effect.gen(function* () {
    const { spec } = yield* SpecLoader
    const index = buildIndex(spec.paths)

    const allTags = [...new Set(index.flatMap((e) => e.tags))].sort()

    yield* Effect.logInfo(`Built spec index: ${index.length} endpoints across ${allTags.length} tags`)

    return {
      search: (filters: SearchFilters) => searchEndpoints(index, filters),
      getAllTags: () => allTags,
      getEndpointCount: () => index.length
    }
  })
)
