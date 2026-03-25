# Jules / Code Mode Audit for Atris

> **Resolution status (2026-03-25):** This audit was conducted against the pre-rebuild codebase. The Code Mode rebuild (commit `8326a25`) addresses the findings as follows:
>
> | Finding | Severity | Status | How |
> |---------|----------|--------|-----|
> | Search contract (fixed filter vs code-over-spec) | Critical | **Resolved** | Search tool now provides structured filtering (tag/path/method/query) with full endpoint metadata and parameter schemas. Not code-over-spec (unnecessary at 207 endpoints vs Cloudflare's 2,500), but a proper discovery tool. |
> | Execute type surface hidden from model | Critical | **Resolved** | TypeGenerator injects TS declarations into sandbox context. Execute tool description includes full `audius.request()` signature and examples. |
> | Sandbox async semantics (multi-await) | High | **Resolved** | Replaced `newAsyncifiedFunction` (asyncify can only unwind WASM stack once) with `QuickJSDeferredPromise` pattern supporting unlimited chained awaits. |
> | Transport correctness | High | **Resolved** | Session validation on non-initialize requests, content-type enforcement (415), body size limit (1MB), CORS headers, proper JSON-RPC error codes with `id: null`. |
> | Token discipline | High | **Resolved** | 4 tool definitions (~1,000 tokens) vs 207 individual tools (~20,000 tokens). |
> | SSRF / security | High | **Resolved** | Path validation (must start with `/`, no `@`), hardcoded base URL, no `fetch` in sandbox, 64MB memory cap, 30s timeout. |
> | Agent guidance / instructions | High | **Resolved** | Server sends structured instructions on initialize with workflow examples, tool descriptions include usage patterns. |
> | Protocol drift (MCP version) | Medium | **Resolved** | Implements MCP 2025-11-25 spec. |
>
> Remaining items (not yet addressed): OAuth/auth flow, response truncation, code-over-spec search variant.

## Executive Summary
The current `main` branch is not Cloudflare-style server-side Code Mode in the ways that matter most to an agent. It does expose two tools, but `search` is a fixed filter wrapper instead of code over a typed spec, `execute` hides weak types behind an internal global the model never sees, and the transport/security/docs layers add protocol drift and misleading agent guidance on top. QuickJS is not the problem by itself; [Cloudflare's Code Mode docs](https://developers.cloudflare.com/agents/api-reference/codemode/) explicitly allow custom executors. The problem is that Atris does not deliver the same search contract, type surface, sandbox semantics, transport correctness, or token discipline.

Severity counts: Critical 2, High 7, Medium 7, Low 1.

## Evidence Base
- Local repo truth from `src/`, `README.md`, `package.json`, `specs/openapi-spec.yaml`, and `docs/agent-data-flow-architecture.md`
- Local Cloudflare reference project in `cloudflare-serverside-mcp-ref/`
- Official external sources:
  - [Cloudflare Code Mode docs](https://developers.cloudflare.com/agents/api-reference/codemode/)
  - [Cloudflare Code Mode blog post, February 20, 2026](https://blog.cloudflare.com/code-mode-mcp/)
  - [MCP 2025-11-25 Streamable HTTP transport spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
  - [Jules environment setup docs](https://jules.google/docs/environment)

## Findings

## Codemode Architecture Gaps

### 1. `search` is not actually Code Mode search
- Severity: High
- Why it matters: Cloudflare's server-side Code Mode lets the model write code against a `spec` object so it can iterate, filter, inspect schemas, and compose its own discovery logic. Atris instead exposes a hand-authored filter tool, which removes the main advantage of Code Mode: progressive discovery through code rather than through a fixed query API.
- Repo evidence: `src/tools/SearchTool.ts:15-43` defines `search` as `{ query, tag, path, method }`, and `src/tools/SearchTool.ts:57-99` just calls `specIndex.search(filters)`. `src/api/SpecIndex.ts:146-180` confirms the behavior is fixed filtering over a prebuilt array.
- Comparison evidence: `cloudflare-serverside-mcp-ref/src/server.ts:118-168` exposes `search` as a `code` string, and `cloudflare-serverside-mcp-ref/src/executor.ts:138-179` executes that code in an isolated search worker with a full `spec` object. Cloudflare's docs and blog describe server-side Code Mode as two tools where the model writes code for both search and execution, not one code tool plus one conventional filter tool.
- Recommended fix direction: Replace the filter schema with a `code` string executed in a no-network search sandbox over a processed `spec` object.

### 2. Generated types are effectively dead code, and too weak to be useful even if surfaced
- Severity: High
- Why it matters: Code Mode depends on surfacing a typed SDK contract to the model. Atris generates a declaration blob, but the model never sees it in tool metadata, and the declaration itself collapses everything to `request(method: string, path: string, options?): Promise<any>`. That is closer to comments than to a typed SDK.
- Repo evidence: `src/sandbox/TypeGenerator.ts:33-89` generates comments plus a single `request(...): Promise<any>` signature. `src/sandbox/Sandbox.ts:117-140` injects the text into `__apiDecls__`, but `src/tools/ExecuteTool.ts:16-45` does not mention `__apiDecls__` or include the generated types in the tool description. The execute tool surface visible to the model is still just `code` and `timeout`.
- Comparison evidence: `cloudflare-serverside-mcp-ref/src/server.ts:171-178` injects the visible type surface directly into the execute tool description, and [Cloudflare's Code Mode docs](https://developers.cloudflare.com/agents/api-reference/codemode/) describe type generation as part of the contract the LLM reads before writing code.
- Recommended fix direction: Either surface real types in the tool description or remove the fake type-generation path until it can produce and expose meaningful method/path/schema information.

### 3. The spec pipeline is lower-fidelity and less robust than the Cloudflare reference
- Severity: Medium
- Why it matters: Cloudflare preprocesses and caches a resolved spec so the search tool can inspect request bodies and responses with high fidelity. Atris fetches the live spec at startup, simplifies it aggressively, and discards information that would make code-based discovery actually useful.
- Repo evidence: `src/api/SpecLoader.ts:12,107-131` fetches `https://api.audius.co/v1/swagger.yaml` at startup instead of using the bundled `specs/openapi-spec.yaml`. `docs/agent-data-flow-architecture.md:3` says agents discover endpoints from a bundled spec, which is no longer true. `src/api/SpecIndex.ts:102-139` only keeps the `200` JSON response schema and truncates nested schemas after depth 3.
- Comparison evidence: `cloudflare-serverside-mcp-ref/src/spec-processor.ts:59-90` resolves refs and keeps request/response structures needed for search. `cloudflare-serverside-mcp-ref/src/index.ts:122-154` persists processed spec artifacts instead of depending on a live fetch on every startup.
- Recommended fix direction: Preprocess the spec once, persist a processed artifact, and keep request/response fidelity high enough for schema inspection.

### 4. The current `search` contract is narrower than the index behind it
- Severity: Low
- Why it matters: Even within the current fixed-filter model, the tool schema leaves discovery power on the table.
- Repo evidence: `src/tools/SearchTool.ts:37-40` only allows `GET`, `POST`, `PUT`, and `DELETE`, while `src/api/SpecIndex.ts:55-56` indexes `patch`, `head`, and `options` too.
- Comparison evidence: Cloudflare's code-based `search` has no equivalent hard-coded method restriction because the model can inspect whatever methods exist in `spec.paths`.
- Recommended fix direction: Remove the enum restriction or, better, move to code-based search and drop this class of schema mismatch entirely.

## Sandbox and API Execution Problems

### 5. API failures are converted into success-shaped `{ error }` payloads instead of thrown failures
- Severity: Critical
- Why it matters: This is the most dangerous semantic bug in the implementation. A failed Audius API call can come back as `{ error: "..." }`, and the tool still returns a normal success result unless the model notices and checks for that shape manually. Agents will frequently treat failed API calls as successful data.
- Repo evidence: `src/sandbox/Sandbox.ts:87-105` catches host-side API errors and returns `JSON.stringify({ error: errorMsg })`. `src/sandbox/Sandbox.ts:126-132` then parses that string and returns the object to user code. `src/tools/ExecuteTool.ts:70-91` only marks the tool as `isError: true` when `sandbox.execute()` itself fails, not when the wrapped API call returns an error-shaped object.
- Comparison evidence: `cloudflare-serverside-mcp-ref/src/executor.ts:64-69,105-108` throws on API failures, and `cloudflare-serverside-mcp-ref/src/server.ts:158-167,199-207,262-266` turns executor failures into tool errors. Cloudflare's contract preserves the difference between failure and data.
- Recommended fix direction: Let host-side API failures reject back into the sandbox so user code sees a thrown error, not a success payload with an `error` field.

### 6. `AudiusClient` cannot represent non-JSON, partial-content, or download-style endpoints that the Audius spec exposes
- Severity: High
- Why it matters: The repo still talks like Atris can cover Audius media and download workflows, but the current client hardcodes JSON request/response behavior. That means the Code Mode server cannot faithfully represent important parts of the Audius API surface.
- Repo evidence: `src/api/AudiusClient.ts:65-92` always JSON-encodes request bodies and always parses `response.json()`. `specs/openapi-spec.yaml:3632-3689` defines `/tracks/{track_id}/download` with empty content and `216` partial content. `specs/openapi-spec.yaml:3840-3927` defines `/tracks/{track_id}/stream` with partial-content and range semantics. The current client cannot safely return these responses.
- Comparison evidence: `cloudflare-serverside-mcp-ref/src/executor.ts:41-71` explicitly supports non-JSON responses and `contentType` / `rawBody`. `cloudflare-serverside-mcp-ref/src/server.ts:173-187` teaches the model how to use richer request options when needed.
- Recommended fix direction: Extend the request contract to support raw responses, caller-controlled content types, and explicit response handling instead of unconditional JSON parsing.

### 7. `execute` metadata and instructions overstate safety and misdescribe behavior
- Severity: High
- Why it matters: Tool metadata is part of the agent contract. Wrong annotations and examples can trigger unsafe approvals, bad code generation, or both.
- Repo evidence: `src/tools/ExecuteTool.ts:20-23` says "The return value of the last expression is captured," but `src/sandbox/Sandbox.ts:135-139` wraps user code in an `AsyncFunction` body, which requires an explicit `return`. `src/mcp/McpServer.ts:53-59` similarly says return values are "automatically captured." `src/tools/ExecuteTool.ts:38-43` also sets `destructiveHint: false` even though this tool can issue `POST`, `PUT`, `PATCH`, and `DELETE` requests.
- Comparison evidence: `cloudflare-serverside-mcp-ref/src/server.ts:178-186` tells the model to provide an async function that returns a result. Cloudflare's docs describe Code Mode as a generic tool-calling surface, not a harmless read-only executor.
- Recommended fix direction: Update the tool description to require explicit `return`, and set safety annotations conservatively. If write operations are allowed, `destructiveHint: false` is not honest metadata.

### 8. Output is unbounded, which undercuts the token-efficiency claim
- Severity: Medium
- Why it matters: Code Mode is supposed to reduce context use. Atris can still dump arbitrarily large JSON payloads back into the model context, defeating the token-efficiency story at the point where results come back.
- Repo evidence: `src/tools/SearchTool.ts:92-99` returns the full endpoint list with pretty-printed JSON. `src/tools/ExecuteTool.ts:98-123` returns the full serialized value with no truncation policy.
- Comparison evidence: `cloudflare-serverside-mcp-ref/src/truncate.ts:1-15` implements a shared truncation policy, and `cloudflare-serverside-mcp-ref/src/server.ts:160-161,201-202,260-261` uses it for both tools.
- Recommended fix direction: Add a shared response-size limiter and return a self-describing truncation message when results exceed a safe budget.

## MCP Transport, Security, and Compliance

### 9. The HTTP transport does not validate `Origin`, violating the MCP security requirement
- Severity: Critical
- Why it matters: The MCP Streamable HTTP spec treats Origin validation as mandatory because otherwise local MCP servers can be abused through DNS rebinding or hostile browser contexts.
- Repo evidence: `src/mcp/McpServerTransport.ts:58-228` sets permissive CORS headers but never checks `req.headers.origin`.
- Comparison evidence: The [MCP 2025-11-25 transport spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) says Streamable HTTP servers must validate `Origin` and reject invalid origins.
- Recommended fix direction: Validate `Origin` before processing requests, default to a strict allowlist, and fail closed.

### 10. The server relies on default network binding behavior instead of explicitly binding to localhost
- Severity: High
- Why it matters: For local developer tools, exposing an HTTP MCP server on all interfaces is an avoidable footgun.
- Repo evidence: `src/mcp/McpServerTransport.ts:231-233` calls `server.listen(config.port)` with no host, and `src/AppConfig.ts:20-27` has no host configuration.
- Comparison evidence: The [MCP transport spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) says local servers should bind only to localhost. This finding is partly inferred from Node's default `listen()` behavior when no host is provided.
- Recommended fix direction: Add an explicit host setting with a safe default of `127.0.0.1` for local runs.

### 11. Session IDs are predictable instead of cryptographically secure
- Severity: High
- Why it matters: Predictable session identifiers weaken session isolation if the server is ever exposed beyond a trusted loopback environment.
- Repo evidence: `src/mcp/McpServerTransport.ts:33-37` generates session IDs from an incrementing counter plus `Date.now()`.
- Comparison evidence: The [MCP transport spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) says `MCP-Session-Id` values should be globally unique and cryptographically secure.
- Recommended fix direction: Replace the current generator with `crypto.randomUUID()` or an equivalent secure token.

### 12. Missing-session handling and protocol-version handling diverge from the MCP spec
- Severity: Medium
- Why it matters: Strict clients may retry incorrectly or assume a version negotiation happened when the server never validated it.
- Repo evidence: `src/mcp/McpServerTransport.ts:143-153` returns `404` whenever the session header is missing or unknown. `src/mcp/McpServerTransport.ts:199-200` always sets `MCP-Protocol-Version: 2025-11-25`, but the code never reads or validates the inbound `MCP-Protocol-Version`.
- Comparison evidence: The [MCP transport spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) says missing required session IDs should be `400`, expired/unknown sessions should be `404`, and invalid or unsupported `MCP-Protocol-Version` values must return `400`.
- Recommended fix direction: Distinguish missing header from unknown session, validate the inbound protocol version on each request, and reject unsupported values explicitly.

### 13. The server accepts JSON-RPC batches even though Streamable HTTP requires a single message per POST
- Severity: Medium
- Why it matters: This creates a non-standard transport dialect and opens odd edge cases around initialization and session flow.
- Repo evidence: `src/mcp/McpSerialization.ts:211-214` decodes JSON arrays into multiple messages, and `src/mcp/McpServerTransport.ts:138-214` explicitly iterates batched requests and responses.
- Comparison evidence: The [MCP transport spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) says the POST body must be a single JSON-RPC request, notification, or response.
- Recommended fix direction: Reject JSON arrays at the HTTP boundary for Streamable HTTP transport.

## Docs, Packaging, and Jules-Specific Failure Amplifiers

### 14. `README.md` describes a different product than the code that ships
- Severity: High
- Why it matters: This is the most direct Jules-specific failure amplifier in the repo. If Jules reads the README to infer setup, transport, or capabilities, it will be grounded on stale instructions before it ever discovers the real implementation.
- Repo evidence: `README.md:1-8` says version `2.0.0+` uses STDIO, targets MCP `2025-06-18`, and has 105 tools. `README.md:119-133` documents deleted env vars and a deleted `src/config.ts`. `README.md:151-232` shows stdio `claude mcp add` examples. `README.md:234-260` still lists the old multi-tool feature set. The actual code exposes Streamable HTTP and two tools in `src/mcp/McpServer.ts:23-30,87-106`, and `docs/agent-data-flow-architecture.md:3` describes the current HTTP/Code Mode shape.
- Comparison evidence: The current [Jules environment docs](https://jules.google/docs/environment) say Jules studies `agents.md` or `readme.md` to learn how to set up the repo. That makes stale README content an active agent-quality bug, not just bad documentation.
- Recommended fix direction: Rewrite the README so it matches the current server, current protocol, actual env vars, and actual client configuration flow.

### 15. Version and publish metadata drift make the package harder to trust
- Severity: Medium
- Why it matters: Release metadata should agree with the running server and the files that actually exist in the repo.
- Repo evidence: `package.json:3` says version `2.4.0`, while `src/mcp/McpServer.ts:23-26` reports `serverInfo.version = "2.0.0"`. `package.json:36-41` includes `CHANGES.md` and `LICENSE` in the published file list, but neither file exists at the repo root.
- Comparison evidence: This is not a Cloudflare-specific rule; it is straightforward release hygiene that becomes more important when agents and users rely on metadata for setup and trust.
- Recommended fix direction: Derive serverInfo from package metadata and fix the publish manifest before the next release.

## Quality and Validation Gaps

### 16. There are no substantive tests for the rebuilt Code Mode server
- Severity: Medium
- Why it matters: The post-rebuild git history already shows multiple follow-up bug-fix commits. Shipping a protocol-heavy sandboxed server with no behavior tests makes that pattern likely to continue.
- Repo evidence: `package.json:10-16` defines `npm test` as `npm run build`. A project-wide search found no main-project `src/tests/`, `test/`, `*.test.ts`, or `*.spec.ts` files for the current server implementation.
- Comparison evidence: The embedded Cloudflare reference includes targeted tests under `cloudflare-serverside-mcp-ref/src/tests/` for executor behavior, truncation, auth, and spec processing.
- Recommended fix direction: Add tests for transport semantics, sandbox error propagation, search behavior, and API-client response handling before further feature work.

### 17. The current validation bar proves only that TypeScript compiles
- Severity: Medium
- Why it matters: Compile success does not verify the parts that are actually risky here: HTTP/MCP protocol behavior, agent-facing tool ergonomics, sandbox error semantics, and media response handling.
- Repo evidence: `./node_modules/.bin/tsc --noEmit` passes on the current tree, and `npm test` still maps to build-only validation.
- Comparison evidence: Cloudflare's reference does not stop at type-checking; it codifies executor and output-shaping behavior in tests.
- Recommended fix direction: Make `npm test` cover at least one initialize -> tools/list -> tools/call flow, one API error path, and one non-JSON response path.

## Validation Scenarios
- Codemode parity scenario: Compare Atris `search` / `execute` contracts to Cloudflare's code-based `search` and typed `execute` descriptions in `cloudflare-serverside-mcp-ref/src/server.ts` and `cloudflare-serverside-mcp-ref/src/executor.ts`.
- Transport compliance scenario: Compare Atris session handling, protocol-version behavior, and POST body shape to the [MCP 2025-11-25 Streamable HTTP spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
- Audius capability scenario: Verify that endpoints like `/tracks/{track_id}/download` and `/tracks/{track_id}/stream` exist in `specs/openapi-spec.yaml`, then verify that `src/api/AudiusClient.ts` still assumes JSON in both directions.
- Jules behavior scenario: Use the [Jules environment docs](https://jules.google/docs/environment) to confirm that Jules reads repo instructions, then compare that to the stale README.
- Quality bar scenario: Record that `./node_modules/.bin/tsc --noEmit` passes, but the main project has no substantive runtime tests while the Cloudflare reference does.

## Assumptions
- Audit target: the checked-out `main` implementation. I found no separate Jules-specific branch or git history entry identifying a distinct Jules rewrite.
- Scope: "everything wrong" includes protocol compliance, security posture, Code Mode fidelity, docs drift, packaging drift, and missing tests.
- Deliverable: this is a research report only. No code changes are proposed in this file.
- Gold standard comparison: Cloudflare's local reference project plus official Cloudflare docs are the benchmark for server-side Code Mode behavior.

## Prioritized Remediation Roadmap
- Phase 1: Fix correctness and security blockers first: Origin validation, explicit localhost binding, secure session IDs, proper MCP status/version handling, and real error propagation from `audius.request()`.
- Phase 1: Repair the execute contract next: honest tool annotations, explicit-return guidance, and response handling that preserves failures as failures.
- Phase 1: Rewrite the README and release metadata immediately so Jules and human users stop learning from stale instructions.
- Phase 2: Rebuild `search` as actual Code Mode search over executable code and a processed `spec` object.
- Phase 2: Replace the hidden `__apiDecls__` approach with visible, meaningful types that the model actually sees in tool metadata.
- Phase 2: Extend the API client and executor contract for non-JSON, partial-content, and larger-response workflows.
- Phase 2: Add result truncation and token-budget guardrails so the two-tool design stays token-efficient in practice.
- Phase 3: Add a real test suite for transport, sandbox, search, and API response behavior.
- Phase 3: Clean up publish metadata, version drift, and lower-priority tool-schema mismatches like the missing `PATCH` search filter.
