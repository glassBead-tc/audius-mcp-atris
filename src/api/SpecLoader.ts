/**
 * Fetches and resolves the Audius OpenAPI spec at startup.
 *
 * - Fetches swagger.yaml from Audius API
 * - Parses YAML → JSON
 * - Resolves all $ref references inline
 * - Exposes as Effect service
 */
import { Context, Effect, Layer } from "effect"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
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
// Spec text loading — network first, vendored fallback second (AX-22)
// ---------------------------------------------------------------------------

interface LoadedSpec {
  readonly text: string
  readonly source: "network" | "bundled"
}

async function fetchSpecText(): Promise<string> {
  const response = await fetch(SPEC_URL)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.text()
}

async function bundledSpecText(): Promise<string> {
  // dist/api/SpecLoader.js -> ../../specs/openapi-spec.yaml (repo / image root).
  const url = new URL("../../specs/openapi-spec.yaml", import.meta.url)
  return readFile(fileURLToPath(url), "utf-8")
}

/** Load the raw spec text: the live Audius spec first, the vendored copy second. */
async function loadSpecText(): Promise<LoadedSpec> {
  try {
    return { text: await fetchSpecText(), source: "network" }
  } catch (netErr) {
    try {
      return { text: await bundledSpecText(), source: "bundled" }
    } catch {
      throw new Error(
        `Failed to load the Audius API spec from the network (${netErr}) ` +
        `and no usable bundled fallback at specs/openapi-spec.yaml`
      )
    }
  }
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
    // AX-22 — network-first, bundled-fallback. An Audius docs outage degrades
    // Atris to a slightly stale spec instead of failing to boot.
    const loaded = yield* Effect.tryPromise({
      try: loadSpecText,
      catch: (e) => new Error(String(e))
    })

    const raw = YAML.parse(loaded.text) as Record<string, unknown>
    const resolved = resolveRefs(raw, raw, new Set()) as OpenApiSpec

    yield* Effect.logInfo(
      `Loaded Audius API spec from ${loaded.source}: ` +
      `${Object.keys(resolved.paths ?? {}).length} paths`
    )

    return { spec: resolved }
  })
)
