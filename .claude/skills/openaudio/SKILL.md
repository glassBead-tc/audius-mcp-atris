---
name: openaudio
description: "Build on the Open Audio Protocol — the decentralized global music database. Use this skill whenever the user mentions Open Audio Protocol, OAP, go-openaudio, running validator nodes, protocol-level music infrastructure, decentralized music storage, DDEX wire protocol, $AUDIO staking, artist coins, mediorum, or self-hosted music indexing. Also use when the user wants to run a devnet, build directly against the protocol without Audius APIs, or integrate with OAP consensus/storage layers."
---

# Open Audio Protocol Development

The Open Audio Protocol (OAP) is the global music database: a decentralized protocol for storage, streaming, and programmable distribution of music. This skill helps you build on the protocol layer directly.

If the user wants to build a music app using ready-made REST APIs and SDKs, point them to the `audius-api` skill instead — Audius is an application layer built on OAP that provides a faster path for frontend/app development.

## When to use OAP directly vs Audius

| Goal | Use |
|------|-----|
| Music player, app, frontend (fast path) | Audius API + SDK → see `audius-api` skill |
| Self-hosted indexer and API (no Audius dependency) | go-openaudio (this skill) |
| Run a validator node | go-openaudio (this skill) |
| Protocol integration, custom distribution | go-openaudio SDK + ddex-proto (this skill) |
| Artist coins, reward pools | Solana programs + OAP docs (this skill) |

## Architecture

OAP runs as a single Docker container (`openaudio/go-openaudio`) combining:
- **Core**: CometBFT-based consensus and sync
- **Mediorum**: Content storage (audio files, metadata)
- **ETH Bridge**: Ethereum L1 registry sync (staking, node registration)

### Wire Protocol

OAP extends DDEX with cryptographic primitives for permissionless operation. Implemented in protobuf via `ddex-proto`. Three message types:
- **ERN** (Electronic Release Notification): Parties, resources, releases, deals
- **MEAD** (Media Enrichment and Description): Mood, genre, lyrics
- **PIE** (Party Identification and Enrichment): Biographical data, social links

### Key Components

| Component | Purpose | Ports |
|-----------|---------|-------|
| Core | Consensus, blocks, transactions | 26656 (P2P), 26657 (RPC), 26659 (API) |
| Mediorum | Blob storage, transcoding | 1991 |
| ETH Bridge | Ethereum registry sync | — |
| API | gRPC/Connect services | 50051 |
| Console | Web UI (blocks, nodes, uptime) | /console/ |

## Quickstart

```bash
docker run --rm -it \
  -p 80:80 -p 443:443 -p 26656:26656 \
  -e OPENAUDIO_TLS_SELF_SIGNED=true \
  -e OPENAUDIO_STORAGE_ENABLED=false \
  openaudio/go-openaudio:stable
```

Then visit `https://localhost/console/overview`.

## For detailed setup instructions

Read the reference files in this skill:

- **`references/validator-setup.md`** — Full validator and RPC node setup, including hardware specs, keypair generation, Docker Compose config, blob storage providers, and on-chain registration
- **`references/local-dev.md`** — Local devnet setup, development workflow, build commands, and example programs
- **`references/protocol-concepts.md`** — Staking, governance, artist coins, media storage, moderation, and $AUDIO token details

## Key Links

| Resource | URL |
|----------|-----|
| Docs | https://docs.openaudio.org |
| GitHub | https://github.com/OpenAudio/go-openaudio |
| Docker Hub | https://hub.docker.com/r/openaudio/go-openaudio/tags |
| Dashboard (register nodes) | https://dashboard.audius.org/#/nodes |
| Staking | https://staking.openaudio.org |
| Explorer | https://explorer.openaudio.org |
| Wire protocol docs | https://docs.openaudio.org/concepts/wire-protocol |
| Run a Node tutorial | https://docs.openaudio.org/tutorials/run-a-node |

## Important

- Minimum validator bond: 200,000 $AUDIO
- Health check: `GET /health-check` returns JSON with `live`, `ready`, core, and storage status
- The Go SDK lives in `pkg/sdk/` within go-openaudio (`sdk.go`, `release.go`, `rewards/`, `mediorum/`)
- For Audius REST API / JavaScript SDK development, use the `audius-api` skill instead
