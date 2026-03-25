# Validator & RPC Node Setup

## Table of Contents
1. [Hardware Requirements](#hardware-requirements)
2. [Keypair Generation](#keypair-generation)
3. [Environment Configuration](#environment-configuration)
4. [Docker Compose Setup](#docker-compose-setup)
5. [Running & Monitoring](#running--monitoring)
6. [On-Chain Registration](#on-chain-registration)
7. [Blob Storage Providers](#blob-storage-providers)
8. [RPC Nodes (No Storage)](#rpc-nodes)

## Hardware Requirements

- 16GB memory
- 8 CPU cores
- 200GB boot disk
- Datacenter-grade network
- S3-compatible blob storage (recommended over local disk)

## Keypair Generation

Generate an Ethereum secp256k1 keypair:

```bash
pip install eth-keys
python -c "
from eth_keys import keys
import os
p = keys.PrivateKey(os.urandom(32))
print('delegateOwnerWallet=', p.public_key.to_checksum_address(),
      '\ndelegatePrivateKey=', p.to_hex(), sep='')
"
```

## Environment Configuration

Create a `.env` file:

```
nodeEndpoint=https://my-node.com
delegateOwnerWallet=0x...
delegatePrivateKey=...
spOwnerWallet=0x...

# Blob storage (example: AWS S3)
OPENAUDIO_STORAGE_DRIVER_URL=s3://my-s3-bucket
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Configuration Variables

| Var | Purpose |
|-----|---------|
| nodeEndpoint | Public URL for this node |
| delegateOwnerWallet | Node keypair address |
| delegatePrivateKey | Node keypair private key |
| spOwnerWallet | Staking wallet (validators); same as delegate for RPC |
| OPENAUDIO_STORAGE_DRIVER_URL | file://, s3://, gs:// |
| NETWORK | prod, stage, dev |

## Docker Compose Setup

```yaml
services:
  my-node:
    image: openaudio/go-openaudio:stable
    container_name: my-node
    env_file: [.env]
    volumes: [/root/openaudio-prod-data:/data]
    ports: [80:80, 443:443, 26656:26656]
  watchtower:
    image: containrrr/watchtower
    volumes: [/var/run/docker.sock:/var/run/docker.sock]
    command: --cleanup my-node
```

## Running & Monitoring

```bash
docker compose up -d
curl my-node.com/health-check
# Or visit https://my-node.com/console
```

Health check returns JSON with `live`, `ready`, core, and storage status.

## On-Chain Registration

1. Go to [Audius Protocol Dashboard](https://dashboard.audius.org/#/nodes)
2. Navigate to Nodes → Register New Node
3. Fill in `nodeEndpoint`, `delegateOwnerWallet`, stake amount
4. Sign transactions

Minimum bond: 200,000 $AUDIO. Maximum: 15M $AUDIO per node.

## Blob Storage Providers

Supported via go-cdk:
- AWS S3
- GCP Cloud Storage
- Cloudflare R2
- Vultr
- Digital Ocean Spaces
- Backblaze B2

See https://docs.openaudio.org/tutorials/run-a-node for provider-specific config.

## RPC Nodes

RPC nodes provide read-only protocol data without storage commitments:
- Set `spOwnerWallet` same as `delegateOwnerWallet`
- No storage driver required
- No minimum bond for storage
- Use for off-chain products that need protocol data
