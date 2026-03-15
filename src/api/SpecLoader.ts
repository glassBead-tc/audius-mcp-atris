/**
 * Fetches and resolves the Audius OpenAPI spec at startup.
 *
 * - Fetches swagger.yaml from Audius API
 * - Parses YAML → JSON
 * - Resolves all $ref references inline
 * - Exposes as Effect service
 */
import { Context, Effect, Layer } from "effect"
import YAML from "yaml"

const SPEC_URL = "https://api.audius.co/v1/swagger.yaml"

// ---------------------------------------------------------------------------
// OpenAPI types (minimal, what we need)
// ---------------------------------------------------------------------------

export interface OpenApiSpec {
  readonly openapi: string
  readonly info: { title: string; version: string; description?: string }
  readonly paths: Record<string, Record<string, OpenApiOperation>>
  readonly components?: {
    schemas?: Record<string, unknown>
    parameters?: Record<string, unknown>
  }
  readonly tags?: Array<{ name: string; description?: string }>
}

export interface OpenApiOperation {
  readonly tags?: string[]
  readonly operationId?: string
  readonly summary?: string
  readonly description?: string
  readonly parameters?: Array<OpenApiParameter>
  readonly requestBody?: unknown
  readonly responses?: Record<string, unknown>
}

export interface OpenApiParameter {
  readonly name: string
  readonly in: string
  readonly description?: string
  readonly required?: boolean
  readonly schema?: unknown
}

// ---------------------------------------------------------------------------
// $ref resolution
// ---------------------------------------------------------------------------

function resolveRefs(obj: unknown, root: unknown, seen: Set<string>): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== "object") return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveRefs(item, root, seen))
  }

  const record = obj as Record<string, unknown>

  // Handle $ref
  if (typeof record["$ref"] === "string") {
    const ref = record["$ref"]
    if (seen.has(ref)) {
      // Circular reference — return a stub
      return { _circular: ref }
    }
    seen.add(ref)
    const resolved = followRef(ref, root)
    const result = resolveRefs(resolved, root, seen)
    seen.delete(ref)
    return result
  }

  // Recurse into object properties
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    result[key] = resolveRefs(value, root, seen)
  }
  return result
}

function followRef(ref: string, root: unknown): unknown {
  // Only handle local refs: #/components/schemas/Foo
  if (!ref.startsWith("#/")) return { _unresolved: ref }

  const parts = ref.slice(2).split("/")
  let current: unknown = root
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return { _unresolved: ref }
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current ?? { _unresolved: ref }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SpecLoader extends Context.Tag("SpecLoader")<
  SpecLoader,
  { readonly spec: OpenApiSpec }
>() {}

export const SpecLoaderLive: Layer.Layer<SpecLoader, Error> = Layer.effect(
  SpecLoader,
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(SPEC_URL),
      catch: (e) => new Error(`Failed to fetch spec: ${e}`)
    })

    const text = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (e) => new Error(`Failed to read spec body: ${e}`)
    })

    const raw = YAML.parse(text) as Record<string, unknown>
    const resolved = resolveRefs(raw, raw, new Set()) as OpenApiSpec

    yield* Effect.logInfo(`Loaded Audius API spec: ${Object.keys(resolved.paths ?? {}).length} paths`)

    return { spec: resolved }
  })
)
