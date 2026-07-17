# go-openaudio Capability Map (mid-2026)

Research target: `github.com/OpenAudio/go-openaudio` (Open Audio Protocol node software),
docs at `https://docs.openaudio.org`. Repo inspected at commit `16ed1aad` (2026-07-16).
This maps what an autonomous agent could do against the protocol layer directly, bypassing the Audius REST API.

## 0. Big picture

- Single node type: the **Open Audio Validator Node** (`cmd/openaudio/main.go`). The old
  Discovery/Content/Creator split is deprecated; one binary runs consensus (CometBFT) + storage (Mediorum).
- Chain is **CometBFT 1.0.0** based. Transactions are protobuf `SignedTransaction` (v1) or
  DDEX `Envelope`/`Transaction` (v1beta1), NOT EVM. There is a legacy Audius EVM sidechain
  ("ACDC", chainId prod `31524`) whose EntityManager EIP-712 domain is reused for signing
  `ManageEntityLegacy` txs — but those txs now settle on the CometBFT chain, not ACDC.
- APIs are exposed via **ConnectRPC** (proto-generated), which serves gRPC, gRPC-Web, AND
  plain HTTP+JSON from the same handler. This is the key fact for non-Go clients (see §6).

## 1. APIs a node exposes

### Ports (`pkg/core/config/config.go`, `cmd/openaudio/main.go`)
- **80/443** — Echo HTTP(S) reverse proxy; the public front door. TLS via `OPENAUDIO_TLS_*`.
- **50051** — ConnectRPC / gRPC (h2c, HTTP/2 no TLS). Hosts CoreService, StorageService,
  SystemService, EthService, and (if enabled) ETLService. gRPC reflection optional
  (`OPENAUDIO_GRPC_REFLECTION_ENABLED=true`).
- **26656** — CometBFT P2P.
- **26657** — CometBFT native RPC (`OPENAUDIO_RPC_LADDR`, default a unix socket `unix:///tmp/cometbft.rpc.sock` — usually NOT public; exposed selectively).
- **26659** — Core "custom API" Echo server (`OPENAUDIO_CORE_SERVER_ADDR`), proxied at `/core/*` and `/console/*`.
- **1991** — Mediorum storage HTTP, proxied at `/*` when storage enabled.
- **1996** — uptime `/d_api/*` (when enabled).

The 443 front door proxies: `/console/*`,`/core/*` → 26659; everything else → 1991 (mediorum).
gRPC handlers are also reachable through 443 at their Connect paths (`/core.v1.CoreService/*` etc.).

### Proto services (`proto/*/v1/service.proto`, generated to `pkg/api/*`)

**CoreService** (`proto/core/v1/service.proto`) — the main one:
- Read: `Ping`, `GetHealth`, `GetStatus`, `GetNodeInfo`, `GetBlock`, `GetBlocks`,
  `GetTransaction`, `StreamBlocks` (server-stream), `GetStoredSnapshots`.
- Write: `SendTransaction`, `ForwardTransaction`.
- DDEX read: `GetERN`, `GetMEAD`, `GetPIE`.
- Rewards: `GetReward`, `GetRewards`, `GetRewardPool`, `GetRewardAttestation`,
  `GetRewardSenderAttestation`, `GetDeleteRewardSenderAttestation`.
- Registration/slashing attestations: `GetRegistrationAttestation`,
  `GetDeregistrationAttestation`, `GetSlashAttestation(s)`.
- Streaming/content: `GetStreamURLs`, `GetUploadByCID`.

**StorageService** (`proto/storage/v1/service.proto`):
`Ping`, `GetHealth`, `UploadFiles`, `GetUpload`, `StreamTrack` (server-stream),
`GetStreamURL`, `GetIPData`, `GetRendezvousNodes`, `GetStatus`, `GetStorageDiagnostics`.

**ETLService** (`proto/etl/v1/service.proto`, only if `OPENAUDIO_ETL_ENABLED=true`):
`Ping`, `GetHealth`, `GetBlocks`, `GetTransactions`, `GetPlays`, `GetManageEntities`,
`GetValidators`, `GetLocation`.

**EthService** (`proto/eth/v1/service.proto`) — reads the Ethereum L1 staking registry:
`GetStatus`, `GetRegisteredEndpoints`, `GetRegisteredEndpointsForServiceProvider`,
`GetRegisteredEndpointInfo`, `GetServiceProvider(s)`,
`GetStakingMetadataForServiceProvider`, `GetLatestFundingRound`,
`IsDuplicateDelegateWallet`, `Register`, `Subscribe` (stream),
`GetActiveSlashProposalForAddress`.

**SystemService**: `Ping`, `GetHealth`.

### Core custom API on 26659 (`pkg/core/server/http.go`), reachable via `/core/*`:
`GET /core/rewards`, `/core/rewards/attestation`, `/core/nodes`, `/core/nodes/verbose`,
`/core/debug/p2p`, `/core/status`, `/core/sdk` (sandbox), and `/core/crpc*` — a **guarded
proxy to CometBFT RPC** allowing only read methods `status, block, commit, validators,
consensus_params, health` (and only when state-sync snapshots are enabled).

### Mediorum HTTP (port 1991, `pkg/mediorum/server/server.go`):
- `POST /uploads` (multipart, requires `?sig=` upload signature), `GET /uploads`,
  `GET /uploads/:id`, `POST /uploads/:id` (requires user signature).
- `Any /files/*` — **TUS** resumable upload (creation, creation-with-upload, termination).
- `GET/HEAD /content/:cid` and `/ipfs/:cid` — **open blob fetch, no signature**.
- `GET/HEAD /tracks/cidstream/:cid` — **gated**, requires registered/authorized signature.
- `GET /tracks/stream/:trackId` — track streaming (redirects to cidstream).
- Image variants `/content/:jobID/:variant`, previews, delist status, health, `/ip_check`.
- `/internal/*` — node-to-node CRUD/blob replication, BasicAuth protected.

### Top-level (`cmd/openaudio/main.go`): `/health-check`, `/consensus-check`, `/version`,
`/location`, `/console/*` (Templ web UI), `/core/nodes` returns registered peer list.

## 2. Permission tiers

**Permissionless, no keypair, no stake — pure reads:**
- Everything on CoreService read set: blocks (`GetBlock(s)`), `StreamBlocks`, transactions,
  status/health/nodeinfo, `GetERN/GetMEAD/GetPIE`, `GetReward(s)`, `GetRewardPool`.
- ETL queries (`GetPlays`, `GetManageEntities`, `GetValidators`, ...) where ETL enabled.
- Eth staking registry reads.
- CometBFT read RPC via `/core/crpc` (status/block/commit/validators).
- Mediorum **content download**: `GET /content/:cid` and `/ipfs/:cid` are open (no signature).
- Node discovery: `GET /core/nodes`.

**Requires a keypair (secp256k1 Ethereum key) — but NO stake/registration:**
- Uploading audio to mediorum: sign `UploadSignature{Cid}` with `EthSign`, POST to `/uploads?sig=`.
  The uploader just needs a keypair whose address matches the signature; anyone can upload.
- Publishing content:
  - **ManageEntityLegacy** tx (EIP-712 signed) — create Track/User/Playlist etc.
  - **DDEX ERN** tx (`NewReleaseMessage` in an `Envelope`) via `SendTransaction`.
  - MEAD / PIE enrichment messages — docs state "any party can submit" to enrich any release.
- Streaming gated content: signing a stream URL. For programmable-distribution tracks the
  signer must be in the track's `access_authorities` / `management_keys` (self-set at upload).
- Creating reward pools / rewards, requesting reward attestations (needs keypair; pool creation
  additionally needs the ed25519 Solana reward-manager key — see §3).

**Requires stake / on-chain registration (Ethereum L1 Staking.sol / ServiceProviderFactory):**
- Becoming a **validator** that proposes blocks / participates in consensus. Min **200,000 $AUDIO**
  (max 15,000,000) per node; delegation via DelegateManager.sol. (docs/concepts/staking)
- Signing content-access as a "registered node" (validator/peer wallet in `Config.Signers`/`Peers`)
  — for non-programmable tracks, only registered node wallets may authorize cidstream access.
- Producing storage proofs, SLA rollups, submitting registration/deregistration attestations,
  slashing — validator-only transaction types.
- Earning staking rewards (7% annual, claimable weekly, permissionless claim process).

**Important nuance:** The chain does NOT charge gas or require stake to submit content txs.
`CheckTx` (`pkg/core/server/abci.go` `validateSignedTransactionForCheckTx`) only does
shape validation. Business validation (`validateManageEntity`, `validateERNNewMessage`,
`isValidFileUpload`) checks signatures and that the ERN's file CID was uploaded by the same
sender — but any keypair can do that. So content publishing is effectively **permissionless
with a keypair**. Note: ERN/DDEX + `GetStreamURLs` + file-upload txs are gated behind the
`ProgrammableDistributionEnabled` feature flag, which is ON for dev/stage/testnet and
**OFF for prod/mainnet** (`pkg/common/feature_flags.go`) as of this commit.

## 3. The Go SDK (`pkg/sdk`)

`sdk.NewOpenAudioSDK(nodeURL)` builds Connect clients for Core/Storage/ETL/System/Eth plus
helper structs `Rewards` and `Mediorum`, and a TUS-enabled storage client. `Init()` fetches
chainID via `GetNodeInfo`. Auth is a local secp256k1 key: `ReadPrivKey`/`SetPrivKey`,
`Sign`/`RecoverSigner`, `Address()`. Signing is Ethereum `EthSign` (`common.EthSign`), or
EIP-712 for ManageEntity (`server.SignManageEntity`), or ed25519 for reward-manager proofs.

- **`UploadAndRelease(file, filename, opts, ernMessage)`** (`release.go`): the full publish flow —
  computes file CID, signs `UploadSignature`, uploads to mediorum with parallel transcoding
  (waits for 320kbps transcode + FileUpload), then builds a v1beta1 `Envelope` with the ERN
  `NewReleaseMessage`, wraps in `Transaction`, and `Core.SendTransaction`. Returns ERN address,
  resource/release addresses, tx hash, and stream URLs.
- **`Mediorum.UploadFile`** (`sdk/mediorum/mediorum.go`): multipart POST to `/uploads` with
  `template`, `previewStartSeconds`, `placement_hosts`, `?sig=`; polls upload status; returns
  `Upload{ID, OrigFileCID, TranscodeResults["320"], Status,...}`.
- **`Storage.UploadFilesTus`** (`sdk/tus.go`): resumable TUS upload.
- **Rewards** (`sdk/rewards/rewards.go`): `CreateReward`, `DeleteReward`, `GetReward(s)`,
  `CreateRewardPool` (needs ed25519 RM private key to defeat frontrunning),
  `SetRewardPoolAuthorities`, `GetRewardPool`, `GetRewardAttestation` (signs a `RewardClaim`),
  `GetRewardSenderAttestation`/`GetDeleteRewardSenderAttestation`. These bridge to Solana reward
  managers: OAP validators sign attestations that are aggregated and submitted to Solana. Claiming
  is: request attestation(s) from validators → submit to Solana program (Solana submission is not
  in this Go SDK; the SDK produces the signed attestations).

## 4. Programmable distribution (`examples/programmable-distribution*`)

Two examples, same pattern, both are: upload a track and set yourself (an arbitrary generated key)
as the **sole authorized signer**, then run a tiny HTTP worker that signs stream URLs on demand.

- Entity-Manager variant: uploads via `ManageEntityLegacy` with metadata
  `access_authorities: [workerAddress]`. On upload, mediorum populates `sound_recordings` +
  `management_keys` tables for that track.
- DDEX variant: uploads via ERN; worker uses `Core.GetStreamURLs` (signed with `EthSign` over
  `GetStreamURLsSignature{Addresses, ExpiresAt}`; ownership verified against ERN sender).
- The hook: mediorum's `requireRegisteredSignature` middleware (`serve_blob.go`). If a track has
  `management_keys` (access_authorities), ONLY those signer wallets may authorize `/tracks/cidstream/:cid`
  — validator keys are explicitly excluded. Otherwise it falls back to requiring a registered
  node/peer signature. `/content/:cid` remains open (unguarded) — so gating is at the track-stream layer.
- Custom logic (geo/token/follow-gating): the worker is arbitrary code. It decides whether to sign.
  READMEs note follow-gating would "call the Audius API to verify the user follows the artist before
  signing" — i.e. the protocol gives you the signing hook and the `access_authorities` allow-list; the
  policy engine is your own service. `StreamHandler` also receives geo data (city/region/country) on plays.

## 5. Writes at the protocol level

- Transport is `CoreService.SendTransaction` (and `ForwardTransaction` for node relay).
  Anyone reachable to a node can submit; the node gossips it and validators include it in blocks.
- **v1 `SignedTransaction`** oneof (`proto/core/v1/types.proto`) tx types:
  `TrackPlays`(1000), `ValidatorRegistrationLegacy`(1001), `SlaRollup`(1002),
  `ManageEntityLegacy`(1003), `ValidatorMisbehaviorDeregistration`(1004),
  `StorageProof`(1005), `StorageProofVerification`(1006), `Attestation`(1007),
  DDEX `NewReleaseMessage`(1008, "release"), `RewardMessage`(1009), `FileUpload`(1010),
  `RewardPoolMessage`(1011), `ManageEntityLegacyMigration`(1012), `MediorumOperation`(1013).
- **v1beta1 `Transaction`** (DDEX path, `proto/core/v1beta1/types.proto`):
  `Signature{type: PERSONAL|ETHSIGN|EIP712, bytes}` + `Envelope{header{chain_id, expiration,
  nonce, from, to}, messages[]}` where each message is a oneof of ERN / MEAD / PIE. Response is a
  `TransactionReceipt` with per-message acks (e.g. `NewReleaseMessageAck` returns ERN/party/
  resource/release/deal addresses — content-addressed deterministic addresses derived from txhash).
- **Signing scheme**: Ethereum secp256k1. Three modes — personal-sign (`\x19Ethereum Signed
  Message:\n` prefix), raw ethsign (keccak256, no prefix), and EIP-712 typed data. ManageEntity
  uses EIP-712 with the legacy Audius EntityManager domain (`AcdcEntityManagerAddress`,
  `AcdcChainID` prod 31524) — this is a signing-domain artifact only; the tx lands on CometBFT.
- **EntityManager relationship / chain migration**: The legacy Audius EVM EntityManager chain
  (ACDC/POA) is being replaced by this CometBFT chain. `ManageEntityLegacy` is the compatibility
  bridge — same fields (userId, entityType, entityId, action, JSON metadata, EIP-712 sig) but now a
  CometBFT tx. `ManageEntityLegacyMigration` (1012) is a genesis-writer-only variant marking txs
  imported during initial chain migration (indexers skip normal ownership checks for these). So: it
  is a **new chain that subsumes EntityManager**, not the same chain — while preserving EntityManager's
  wire/signature format so existing signers and indexers keep working. Docs (concepts/indexers-views):
  "The protocol stores transactions, not products" — validators keep an append-only signed-tx log;
  aggregation/query is done off-chain by indexers.

## 6. Non-Go / TypeScript path

**Yes — fully reachable from Node/TS without Go, because handlers are ConnectRPC.** Options:

1. **Connect HTTP+JSON**: The server registers handlers with `connectproto.WithJSON(...)`
   (`cmd/openaudio/main.go`) and exposes POST routes at `/<package>.<Service>/<Method>`, e.g.
   `POST https://<node>/core.v1.CoreService/GetBlock` with `Content-Type: application/json` and a
   JSON body. Selected read methods are ALSO registered as **GET** routes (GetStatus, GetNodeInfo,
   GetBlock(s), GetTransaction, GetStoredSnapshots, GetRewards, reward attestations, storage
   GetIPData/GetStatus, all Eth reads) — trivially curl/fetch-able. Use `@connectrpc/connect-web`
   with the proto definitions for a typed TS client, or hand-roll fetch calls.
2. **CometBFT RPC**: standard JSON-RPC (read subset) via `/core/crpc` or 26657 where exposed.
3. **Mediorum**: plain REST/multipart + TUS — any HTTP client. `GET /content/:cid` for downloads.
4. **Signing in TS**: everything uses standard Ethereum secp256k1 (ethers/viem can produce
   personal_sign, raw ecsign, and EIP-712 `signTypedData`) and, for reward pools, ed25519
   (`@noble/ed25519`) + base58. Protobuf message construction needs the `.proto` files compiled
   with `ts-proto`/`buf` (DDEX ERN, `Envelope`, `SignedTransaction`, `UploadSignature`,
   `GetStreamURLsSignature`), then marshalled and signed. No Go dependency required.
   The one non-trivial bit is computing the file CID (`hashes.ComputeFileCID`) for upload
   signatures — must be reimplemented in JS (IPFS-style CID) to match the node's expectation.

There is **no separate official JS/TS SDK** in this repo; the reference SDK is Go (`pkg/sdk`) and
the reference indexer is Go (`pkg/etl`). Docs explicitly frame the Go ETL as "a reference
implementation to build indexers in other languages." Public prod endpoints seen in code/docs:
`https://rpc.audius.co`, `https://creatornode.audius.co`, `creatornode11.staging.audius.co`,
and devnet `https://node{1-4}.oap.devnet`.

## Sources
- Repo (commit 16ed1aad, 2026-07-16): README.md, CLAUDE.md, cmd/openaudio/main.go,
  proto/{core,storage,etl,system,eth}/**, proto/ddex/v1beta1/**, proto/core/v1beta1/types.proto,
  pkg/sdk/{sdk,release,signer,tus}.go, pkg/sdk/{mediorum,rewards}/*, pkg/core/server/*.go
  (abci, connect, http, comet_api, manage_entity, ern, files, eip712, release, plays),
  pkg/mediorum/server/{server,serve_blob}.go, pkg/core/config/config.go,
  pkg/common/feature_flags.go, examples/{block-stream,programmable-distribution*,rewards,etl}/.
- https://docs.openaudio.org — concepts/wire-protocol, media-storage, staking, indexers-views;
  tutorials/upload-to-the-protocol; site nav.
