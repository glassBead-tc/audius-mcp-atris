# Changelog

## Unreleased — Capability Roadmap Phase 1 (fix what's broken)

Spec: `specs/capability-roadmap/README.md`. Six fixes from the 2026-07-09 live audit.

- **P1-1** — big-integer-safe JSON parsing (`src/api/Json.ts`): pure integer literals
  longer than 15 digits are preserved as strings end-to-end into the sandbox, so
  wei-scale amounts can never be corrupted by `JSON.parse`. (The garbage `/tips`
  amounts that flagged this are upstream Audius data — now passed through faithfully.)
- **P1-2** — binary-response guard: non-JSON responses (e.g. `/tracks/{id}/stream`,
  which redirects to a signed CDN MP3) resolve to `{ url }` instead of downloading
  the body and choking on JSON parsing.
- **P1-3 / AX-14** — `play` is an honest resolver: resolution success is tool success;
  it returns the track URLs (plus `streamUrl` when present) and reports `opened:
  true/false` instead of erroring on headless hosts or claiming "playing".
- **P1-4 / AX-13** — `subgraph` is gated on `GRAPH_API_KEY`: hidden from `tools/list`
  when unconfigured and fails fast with the reason if called anyway; the dead keyless
  Graph-gateway fallback is removed.
- **P1-5** — the server reports its real package.json version and derives the endpoint
  count in INSTRUCTIONS from the live spec index (was hardcoded "219"/2.0.0).
- **P1-6 / AX-15, AX-21 (partial)** — `execute` advertises `destructiveHint: true` and
  its description + INSTRUCTIONS document the `{ error }` result shape, mutation
  semantics (POST/PUT/DELETE are real writes with a user bearer), string-preserved
  big integers, and `{ url }` binary responses.
- Tests: `test/json-bigint.test.mjs`, `test/tool-honesty.test.mjs`.
- **P1 follow-up** — the server now loads `./.env` at startup via Node's built-in
  `process.loadEnvFile()` (local dev only; already-set environment variables win, so
  Cloud Run config is never overridden). Previously `.env` was silently ignored —
  `GRAPH_API_KEY` set there never reached the subgraph tool.

## Unreleased — Agent Experience Alignment

A multi-release program (specs in `specs/agent-experience-alignment/`) that brings the
server into alignment with the 2026-05-21 agent-experience study. Restores the missing
"second half" of Code Mode: compressing **data volume**, not just tool count.

### Release 1 — Context Safety
- **AX-01a** — `ResponseGuard` output cap: every tool result passes through a single
  chokepoint; results over `RESPONSE_TOKEN_BUDGET` (default 20,000 tokens) are withheld
  and replaced with a self-contained truncation envelope. Context overflow is now
  structurally impossible.
- **AX-05** — `search` returns compact ranked rows (method, path, summary, tags) with a
  `limit`, instead of embedding a fully-expanded response schema per endpoint. The
  `search({tag:"tracks"})` payload drops from ~779 KB to ~8.5 KB.
- **AX-17** — `INSTRUCTIONS` rewritten: accurate tool list, no phantom workflow names,
  names the `audius://workflows` resource, and teaches the projection idiom and the
  `{ data }` response envelope.
- **AX-08** — sandbox `console` polyfill: `console.error/warn/info/debug` are defined and
  captured; an unwrapped `console.error` no longer throws and kills the execution.
- **AX-24** — behavioral test suite (`pnpm test` now builds, then runs `node --test`).

## 2.4.0 (2025-07-01)
- Added stream-track and open-track-in-desktop tools for direct audio streaming.
- Introduced AUDIO_STREAMING configuration option.
- Bumped version to 2.4.0.

## 2.3.0 (2025-06-18)

### Protocol Updates
- Adopted Model Context Protocol specification version 2025-06-18.
- Added `LATEST_PROTOCOL_VERSION` constant to `src/config.ts`.
- Updated documentation to remove JSON-RPC references.

## 2.2.0 (2025-05-29)

### New Features - Medium Priority Missing Endpoints
- Added track media operations in Tracks toolset
  - `get-track-download` - Get download information and URLs for tracks
  - `get-track-inspect` - Get technical inspection details (sample rate, bit rate, file size, etc.)
  - `get-track-stems` - Get available stems/components for tracks
- Added user relationship discovery in Users toolset
  - `get-track-purchasers` - Get users who purchased a specific track
  - `get-track-remixers` - Get users who remixed a specific track
  - `get-related-users` - Get users related to a given user based on listening patterns
  - `get-user-tags` - Get tags associated with a user
- Added enhanced discovery features in Search toolset
  - `get-recommendations` - Get personalized recommendations (tracks, users, playlists) for a user
  - `get-user-history` - Get user activity history (plays, likes, reposts, follows)
  - `get-trending-by-genre` - Get trending content filtered by genre and time range

### Improvements
- Enhanced API coverage from ~90% to ~95% of Audius Protocol endpoints
- Better formatted responses with emojis and structured information
- Comprehensive error handling for missing tracks, users, and data
- Direct API calls for endpoints not available in the official SDK
- Parallel processing for bulk operations with individual error tracking

### Technical
- Created new discovery.ts tool file for recommendation and history features
- All new endpoints use proper TypeScript typing and error handling
- Maintained consistent response formatting across all new tools
- Updated toolset registrations for all new functionality

## 2.1.0 (2025-05-29)

### New Features
- Added Albums toolset with complete album functionality
  - `get-album-details` - Get album information
  - `get-album-tracks` - Get tracks in an album
  - `get-user-albums` - Get albums for a specific user
- Added Core toolset with fundamental Audius features
  - `resolve` - Resolve Audius URLs to entities (tracks, users, playlists, albums)
  - `get-sdk-version` - Get SDK and server version information
- Added OAuth toolset for authentication flows
  - `initiate-oauth` - Start OAuth authorization flow with Audius
  - `verify-token` - Verify JWT tokens from OAuth
  - `exchange-code` - Exchange authorization codes for tokens (with implementation guidance)
- Added track streaming support
  - `get-track-stream-url` - Get streaming URL for tracks
- Created missing types definition file (`src/types/index.ts`)

### Improvements
- Albums are properly handled as playlists with `is_album=true`
- Better resource responses with mixed content types
- Consistent error handling across new tools
- OAuth implementation includes CSRF protection with state tokens
- Multiple API host fallback for token verification

### Technical
- Fixed TypeScript compilation issues
- Added proper RequestHandlerExtra type definition
- Improved SDK client usage pattern
- OAuth state management with automatic cleanup

## 2.0.1 (2025-04-29)

### New Features
- Added toolsets pattern for better organization and control
- Implemented parameter validation helpers for consistent error handling
- Added ability to enable/disable specific toolsets
- Added support for read-only mode for sensitive environments
- Created documentation for toolsets pattern (TOOLSETS.md)

### Improvements
- Fixed TypeScript type errors in toolset implementation
- Updated server version displays to match package version
- Better structured codebase with logical tool groupings
- Improved error handling with standardized parameter validation

## 2.0.0 (2025-04-28)

### Breaking Changes
- Removed HTTP server transport completely
- Now using STDIO transport exclusively for all capabilities

### Changes
- Removed HTTP-related dependencies
- Simplified deployment model
- Added proper bin entry for CLI usage
- Improved test script with sequential lint, build, and test
- Updated documentation to clarify STDIO-only support

### Rationale
This major version update focuses on streamlining the MCP implementation by:
- Simplifying the codebase to use only STDIO transport
- Enabling better compatibility with services like Smithery (which handle HTTP transport)
- Reducing dependencies and complexity
- Making maintenance easier with a focused approach

## 1.0.0 (Initial Release)

### Features
- Support for both STDIO and HTTP transport methods
- Complete Audius Music platform integration
- Extensive tool set for track, user, and playlist management
- Comprehensive search capabilities
- Social features (follows, favorites, comments)
- Monetization tools for premium content
- Analytics and metrics collection
- Resource templates for structured data access
- Natural language prompt capabilities