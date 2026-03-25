# ADR-003: Agent-Facing Code Mode Contract from Processed Spec Artifacts

## Status

Proposed

## Context

The Jules Code Mode audit shows that the agent-facing contract has drifted across search, type exposure, spec processing, docs, release metadata, and validation. The current `search` tool is a fixed filter rather than code-based discovery, generated types are effectively hidden or too weak to guide an agent, spec loading and processing lose fidelity, and the README and version metadata describe a different product than the one the server actually ships.

These findings belong together because they are all symptoms of one missing architectural decision: what authoritative artifact the model should see and rely on when using this Code Mode server.

This ADR is grounded primarily in findings 1-4 and 14-17 from [docs/jules-codemode-audit.md](/workspaces/audius-mcp-atris/docs/jules-codemode-audit.md).

## Decision

The server will define a single agent-facing Code Mode contract derived from processed spec artifacts:

- Replace fixed-filter `search` with code-based discovery over a processed spec object.
- Either expose meaningful visible types to the model in tool metadata or remove the fake type surface until real types exist.
- Preprocess and persist a high-fidelity spec artifact suitable for discovery and execution planning.
- Align README, package metadata, and runtime server metadata with the actual two-tool HTTP Code Mode product.
- Add acceptance tests that validate the intended `initialize -> tools/list -> tools/call` workflow end to end.

## Consequences

Positive:

- The model sees a more truthful and useful contract for discovery and execution.
- Documentation drift becomes easier to detect because the public contract is explicit.
- Validation moves closer to user-observable behavior instead of compile-only checks.

Tradeoffs:

- Search execution and spec preprocessing are larger architectural changes than point fixes.
- Stronger types and higher-fidelity spec artifacts may increase startup or build complexity.

Follow-ups:

- Decide whether processed spec artifacts are built ahead of time or generated at startup and cached.
- Define how acceptance tests will guard both metadata truthfulness and tool behavior over time.

## Hypotheses

### Hypothesis 1: Code-based search over processed spec artifacts will improve endpoint discovery fidelity
**Prediction**: Agents will be able to inspect request and response structures through code-based search, and discovery will no longer be limited to the current filter schema.
**Validation**: Add acceptance tests and fixture-based examples that query the processed spec object for fields unavailable through the current fixed-filter API.
**Outcome**: PENDING

### Hypothesis 2: A visible and truthful type surface will improve execute-tool usability
**Prediction**: The `tools/list` response for `execute` will expose meaningful request and response guidance that matches runtime behavior closely enough to replace the hidden weak declaration path.
**Validation**: Inspect tool metadata in automated tests and verify it contains the chosen visible contract and no stale or misleading guidance.
**Outcome**: PENDING

### Hypothesis 3: Contract-focused acceptance tests will catch drift earlier than compile-only validation
**Prediction**: An end-to-end test flow covering initialization, tool listing, search, and execute will fail when README, runtime metadata, or tool behavior drift from the intended Code Mode contract.
**Validation**: Add at least one full MCP interaction test and metadata assertions that compare runtime output to the documented contract.
**Outcome**: PENDING

## Spec

Pending. Intended companion spec path: `specs/adr-003-agent-facing-code-mode-contract.md`

## Links

- Audit basis: [docs/jules-codemode-audit.md](/workspaces/audius-mcp-atris/docs/jules-codemode-audit.md)
- Search tool: [src/tools/SearchTool.ts](/workspaces/audius-mcp-atris/src/tools/SearchTool.ts)
- Spec loading: [src/api/SpecLoader.ts](/workspaces/audius-mcp-atris/src/api/SpecLoader.ts)
- Spec indexing: [src/api/SpecIndex.ts](/workspaces/audius-mcp-atris/src/api/SpecIndex.ts)
- Type generation: [src/sandbox/TypeGenerator.ts](/workspaces/audius-mcp-atris/src/sandbox/TypeGenerator.ts)
- Documentation: [README.md](/workspaces/audius-mcp-atris/README.md)
- Package metadata: [package.json](/workspaces/audius-mcp-atris/package.json)
