# Test Cases Reference

## curl Patterns

Every subagent can use these curl patterns to interact with the MCP server.

### Initialize (get session ID)

```bash
SESSION_RESPONSE=$(curl -s -D - http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test-suite","version":"1.0"}},"id":"init-1"}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -i 'mcp-session-id' | tr -d '\r' | awk '{print $2}')
INIT_BODY=$(echo "$SESSION_RESPONSE" | tail -1)
```

### Make a tool call (with session)

```bash
curl -s http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"TOOL_NAME","arguments":{ARGS}},"id":"test-1"}'
```

### Delete session

```bash
curl -s -X DELETE http://localhost:3000/mcp \
  -H "MCP-Session-Id: $SESSION_ID"
```

## Interpreting Results

### Success response
```json
{
  "jsonrpc": "2.0",
  "id": "test-1",
  "result": {
    "content": [{"type": "text", "text": "..."}]
  }
}
```

### Tool error (tool-level, not protocol-level)
```json
{
  "jsonrpc": "2.0",
  "id": "test-1",
  "result": {
    "content": [{"type": "text", "text": "Error: ..."}],
    "isError": true
  }
}
```

### Protocol error
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {"code": -32600, "message": "..."}
}
```

## Test Case Details

### Search Tool (7 tests)

| # | Name | Arguments | Pass Criteria |
|---|------|-----------|---------------|
| S1 | List tools | `tools/list` | Response has 4 tools: search, execute, play, subgraph |
| S2 | No filters | `search({})` | Contains "availableTags" |
| S3 | Tag: tracks | `search({tag:"tracks"})` | Endpoints with "/tracks" paths |
| S4 | Tag: users | `search({tag:"users"})` | Endpoints with "/users" paths |
| S5 | Query: trending | `search({query:"trending"})` | At least 1 trending endpoint |
| S6 | Method: GET | `search({method:"GET"})` | All results have method "GET" |
| S7 | Path: playlists | `search({path:"/playlists"})` | Results contain "/playlists" |

### Execute Tool (7 tests)

| # | Name | Code | Pass Criteria |
|---|------|------|---------------|
| E1 | Trending tracks | `audius.request('GET', '/tracks/trending', {query:{limit:3}})` | Returns track objects |
| E2 | Search user | `audius.request('GET', '/users/search', {query:{query:'deadmau5'}})` | Returns user objects |
| E3 | Chain calls | Get trending → fetch first track by ID | Returns single track |
| E4 | Console capture | `console.log('hello'); return 42` | Output has "hello", value is 42 |
| E5 | Error handling | `audius.request('GET', '/nonexistent')` | Contains error |
| E6 | Multi-step | Search user → get their tracks | Returns user name + track count |
| E7 | Timeout | `return 'fast'` with timeout:5000 | Returns "fast" |

### Subgraph Tool (5 tests)

| # | Name | Query | Pass Criteria |
|---|------|-------|---------------|
| G1 | Network stats | `audiusNetworks(first:1) { totalTokensStaked... }` | Has numeric values |
| G2 | Service types | `serviceTypes(first:5) { id isValid... }` | Has entries |
| G3 | Proposals | `proposals(first:3, orderBy:...) { name outcome }` | Has proposal data |
| G4 | Service nodes | `serviceNodes(first:5, where:{isRegistered:true})` | Has endpoints |
| G5 | Invalid query | `nonExistentEntity { id }` | Contains GraphQL error |

### Protocol Tests (8 tests)

| # | Name | Request | Pass Criteria |
|---|------|---------|---------------|
| P1 | Initialize | Valid handshake | Has protocolVersion, serverInfo |
| P2 | No session | tools/list without MCP-Session-Id | 404 response |
| P3 | Wrong path | POST /wrong-path | 404 response |
| P4 | Wrong method | GET /mcp | 405 response |
| P5 | Wrong content type | POST with text/plain | 415 response |
| P6 | Empty body | POST with empty body | 400 response |
| P7 | Ping | ping with valid session | Success (no error) |
| P8 | Delete session | DELETE /mcp with session | 204 response |

## Flaky Test Handling

Some tests depend on external APIs (Audius REST, The Graph). If a test fails with:
- HTTP 429 (rate limit) → mark as FLAKY
- HTTP 5xx (server error) → mark as FLAKY
- Connection refused → mark as SERVER_DOWN (server not running)
- Timeout → mark as TIMEOUT

Only mark as FAIL if the server returns an unexpected response structure or wrong data.
