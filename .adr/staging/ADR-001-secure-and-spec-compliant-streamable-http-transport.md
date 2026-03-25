# ADR-001: Secure and Spec-Compliant Streamable HTTP Transport

## Status

Proposed

## Context

The Jules Code Mode audit identifies the MCP transport layer as the highest-severity architectural boundary in the current system. The current server accepts requests before validating `Origin`, does not bind explicitly to localhost by default, generates predictable session identifiers, and diverges from the MCP Streamable HTTP transport rules for session handling, protocol-version validation, and POST body shape.

These issues belong together because they define one contract: how external clients are allowed to reach the server, how requests are authenticated and validated at the transport boundary, and what wire semantics the server promises to uphold.

This ADR is grounded primarily in findings 9-13 from [docs/jules-codemode-audit.md](/workspaces/audius-mcp-atris/docs/jules-codemode-audit.md).

## Decision

The server will adopt a strict transport contract for Streamable HTTP:

- Validate `Origin` before processing requests and fail closed by default.
- Bind to `127.0.0.1` by default, with any broader host binding treated as an explicit configuration choice.
- Replace predictable session IDs with cryptographically secure identifiers.
- Enforce MCP Streamable HTTP semantics for:
  - required versus unknown session headers
  - supported `MCP-Protocol-Version` values
  - single-message POST bodies
- Add transport integration tests that exercise initialization, session lifecycle, invalid headers, and batch rejection.

## Consequences

Positive:

- The server's network exposure model becomes explicit instead of accidental.
- Client behavior becomes more predictable because invalid transport requests fail in well-defined ways.
- Protocol drift is reduced, which lowers interoperability risk with strict MCP clients.

Tradeoffs:

- Some existing ad hoc client behavior may break once validation becomes strict.
- Additional test coverage and configuration plumbing will be required.

Follow-ups:

- Document the default host and origin policy in the README and deployment guidance.
- Decide whether non-localhost binding should require an explicit unsafe flag.

## Hypotheses

### Hypothesis 1: Invalid transport requests will fail deterministically
**Prediction**: Requests with missing required session headers, unsupported protocol versions, or JSON-RPC batch bodies will return explicit protocol errors rather than being accepted or ambiguously handled.
**Validation**: Add integration tests around `POST /mcp` and `DELETE /mcp` that assert the expected HTTP status and response shape for each invalid request class.
**Outcome**: PENDING

### Hypothesis 2: Default-localhost binding and strict origin validation will reduce accidental exposure
**Prediction**: A default local development run will bind only to `127.0.0.1`, and requests from disallowed origins will be rejected before normal request handling.
**Validation**: Start the server with default config, verify the bound address, and run request tests with allowed and disallowed `Origin` headers.
**Outcome**: PENDING

### Hypothesis 3: Secure session identifiers will eliminate predictable session tokens
**Prediction**: Session IDs generated during repeated initialization calls will be non-sequential and satisfy a secure UUID-style format or equivalent cryptographic token policy.
**Validation**: Initialize multiple sessions and assert the format and non-predictability characteristics of returned session IDs.
**Outcome**: PENDING

## Spec

Pending. Intended companion spec path: `specs/adr-001-streamable-http-transport.md`

## Links

- Audit basis: [docs/jules-codemode-audit.md](/workspaces/audius-mcp-atris/docs/jules-codemode-audit.md)
- Transport entrypoint: [src/mcp/McpServerTransport.ts](/workspaces/audius-mcp-atris/src/mcp/McpServerTransport.ts)
- Serialization layer: [src/mcp/McpSerialization.ts](/workspaces/audius-mcp-atris/src/mcp/McpSerialization.ts)
