/**
 * Generates TypeScript declaration strings from the Audius OpenAPI spec.
 *
 * Produces a compact `declare const audius: { ... }` namespace that LLMs
 * can use as type context when writing code for the execute() tool.
 */
import { Context, Effect, Layer } from "effect"
import { SpecLoader, type OpenApiSpec, type OpenApiOperation } from "../api/SpecLoader.js"

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TypeGenerator extends Context.Tag("TypeGenerator")<
  TypeGenerator,
  { readonly declarations: string }
>() {}

export const TypeGeneratorLive: Layer.Layer<TypeGenerator, never, SpecLoader> = Layer.effect(
  TypeGenerator,
  Effect.gen(function* () {
    const { spec } = yield* SpecLoader
    const declarations = generateDeclarations(spec)
    yield* Effect.logInfo(`Generated type declarations: ${declarations.length} chars`)
    return { declarations }
  })
)

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function generateDeclarations(spec: OpenApiSpec): string {
  const lines: string[] = [
    "// Audius API type declarations (auto-generated from OpenAPI spec)",
    "",
    "interface RequestOptions {",
    "  query?: Record<string, string | number | boolean>;",
    "  body?: unknown;",
    "  headers?: Record<string, string>;",
    "}",
    "",
    "declare const audius: {",
    "  /**",
    "   * Make an authenticated request to the Audius API.",
    "   * @param method - HTTP method (GET, POST, PUT, DELETE)",
    "   * @param path - API path (e.g., '/tracks/trending')",
    "   * @param options - Optional query params, body, headers",
    "   * @returns Promise resolving to the JSON response",
    "   */",
    "  request(method: string, path: string, options?: RequestOptions): Promise<any>;",
    ""
  ]

  // Group endpoints by tag for organized output
  const byTag = new Map<string, Array<{ path: string; method: string; op: OpenApiOperation }>>()

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!["get", "post", "put", "delete", "patch"].includes(method)) continue
      const tag = op.tags?.[0] ?? "other"
      if (!byTag.has(tag)) byTag.set(tag, [])
      byTag.get(tag)!.push({ path, method, op })
    }
  }

  // Add helper comments per tag
  for (const [tag, endpoints] of byTag) {
    lines.push(`  // --- ${tag} ---`)
    for (const { path, method, op } of endpoints) {
      const summary = op.summary ?? op.description ?? ""
      const paramList = (op.parameters ?? [])
        .filter((p) => p.required)
        .map((p) => `${p.name}: ${schemaToTsType(p.schema)}`)

      lines.push(
        `  // ${method.toUpperCase()} ${path}${summary ? ` — ${truncate(summary, 80)}` : ""}`
      )
      if (paramList.length > 0) {
        lines.push(`  //   Required params: ${paramList.join(", ")}`)
      }
    }
    lines.push("")
  }

  lines.push("};")

  return lines.join("\n")
}

function schemaToTsType(schema: unknown): string {
  if (!schema || typeof schema !== "object") return "any"
  const s = schema as Record<string, unknown>
  switch (s["type"]) {
    case "string": return "string"
    case "integer":
    case "number": return "number"
    case "boolean": return "boolean"
    case "array": return `${schemaToTsType(s["items"])}[]`
    default: return "any"
  }
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\n/g, " ").trim()
  return clean.length > max ? clean.slice(0, max - 3) + "..." : clean
}
