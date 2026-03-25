# Protocol Concepts

## Table of Contents
1. [Staking](#staking)
2. [Artist Coins](#artist-coins)
3. [Media Storage (Mediorum)](#media-storage)
4. [Governance](#governance)
5. [Moderation](#moderation)
6. [$AUDIO Token](#audio-token)
7. [Ethereum Contracts](#ethereum-contracts)
8. [Solana Programs](#solana-programs)

## Staking

- Stake $AUDIO directly (register as validator) or delegate to an operator
- 7% annual reward rate, claimable weekly
- Unstaking: 7-day cooldown period
- Validators: 200k–15M $AUDIO per node
- Slashing via governance for negligence

Staking dashboard: https://staking.openaudio.org
Full docs: https://docs.openaudio.org/concepts/staking

## Artist Coins

Fan-club tokens on Solana via Meteora:
- Bonding curve against $AUDIO
- AMM graduation mechanism
- Used for gated releases, reward pools, fan engagement
- 1B supply per coin
- 100k $AUDIO initial cap
- Graduation threshold: 1M $AUDIO

Launchpad: https://audius.co/coins
Tutorials: https://docs.openaudio.org/tutorials/launch-artist-coins

## Media Storage

Mediorum provides elastic storage across the network:
- Per-node commitment: `(S × R) / N` where S=total storage, R=replication factor, N=number of nodes
- Rendezvous hashing for placement decisions
- Storage proofs and slashing for non-compliance

Full docs: https://docs.openaudio.org/concepts/media-storage

## Governance

$AUDIO holders vote on on-chain proposals:
- 72h voting period
- 24h cooldown after voting ends
- 5% quorum required
- 50% majority to pass
- Controls tokenomics, staking params, node software versions

Dashboard: https://dashboard.audius.org/#/governance
Contract: https://etherscan.io/address/0x4DEcA517D6817B6510798b7328F2314d3003AbAC
Full docs: https://docs.openaudio.org/concepts/governance

## Moderation

Validators specify a moderation party for DMCA and content moderation.
Default provider: Tiki Labs
Contract: https://etherscan.io/address/0x6f08105c8CEef2BC5653640fcdbBE1e7bb519D39

Full docs: https://docs.openaudio.org/concepts/moderation

## $AUDIO Token

Governance and security token with fixed genesis supply of 1B.

| Chain | Address |
|-------|---------|
| Solana | `9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM` |
| Ethereum | `0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998` |

Full docs: https://docs.openaudio.org/concepts/audio

## Ethereum Contracts

Source: https://github.com/OpenAudio/eth-contracts

| Contract | Address |
|----------|---------|
| $AUDIO | 0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998 |
| Staking | 0xe6D97B2099F142513be7A2a068bE040656Ae4591 |
| DelegateManager | 0x4d7968ebfD390D5E7926Cb3587C39eFf2F9FB225 |
| Governance | 0x4DEcA517D6817B6510798b7328F2314d3003AbAC |
| ServiceProviderFactory | 0xD17A9bc90c582249e211a4f4b16721e7f65156c8 |
| Registry | 0xd976d3b4f4e22a238c1A736b6612D22f17b6f64C |

Full reference: https://docs.openaudio.org/reference/ethereum-contracts

## Solana Programs

Source: https://github.com/OpenAudio/solana-programs

Programs: Claimable Tokens, Payment Router, Reward Manager, Staking Bridge.

Full reference: https://docs.openaudio.org/reference/solana-programs

All contracts and programs are audited (Zellic, Neodyme, Kudelski, OpenZeppelin).
Audits: https://docs.openaudio.org/reference/audits
Bug bounty: https://openaudio.org/security
