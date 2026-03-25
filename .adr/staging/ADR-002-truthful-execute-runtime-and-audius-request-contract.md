# ADR-002: Truthful Execute Runtime and `audius.request()` Contract

## Status

Proposed

## Context

The Jules Code Mode audit identifies the `execute` tool and sandbox runtime as a second critical architectural boundary. Today, host-side API failures can be converted into success-shaped payloads, the runtime assumes JSON-centric request and response handling, tool metadata overstates behavior and safety, and output volume is not constrained tightly enough for predictable agent use.

These findings belong together because they all shape one promise to the agent: what `execute` means, what `audius.request()` returns or throws, and how much of the result is safe and useful to hand back to the model.

This ADR is grounded primarily in findings 5-8 from [docs/jules-codemode-audit.md](/workspaces/audius-mcp-atris/docs/jules-codemode-audit.md).

## Decision

The server will define a truthful and explicit execution contract:

- API failures raised by host-side request logic must propagate as thrown failures, not normal return values with `{ error }` shapes.
- `audius.request()` must support non-JSON and partial-content response handling through explicit response modes or equivalent structured options.
- The `execute` tool description and annotations must match runtime behavior, including the requirement for explicit `return`.
- Execute output must be truncated or budgeted predictably before being returned to the model.
- Runtime tests must cover error propagation, non-JSON behavior, and truncation semantics.

## Consequences

Positive:

- Agents can trust the difference between failure and data.
- The server becomes capable of representing a larger portion of the Audius API surface faithfully.
- Tool instructions stop training models on incorrect usage patterns.

Tradeoffs:

- Existing code that relies on success-shaped error objects will need to change.
- Supporting richer response types will increase implementation complexity in the client and sandbox bridge.

Follow-ups:

- Decide the stable return shape for raw and structured responses.
- Define a reusable truncation policy that can be shared across tool results.

## Hypotheses

### Hypothesis 1: API failures will become visible to agents as actual tool failures
**Prediction**: When the upstream Audius request fails, sandboxed user code will observe a thrown error and the tool response will be marked as an error rather than a normal success payload.
**Validation**: Add tests that force host-side request failures and assert both sandbox behavior and `tools/call` error output.
**Outcome**: PENDING

### Hypothesis 2: The runtime can support non-JSON and partial-content endpoints without losing correctness
**Prediction**: Endpoints that return non-JSON or partial-content responses will be retrievable through `audius.request()` using explicit response-handling options, and the runtime will no longer assume unconditional `response.json()`.
**Validation**: Add request-path tests against representative raw or partial-content endpoint behavior and assert the returned shape matches the selected response mode.
**Outcome**: PENDING

### Hypothesis 3: Honest tool guidance and output limits will improve predictability
**Prediction**: The visible `execute` tool contract will require explicit `return`, reflect write-capable behavior honestly, and cap oversized outputs into a stable bounded format.
**Validation**: Assert tool metadata in `tools/list`, verify example code paths require `return`, and add tests for truncation behavior on large return values or logs.
**Outcome**: PENDING

## Spec

Pending. Intended companion spec path: `specs/adr-002-execute-runtime-contract.md`

## Links

- Audit basis: [docs/jules-codemode-audit.md](/workspaces/audius-mcp-atris/docs/jules-codemode-audit.md)
- Sandbox runtime: [src/sandbox/Sandbox.ts](/workspaces/audius-mcp-atris/src/sandbox/Sandbox.ts)
- Execute tool: [src/tools/ExecuteTool.ts](/workspaces/audius-mcp-atris/src/tools/ExecuteTool.ts)
- API client: [src/api/AudiusClient.ts](/workspaces/audius-mcp-atris/src/api/AudiusClient.ts)
