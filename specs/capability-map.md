# Audius Platform Capability Map for Atris MCP Server

> Generated 2026-03-31 from batch exploration of the Audius protocol monorepo (`apps/packages/`).
> This document is the shared spec for agent teams implementing new capabilities.

---

## Current State

Atris is a Code Mode MCP server (Effect-TS) that exposes the Audius REST API via `search` + `execute` tools. LLM-generated JavaScript runs in a QuickJS WASM sandbox with an authenticated `audius.request(method, path, options)` client.

### Auth implemented
- `x-api-key` header on all requests
- `Encoded-Data-Message` + `Encoded-Data-Signature` (EIP-191 cached 24h) on non-GET requests
- `Authorization: Basic base64(user:<apiSecret>)` on non-GET requests
- Signing via `viem/accounts` `privateKeyToAccount().signMessage()`

### Key files
- `src/AppConfig.ts` — env config (`AUDIUS_API_KEY`, `AUDIUS_API_SECRET`)
- `src/api/AudiusClient.ts` — HTTP client with auth injection
- `src/sandbox/Sandbox.ts` — QuickJS sandbox exposing `audius.request()`
- `src/tools/ExecuteTool.ts` — MCP execute tool
- `src/tools/SearchTool.ts` — MCP search tool over OpenAPI spec index

### User context
- User ID: `E2AjR` (numeric: `143127`)
- API key (address): `0x028b0571b497d65faf19aef806a797f17a18e19b`
- API secret: configured in `.env` (Ethereum private key, 64 hex chars)

---

## Tier 1: Already Working (REST API writes)

These operations work NOW through the `execute` tool because REST auth is in place.

### Social Actions
| Operation | Method | Path | Params |
|-----------|--------|------|--------|
| Favorite track | POST | `/tracks/{track_id}/favorites` | `user_id` (query) |
| Unfavorite track | DELETE | `/tracks/{track_id}/favorites` | `user_id` (query) |
| Repost track | POST | `/tracks/{track_id}/reposts` | `user_id` (query) |
| Unrepost track | DELETE | `/tracks/{track_id}/reposts` | `user_id` (query) |
| Share track | POST | `/tracks/{track_id}/shares` | `user_id` (query) |
| Favorite playlist | POST | `/playlists/{playlist_id}/favorites` | `user_id` (query) |
| Unfavorite playlist | DELETE | `/playlists/{playlist_id}/favorites` | `user_id` (query) |
| Repost playlist | POST | `/playlists/{playlist_id}/reposts` | `user_id` (query) |
| Unrepost playlist | DELETE | `/playlists/{playlist_id}/reposts` | `user_id` (query) |
| Follow user | POST | `/users/{id}/followers` | `user_id` (query) |
| Unfollow user | DELETE | `/users/{id}/followers` | `user_id` (query) |
| Create comment | POST | `/comments` | `user_id` (query), body: `{body, entity_id, entity_type}` |
| Delete comment | DELETE | `/comments/{comment_id}` | `user_id` (query) |
| React to comment | POST | `/comments/{comment_id}/react` | `user_id` (query) |

### Content Management (REST path)
| Operation | Method | Path | Notes |
|-----------|--------|------|-------|
| Create playlist | POST | `/playlists` | `user_id` (query), body: metadata |
| Update playlist | PUT | `/playlists/{playlist_id}` | `user_id` (query), body: metadata |
| Delete playlist | DELETE | `/playlists/{playlist_id}` | `user_id` (query) |
| Create track | POST | `/tracks` | `user_id` (query), body: metadata |
| Update track | PUT | `/tracks/{track_id}` | `user_id` (query), body: metadata |
| Delete track | DELETE | `/tracks/{track_id}` | `user_id` (query) |

### Read Operations (no auth needed)
All 169+ public REST API endpoints documented in `specs/openapi-spec.yaml`.

---

## Tier 2: Comms System (Blast Messaging + Inbox)

### Overview
The comms system runs on a `/comms/` path prefix on the same discovery nodes. It uses a different auth scheme (`x-sig` header) and an RPC-style mutation endpoint.

### Auth: x-sig Header

**Different from REST auth.** Signs the raw request payload (not EIP-191 formatted).

```
x-sig = base64( secp256k1_sign(keccak256(payload_bytes)) || recovery_id )
```

- 65 bytes total: 64-byte compact signature + 1-byte recovery ID
- For GET requests: sign the URL path with query string (e.g., `/comms/chats?timestamp=123`)
- For POST requests: sign the full JSON body string
- **NOT cached** — fresh signature per request
- Uses `sign()` (raw ECDSA), not `signMessage()` (no EIP-191 prefix)

**Implementation reference**: `apps/packages/sdk/src/sdk/api/chats/ChatsApi.ts` lines ~200-250

### Mutation Endpoint

**`POST /comms/mutate`**

All writes go through this single RPC endpoint. The JSON body structure:

```json
{
  "method": "<rpc_method>",
  "params": { ... },
  "current_user_id": "<hash_id>",
  "timestamp": <unix_ms>
}
```

### Blast Messaging (Priority Target)

Send a broadcast message to an audience. **No encryption needed** — blasts are plaintext.

**RPC method**: `chat.blast`

```json
{
  "method": "chat.blast",
  "params": {
    "blast_id": "<ULID>",
    "audience": "follower_audience",
    "message": "Hello followers!"
  },
  "current_user_id": "E2AjR",
  "timestamp": 1711900000000
}
```

**Supported audiences**:
- `follower_audience` — all followers
- `tipper_audience` — users who tipped you
- `remixer_audience` — users who remixed your tracks
- `customer_audience` — users who purchased your content
- `coin_holder_audience` — holders of your artist coin

**Optional params for targeted blasts**:
- `audience_content_type`: `"track"` or `"album"`
- `audience_content_id`: specific track/album ID

### Read Endpoints (GET with x-sig)

| Endpoint | Purpose | Params |
|----------|---------|--------|
| `GET /comms/chats` | List all chats | `timestamp`, `limit`, `before`, `after` |
| `GET /comms/chats/{chatId}/messages` | Get messages in chat | `timestamp`, `limit`, `before`, `after`, `is_blast` |
| `GET /comms/blasts` | Get pending blast messages | `timestamp` |
| `GET /comms/chats/unread` | Unread message count | `timestamp` |
| `GET /comms/chats/permissions` | Chat permission settings | `timestamp`, `id` (user IDs) |
| `GET /comms/chats/blockers` | Users who blocked you | `timestamp` |
| `GET /comms/chats/blockees` | Users you blocked | `timestamp` |
| `GET /comms/unfurl` | URL link preview metadata | `content` (URLs) — no auth |

### Other Mutation Methods

| RPC Method | Purpose | Key Params |
|------------|---------|------------|
| `chat.create` | Create 1:1 chat | `chat_id`, `invites[{user_id, invite_code}]` |
| `chat.message` | Send encrypted message | `chat_id`, `message_id`, `message` (base64), `is_plaintext` |
| `chat.invite` | Invite user to chat | `chat_id`, `invites[{user_id, invite_code}]` |
| `chat.react` | React to message | `chat_id`, `message_id`, `reaction` |
| `chat.read` | Mark chat as read | `chat_id` |
| `chat.block` | Block user | `user_id` |
| `chat.unblock` | Unblock user | `user_id` |
| `chat.delete` | Clear chat history | `chat_id` |
| `chat.permit` | Set inbox permissions | `permit`, `permit_list[]`, `allow` |

### Implementation Plan for Tier 2

**Files to modify**:

1. **`src/api/AudiusClient.ts`** — Add comms support:
   - New method: `commsRequest(method, path, options)` or extend `request()` with a `comms: true` option
   - Base URL for comms: `https://api.audius.co/comms` (same host, different prefix)
   - Implement `x-sig` header signing:
     - For GET: sign `path?query_string` 
     - For POST: sign `JSON.stringify(body)`
   - Use `@noble/curves/secp256k1` + `@noble/hashes/sha3` (keccak256) — already installed
   - Return raw signature bytes (64) + recovery ID (1), base64 encode

2. **`src/AppConfig.ts`** — No changes needed (already has `apiSecret`)

3. **`src/sandbox/Sandbox.ts`** — Expose `audius.comms(method, path, options)` or `audius.request()` with comms flag

4. **`src/tools/ExecuteTool.ts`** — Update instructions to document comms capability

### Signing Implementation Detail

```typescript
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { keccak_256 } from "@noble/hashes/sha3.js"
import { hexToBytes } from "@noble/hashes/utils.js"

function signCommsPayload(payload: string, privateKeyHex: string): string {
  const payloadBytes = new TextEncoder().encode(payload)
  const hash = keccak_256(payloadBytes)
  const privKey = hexToBytes(privateKeyHex)
  const sig = secp256k1.sign(hash, privKey, { lowS: true })
  // sig is Signature object in @noble/curves — need r, s, recovery
  const compact = sig.toCompactRawBytes() // 64 bytes
  const result = new Uint8Array(65)
  result.set(compact)
  result[64] = sig.recovery
  return btoa(String.fromCharCode(...result))
}
```

> **Note**: The exact `@noble/curves` v2 API for getting recovery bit needs verification.
> The tested approach that works is via `viem`: `account.signMessage()` for EIP-191, but comms
> needs raw signing without EIP-191 prefix. May need `account.sign()` or direct noble usage.
> Fallback: use viem's lower-level `sign` from `viem/accounts` if available.

---

## Tier 3: Encrypted DMs

### Encryption Architecture
- **Key exchange**: ECDH on secp256k1 — derive shared secret between two users
- **Message encryption**: AES-GCM-256 via `micro-aes-gcm`
- **Chat secret**: Random 32-byte key, encrypted per-participant with ECDH shared secret
- **Invite code format**: `[UserPublicKey(65 bytes) | AES-GCM(chatSecret)]`

### Flow
1. Fetch recipient's public key: `GET /comms/pubkey/{userId}`
2. Derive ECDH shared secret: `secp256k1.getSharedSecret(myPrivKey, theirPubKey)`
3. Generate 32-byte chat secret
4. Encrypt chat secret with shared secret → invite code
5. Create chat: `chat.create` RPC with invite codes
6. Encrypt messages with chat secret → `chat.message` RPC

### Dependencies needed
- `micro-aes-gcm` (AES-GCM encryption)
- `@scure/base` (base64 encoding)
- `ulid` (message ID generation)

### Complexity: Medium
The crypto is straightforward but requires careful key management and caching of chat secrets.

---

## Tier 4: Heavy Features

### Track Uploads
- **Storage nodes**: Multipart upload via tus.io protocol to content nodes
- **Transcoding**: Server-side to 320kbps MP3 with progress tracking
- **Audio analysis**: BPM, musical key, duration extracted server-side
- **Preview generation**: Configurable start offset
- **Node selection**: Rendezvous hashing for deterministic node ordering
- **Dependencies**: `StorageService`, `StorageNodeSelector`, tus.io client
- **Complexity**: High — multipart uploads, progress callbacks, node failover

### Solana Transactions (Tips, Purchases, Coins)
- **Tips**: wAUDIO SPL token transfer via `ClaimableTokensClient`
  - Requires: Secp256k1 instruction (EVM sig on Solana), PDA user bank
- **Purchases**: USDC routing via `PaymentRouterClient`
  - Requires: Payment splits, memo instructions, access gate validation
- **Coins**: Bonding curve operations via Meteora DBC pool
  - Requires: `SolanaRelay` for transaction relay
- **Dependencies**: `@audius/spl`, Solana RPC endpoint, dual-chain signing
- **Complexity**: Very high — multi-instruction Solana transactions

### EntityManager (On-Chain Metadata)
- **Contract**: `0x1Cd8a543596D499B9b6E7a6eC15ECd2B7857Fd64` on ACDC (Chain 31524)
- **Signing**: EIP-712 typed data
- **Relay**: POST to `/relay` with encoded ABI
- **Confirmation**: Poll `/block_confirmation` (45s timeout)
- **Used for**: Track/playlist/user create/update/delete, grants, associated wallets
- **Not needed for**: Social actions (REST works), blasts (comms system)

---

## Hidden Endpoints (Not in OpenAPI Spec)

Accessible on discovery nodes but not documented in `specs/openapi-spec.yaml`.

### High-Value for Atris
| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/feed` | GET | Personalized social feed from follows | Required |
| `/search/tags` | GET | Advanced search: genre, mood, BPM, key, verified, purchaseable | Optional |
| `/users/history/{user_id}` | GET | Listening history | None |
| `/top_followee_saves/{type}` | GET | Most saved by your social circle | Required |
| `/top_followee_windowed/{type}/{window}` | GET | Trending from follows over time window | Required |
| `/users/genre/top` | GET | Top users by genre | None |
| `/user_signals` | GET | Lightweight user stats by handle | None |
| `/previously_unlisted/track` | GET | Recently published tracks | None |
| `/remixes/{track_id}/children` | GET | All remixes of a track | Optional |
| `/remixes/{track_id}/parents` | GET | Original track for a remix | Optional |
| `/stems/{track_id}` | GET | Stem tracks | None |
| `/users/intersection/follow/{followee}/{follower}` | GET | Mutual follow overlap | None |

---

## SDK Source Reference

All source files are local at `apps/packages/sdk/src/sdk/`:

| Component | Path |
|-----------|------|
| ChatsApi | `api/chats/ChatsApi.ts` (965 lines) |
| Chat types (server) | `api/chats/serverTypes.ts` |
| Chat types (client) | `api/chats/clientTypes.ts` |
| TracksApi | `api/tracks/TracksApi.ts` |
| UsersApi | `api/users/UsersApi.ts` |
| PlaylistsApi | `api/playlists/PlaylistsApi.ts` |
| AlbumsApi | `api/albums/AlbumsApi.ts` |
| GrantsApi | `api/grants/GrantsApi.ts` |
| NotificationsApi | `api/notifications/NotificationsApi.ts` |
| EventsApi | `api/events/EventsApi.ts` |
| UploadsApi | `api/uploads/UploadsApi.ts` |
| EntityManager | `services/EntityManager/EntityManagerClient.ts` |
| AudiusWalletClient | `services/AudiusWalletClient/createAppWalletClient.ts` |
| privateKeyToAudiusAccount | `services/AudiusWalletClient/privateKeyToAudiusAccount.ts` |
| Request signature middleware | `middleware/addRequestSignatureMiddleware.ts` |
| Encryption utils | `utils/crypto.ts` |
| EmailEncryptionService | `services/Encryption/EmailEncryptionService.ts` |
| SolanaRelay | `services/Solana/SolanaRelay.ts` |
| SolanaClient | `services/Solana/programs/SolanaClient.ts` |
| ClaimableTokensClient | `services/Solana/programs/ClaimableTokensClient/ClaimableTokensClient.ts` |
| PaymentRouterClient | `services/Solana/programs/PaymentRouterClient/PaymentRouterClient.ts` |
| Storage | `services/Storage/Storage.ts` |
| StorageNodeSelector | `services/StorageNodeSelector/StorageNodeSelector.ts` |
