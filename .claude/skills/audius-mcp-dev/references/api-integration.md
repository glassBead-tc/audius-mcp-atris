# API Integration

## Table of Contents
1. [Current API Stack](#current-api-stack)
2. [SpecLoader: Fetching and Resolving the OpenAPI Spec](#specloader)
3. [SpecIndex: Building the Searchable Index](#specindex)
4. [AudiusClient: Making API Calls](#audiusclient)
5. [TypeGenerator: LLM Context](#typegenerator)
6. [Adding a New API Provider](#adding-a-new-api-provider)
7. [Extending to Open Audio Protocol](#extending-to-open-audio-protocol)

## Current API Stack

```
SpecLoader ──► SpecIndex (for search tool)
    │
    └──► TypeGenerator (for sandbox context)

AppConfig ──► AudiusClient (for sandbox execution)
```

- **SpecLoader** fetches `https://api.audius.co/v1/swagger.yaml`, parses YAML, resolves all `$ref` references
- **SpecIndex** builds keyword indexes over the resolved spec for the search tool
- **AudiusClient** makes authenticated HTTP requests to `https://api.audius.co/v1`
- **TypeGenerator** creates TypeScript declarations from the spec for LLM context in the sandbox

## SpecLoader

`src/api/SpecLoader.ts` — Effect service that fetches and resolves the OpenAPI spec at startup.

```typescript
export class SpecLoader extends Context.Tag("SpecLoader")<
  SpecLoader,
  { readonly spec: OpenApiSpec }
>() {}
```

Key behaviors:
- Fetches from hardcoded URL: `https://api.audius.co/v1/swagger.yaml`
- Parses YAML using the `yaml` package
- Resolves all `$ref` references inline (handles circular refs with `_circular` stub)
- Runs once at startup — spec is cached in the service instance

To change the spec URL, edit the `SPEC_URL` constant. To support multiple specs, see "Adding a New API Provider" below.

### $ref Resolution

The `resolveRefs` function walks the spec recursively:
- `$ref: "#/components/schemas/Track"` → replaced with the resolved schema inline
- Circular references → replaced with `{ _circular: "#/..." }` stub
- External `$ref`s (not `#/`-prefixed) → replaced with `{ _unresolved: "..." }` stub

## SpecIndex

`src/api/SpecIndex.ts` — builds searchable indexes from the resolved spec.

```typescript
export class SpecIndex extends Context.Tag("SpecIndex")<
  SpecIndex,
  {
    readonly search: (filters: SearchFilters) => EndpointMeta[]
    readonly getAllTags: () => string[]
    readonly getEndpointCount: () => number
  }
>() {}
```

### Search filters
```typescript
interface SearchFilters {
  query?: string   // Free-text across operationId + summary + description + path
  tag?: string     // Exact match on tag (case-insensitive)
  path?: string    // Substring match on path
  method?: string  // Exact match (GET, POST, etc.)
}
```

### EndpointMeta (what search returns)
```typescript
interface EndpointMeta {
  path: string
  method: string
  operationId?: string
  summary?: string
  tags: string[]
  parameters: Array<{ name, in, description?, required?, type? }>
  requestBody?: unknown     // Simplified schema (depth-limited to 3)
  responseSchema?: unknown  // Simplified 200 response schema
}
```

Schema simplification strips deep nesting (>3 levels) to keep responses manageable for LLMs.

## AudiusClient

`src/api/AudiusClient.ts` — authenticated HTTP client.

```typescript
export class AudiusClient extends Context.Tag("AudiusClient")<
  AudiusClient,
  {
    readonly request: (
      method: string,
      path: string,
      options?: RequestOptions
    ) => Effect.Effect<unknown, Error>
  }
>() {}
```

Features:
- Base URL: `https://api.audius.co/v1`
- Auto-injects `x-api-key` header from config
- Auto-sets `Content-Type: application/json` for bodies
- SSRF protection: path must start with `/`, cannot contain `@`
- Query params via `options.query`
- JSON body via `options.body`
- Custom headers via `options.headers`

### In the sandbox

The sandbox wraps `AudiusClient.request` as a host function:
```javascript
// Available as:
audius.request(method, path, options?)

// Examples:
const tracks = await audius.request('GET', '/tracks/trending')
const user = await audius.request('GET', '/users/search', { query: { query: 'deadmau5' } })
```

The sandbox auto-parses JSON responses — the host function returns a JSON string which is wrapped by `JSON.parse()`.

## TypeGenerator

`src/sandbox/TypeGenerator.ts` — creates TypeScript type declarations for LLM context.

Generates a string like:
```typescript
declare const audius: {
  request(method: string, path: string, options?: RequestOptions): Promise<any>;

  // --- tracks ---
  // GET /tracks/trending — Get trending tracks
  // GET /tracks/{track_id} — Get a track
  //   Required params: track_id: string
  // ...
};
```

This is injected into the sandbox as `__apiDecls__` (LLM reference, not executable). It helps the LLM understand what endpoints exist and their signatures.

## Adding a New API Provider

To add a second API (e.g., Open Audio Protocol RPC alongside Audius REST):

### Option A: Multiple clients in the same sandbox

1. Create `src/api/OapClient.ts` following `AudiusClient.ts` pattern
2. Inject it alongside `AudiusClient` in `Sandbox.ts`:
   ```typescript
   // Add new host function
   const oapHandle = ctx.newObject()
   const oapRequestFn = ctx.newAsyncifiedFunction("request", async (...args) => {
     // bridge to OapClient
   })
   ctx.setProp(oapHandle, "request", oapRequestFn)
   ctx.setProp(ctx.global, "oap", oapHandle)
   ```
3. Now the sandbox has both `audius.request()` and `oap.request()`
4. Update TypeGenerator to include both APIs

### Option B: Separate spec and index

1. Create `src/api/OapSpecLoader.ts` for the OAP spec
2. Create `src/api/OapSpecIndex.ts` for OAP-specific search
3. Modify search tool to accept a `source` parameter ("audius" | "oap")
4. Route to the appropriate index based on source

### Option C: Merged spec

1. Modify SpecLoader to fetch and merge multiple specs
2. Tag endpoints by source API
3. Search tool filters by source via tags

## Extending to Open Audio Protocol

The Open Audio Protocol's go-openaudio exposes gRPC/Connect services (CoreService, StorageService) on port 50051. To integrate:

1. **API discovery**: OAP doesn't have an OpenAPI spec like Audius. Options:
   - Generate a spec from the protobuf definitions (`ddex-proto`)
   - Create a static endpoint catalog in code
   - Use the Audius REST API as a proxy (it's built on OAP)

2. **Client**: OAP uses gRPC, not REST. For the sandbox:
   - Option A: Create an HTTP bridge (gRPC-web or Connect protocol) and use `fetch`
   - Option B: Pre-build gRPC calls as host functions
   - Option C: Use the Audius REST API which already wraps OAP data

3. **Dev environment**: OAP devnet via `make up` in go-openaudio provides local nodes at `node1.oap.devnet` through `node4.oap.devnet`

The simplest path: extend the existing Audius REST API integration, since Audius already indexes all OAP data. Only add direct OAP integration if you need write operations (uploads, distribution) or validator-specific functionality.
