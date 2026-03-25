# Local Development & Examples

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Devnet Setup](#devnet-setup)
3. [Dev Nodes](#dev-nodes)
4. [Peering with Production](#peering-with-production)
5. [Examples](#examples)
6. [Build & Test Commands](#build--test-commands)
7. [Go SDK](#go-sdk)

## Prerequisites

- Docker and Docker Compose
- Go v1.25
- Run `make install-deps` for remaining dependencies

## Devnet Setup

Add hosts entry:

```bash
echo "127.0.0.1 node1.oap.devnet node2.oap.devnet node3.oap.devnet node4.oap.devnet" | sudo tee -a /etc/hosts
```

Optional — trust the dev TLS cert (macOS):

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain dev/tls/cert.pem
```

Start the devnet:

```bash
make up
```

Stop the devnet:

```bash
make down
```

## Dev Nodes

- https://node1.oap.devnet through https://node4.oap.devnet
- Console: `/console`, `/console/nodes`, `/console/uptime`
- Smoke test: `curl -s https://node1.oap.devnet/core/nodes | jq`

## Peering with Production

```bash
docker run --rm -it -p 80:80 -p 443:443 -e NETWORK=prod openaudio/go-openaudio:dev
```

## Examples

All examples require devnet (`make up`). Run with `go run ./examples/{example}/main.go`.

| Example | Purpose |
|---------|---------|
| upload | Upload content to the network |
| upload-resumable | Resumable uploads |
| indexer | Index blockchain data |
| block-stream | Stream blocks |
| rewards | Query rewards |
| programmable-distribution | Custom distribution (e.g. geolocation-gated streaming) |

Programmable distribution example:

```bash
make example/programmable-distribution
# or
go run ./examples/programmable-distribution -validator node3.oap.devnet -port 8800
```

## Build & Test Commands

```bash
make bin/openaudio-native   # Native binary
make docker-dev             # Dev Docker image
make test                   # All tests
make test-unit              # Unit only
make test-integration       # Integration only
make test-mediorum          # Storage tests
make lint                   # Lint
```

## Go SDK

The SDK lives in `pkg/sdk/` within the go-openaudio repo:
- `sdk.go` — Client initialization
- `release.go` — Release management
- `rewards/` — Reward queries
- `mediorum/` — Storage client
