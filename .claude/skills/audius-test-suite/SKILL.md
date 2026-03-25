---
name: audius-test-suite
description: "Test all tools and endpoints of the Audius MCP server in parallel using subagents. Use this skill when the user asks to test the server, run a smoke test, verify the tools work, check if the API is responding, or validate the MCP server end-to-end. Also trigger when the user says 'run tests', 'test everything', 'smoke test', 'health check', or 'verify the server'. This runs read-only tests only — no writes, no mutations, no side effects."
---

# Audius MCP Server Test Suite

Run a comprehensive read-only test suite against the Audius MCP server by spawning parallel subagents. Each subagent tests one tool via real MCP tool calls (`mcp__audius-mcp__*`).

## Prerequisites

The MCP server must be running and connected. Check that tools `mcp__audius-mcp__search`, `mcp__audius-mcp__execute`, `mcp__audius-mcp__subgraph`, and `mcp__audius-mcp__play` are available. If not:

1. Build and start the server: `pnpm dev &`
2. Add to `.mcp.json`: `{ "audius-mcp": { "type": "http", "url": "http://localhost:3000/mcp" } }`
3. Reconnect MCP via `/mcp`

## Test Execution

Spawn **4 subagents in parallel** (all in one message). Each subagent runs its test cases independently using the MCP tools directly — no curl, no JSON-RPC assembly. Each test should call the tool, check the result, and report PASS/FAIL.

### Subagent 1: Search Tool Tests

```
Run these tests using the mcp__audius-mcp__search tool. Report each as PASS or FAIL with a brief result summary.

1. **No filters** — Call search with no arguments.
   PASS if result mentions available tags and endpoint count.

2. **Tag: tracks** — Call search with tag="tracks".
   PASS if results contain endpoints with "/tracks" in the path.

3. **Tag: users** — Call search with tag="users".
   PASS if results contain endpoints with "/users" in the path.

4. **Query: trending** — Call search with query="trending".
   PASS if at least one endpoint relates to trending.

5. **Method: GET** — Call search with method="GET".
   PASS if all returned endpoints have method "GET".

6. **Path: playlists** — Call search with path="/playlists".
   PASS if results contain "/playlists" in paths.

7. **Combined filters** — Call search with tag="tracks" AND method="GET".
   PASS if all results are GET endpoints under tracks.

Save a summary to /tmp/audius-test-results/search-results.md
```

### Subagent 2: Execute Tool Tests

```
Run these tests using the mcp__audius-mcp__execute tool. Report each as PASS or FAIL with a brief result summary.

1. **Trending tracks** — Execute: return await audius.request('GET', '/tracks/trending', { query: { limit: 3 } })
   PASS if response contains track data with title and user fields.

2. **Search user** — Execute: return await audius.request('GET', '/users/search', { query: { query: 'deadmau5' } })
   PASS if response contains user data.

3. **Chain calls** — Execute:
   const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 1 } });
   const trackId = trending.data[0].id;
   return await audius.request('GET', '/tracks/' + trackId)
   PASS if response contains a single track's details.

4. **Console capture** — Execute: console.log('hello from sandbox'); return 42
   PASS if output contains "hello from sandbox" AND return value is 42.

5. **Error handling** — Execute: return await audius.request('GET', '/nonexistent/endpoint/xyz')
   PASS if response indicates an error.

6. **Multi-step** — Execute:
   const users = await audius.request('GET', '/users/search', { query: { query: 'RAC' } });
   if (!users.data || users.data.length === 0) return 'no users found';
   const userId = users.data[0].id;
   const tracks = await audius.request('GET', '/users/' + userId + '/tracks');
   return { user: users.data[0].name, trackCount: tracks.data ? tracks.data.length : 0 }
   PASS if response contains a user name and track count.

7. **Custom timeout** — Execute with code "return 'fast'" and timeout 5000.
   PASS if response returns "fast" without timing out.

Save a summary to /tmp/audius-test-results/execute-results.md
```

### Subagent 3: Subgraph Tool Tests

```
Run these tests using the mcp__audius-mcp__subgraph tool. Report each as PASS or FAIL with a brief result summary.

1. **Network stats** — Query: { audiusNetworks(first: 1) { totalTokensStaked totalTokensDelegated totalSupply } }
   PASS if response contains numeric values for staking/supply.

2. **Service types** — Query: { serviceTypes(first: 5) { id isValid minStake maxStake } }
   PASS if response contains service type entries.

3. **Recent proposals** — Query: { proposals(first: 3, orderBy: submissionBlockNumber, orderDirection: desc) { name outcome numVotes } }
   PASS if response contains proposal data.

4. **Service nodes** — Query: { serviceNodes(first: 5, where: { isRegistered: true }) { endpoint type { id } } }
   PASS if response contains node endpoints.

5. **Invalid query** — Query: { nonExistentEntity { id } }
   PASS if response contains a GraphQL error message.

Save a summary to /tmp/audius-test-results/subgraph-results.md
```

### Subagent 4: Play Tool + Cross-Tool Tests

```
Run these tests using the mcp__audius-mcp__play and mcp__audius-mcp__search tools. Report each as PASS or FAIL.

Note: The play tool opens a browser/app, which won't work in headless/remote environments. Test it anyway — a "failed to open" error with valid track data still counts as PASS for the API resolution part.

1. **Play by query** — Call play with query="Tiny Little Adiantum".
   PASS if response contains track info (title, artist, url) regardless of whether the browser opened.

2. **Play by invalid ID** — Call play with trackId="INVALID_NONEXISTENT_ID_12345".
   PASS if response indicates an error (track not found or API error).

3. **Play with no args** — Call play with no arguments.
   PASS if response indicates an error about missing trackId or query.

4. **Search → Play integration** — First call search with query="trending", then call play with a query based on what you found.
   PASS if play resolves the track successfully.

5. **Search endpoint count** — Call search with no args, verify the reported endpoint count is > 0.
   PASS if count is a positive number.

Save a summary to /tmp/audius-test-results/play-cross-results.md
```

## After All Subagents Complete

Collect all result files and produce a summary table:

```
## Test Results

| Group        | Tests | Passed | Failed | Flaky |
|--------------|-------|--------|--------|-------|
| Search       | 7     | ?      | ?      | ?     |
| Execute      | 7     | ?      | ?      | ?     |
| Subgraph     | 5     | ?      | ?      | ?     |
| Play + Cross | 5     | ?      | ?      | ?     |
| **Total**    | **24**| **?**  | **?**  | **?** |
```

For failures, include the test name and what went wrong. For flaky results (rate limits, timeouts, network issues), note them separately.

## Critical: Subagent Constraints

Every subagent prompt MUST include these instructions at the top:

```
IMPORTANT CONSTRAINTS:
- You are a TEST RUNNER. Your ONLY job is to call MCP tools and report results.
- Do NOT read, edit, or modify any source code files.
- Do NOT run pnpm build, pnpm dev, or any build/restart commands.
- Do NOT attempt to fix, debug, or diagnose issues in the codebase.
- If a test fails, report it as FAIL with the error message. That's it.
- The only tools you should use are mcp__audius-mcp__* tools and Write (for the results file).
```

This prevents subagents from going off-script and modifying the codebase when they encounter test failures.

## Important Notes

- All tests are **read-only**. No uploads, no favorites, no mutations.
- Tests use **real MCP tool calls** through the connected `audius-mcp` server — not curl or raw HTTP.
- The play tool's browser/app opening will fail in headless environments (Codespaces, CI) — that's expected. Test the API resolution part, not the OS integration.
- Tests hit the live Audius API and The Graph — they require internet access.
- If a test fails due to rate limiting or network issues, mark it FLAKY rather than FAIL.
