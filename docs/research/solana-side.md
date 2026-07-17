# Audius / Open Audio Protocol — Solana Side (Capability Map Research)

Researched 2026-07-17. Sources: docs.openaudio.org, github.com/OpenAudio/solana-programs, github.com/AudiusProject/apps (SDK + web monorepo, verified against `main`), live api.audius.co OpenAPI spec (221 endpoints), go-openaudio SDK source, Meteora docs.

---

## 1. Artist Coins

### What they are
Solana SPL tokens ("web3 fan clubs") launched on Meteora's **Dynamic Bonding Curve (DBC)** program, quoted against $AUDIO. Launched Oct 2025 alongside Audius 1.0 (~25 verified artists initially; now the launchpad at **audius.co/coins**, internally the "fan-clubs-launchpad" page).

### Tokenomics (docs.openaudio.org/concepts/artist-coins)
- 1 billion supply per coin, 9 decimals
- 50% to artist, vesting **linearly over 5 years post-graduation**
- 25% sold through the bonding curve
- 20% locked as permanent AMM liquidity after graduation
- 5% reserved for **reward pools**
- 1% trading fee split 50/50 between artist and Audius community treasury
- Graduation to an AMM (Meteora DAMM) at **1,000,000 $AUDIO market cap**
- Standardized DBC config: predefined curve shape with 16 price/liquidity points

### Programmatic interfaces — three layers

**(a) REST — api.audius.co/v1 (tag `coins`, 16 endpoints, verified live):**
- `GET /coins` (filter by ticker/mint/owner_id, sort by market_cap etc.) — returns rich Birdeye-style market data: price, marketCap, fdv, liquidity, holder count, 24h buy/sell/volume, circulatingSupply, dynamic bonding curve insights
- `GET /coins/{mint}`, `GET /coins/ticker/{ticker}`, `GET /coins/{mint}/insights` (incl. `DynamicBondingCurveInsights` model)
- `GET /coins/{mint}/members`, `/members/count` — holders as Audius users (fan-club membership)
- `GET /coins/volume-leaders` — top coin<>AUDIO traders
- `POST /coins` (auth, `user_id`) — **registers** an already-minted coin: body requires `mint, ticker, decimals, name` (+ logo, banner, description, links). It does NOT mint; minting is on-chain.
- `POST /coins/{mint}` — update metadata (description, banner, links)
- `GET/POST /coins/{mint}/redeem`, `GET/POST /coins/{mint}/redeem/{code}` — coin reward claiming (see §4)
- `GET /users/{id}/coins`, `/users/{id}/coins/{mint}`, `GET /wallet/{walletId}/coins` — balances per user / per raw wallet

**(b) @audius/sdk (AudiusProject/apps, packages/sdk):**
- `audiusSdk.coins` — generated `CoinsApi` covering all REST endpoints above
- **`SolanaRelay` service** (packages/sdk/src/sdk/services/Solana/SolanaRelay.ts) — the full launchpad lifecycle via relay endpoints on discovery nodes:
  - `launchCoin({name, symbol, description, walletPublicKey, initialBuyAmountAudio?, image})` → POST `/launchpad/launch_coin` (multipart) → returns `mintPublicKey`, `createPoolTx`, `firstBuyTx?`, `imageUri`, `configPublicKey` — unsigned txs for the client to sign
  - `confirmLaunchCoin({createPoolTx, firstBuyTx?})` → POST `/launchpad/confirm_launch_coin` — confirms pool creation, **creates the coin's reward pool**, executes first buy
  - `getFirstBuyQuote`, `getLaunchpadConfig` (GET `/launchpad/first_buy_quote`, `/launchpad/config`)
  - `claimFees` (POST `/launchpad/claim_fees`) — artist claims their 50% share of trading fees
  - `claimVestedCoins` (POST `/launchpad/claim_vested_coins`) — claim vested supply
  - `getSwapCoinQuote` / `swapCoin` (GET `/meteora/swap_coin_quote`, `/meteora/swap_coin`) — **buy/sell any artist coin vs $AUDIO** through Meteora DBC; returns base64 VersionedTransaction to sign (`swapDirection`, `isExternalWallet`, optional `feePayer` for relay fee payment)
- The Audius web app's `useLaunchCoin` hook drives exactly this flow; buy/sell UI also uses Jupiter for AUDIO/USDC/SOL swaps (Phantom wallet integrated in-app)

**(c) Direct on-chain:** Meteora `@meteora-ag/dynamic-bonding-curve-sdk` — the launch tutorial (docs.openaudio.org/tutorials/launch-artist-coins) documents config creation + pool init + optional first purchase in one flow, using the standardized Audius config (1B supply, $AUDIO quote, 16-point curve). Post-graduation trading is standard Meteora DAMM / any DEX aggregator.

**Answer: yes — a coin can be launched, bought, and sold fully programmatically** (relay builds the txs; agent needs a Solana signer for the artist/user wallet).

### Uses
- Token-gated releases ("release music directly to coin holders") and gated fan-club feed (`GET /fan_club/feed?...` REST tag `fan_club`)
- Reward pools / fan campaigns (§4)
- Prizes: `GET /prizes`, `POST /prizes/claim` — claim by proving a Solana tx sending an exact coin amount (e.g. "exactly 2 YAK") to a prize receiver; `GET /wallet/{wallet}/prizes`
- Perks per help.audius.co: unreleased music, private Discord (`has_discord` field), in-app badges, artist DMs
- Coin membership = fan-club tiering (`/coins/{mint}/members`)

Live examples: YAK (`ZDaUDL4XFdEct7UgeztrFQAptsvh4ZdhyZDZ1RpxYAK`), $AUDIO itself listed as a coin (`9LzCMqDg…`), Crypto Goat, etc.

---

## 2. The four OAP Solana programs (github.com/OpenAudio/solana-programs)

Docs: https://docs.openaudio.org/reference/solana-programs — all audited, mainnet. Repo also contains `audius_eth_registry`, `track_listen_count`, `cli` (Rust 91%, legacy + Anchor).

| Program | Mainnet ID | Purpose | Agent-relevant ops |
|---|---|---|---|
| **Claimable Tokens ("user bank")** | `Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ` | PDA-derived token accounts per Ethereum wallet; transfers authorized by **secp256k1 Ethereum signatures** (non-custodial Solana banks for Eth-keyed Audius users) | Derive user banks (`deriveUserBank`), transfer wAUDIO/USDC out of a user bank with an eth signature — this is how **tips** and userbank **purchases** move funds. SDK: `ClaimableTokensClient` (`createTransferSecpInstruction`, `createTransferInstruction`) |
| **Payment Router** | `paytYpX3LPN98TAeen6bFFeraGSuWnomZmCXjAsoqPa` | Routes SPL tokens (wAUDIO, USDC) to multiple recipients with percentage splits in one tx | Content purchases with artist/collaborator splits + network take; purchase memos for indexing. SDK: `PaymentRouterClient` (`createRouteInstruction`, `createPurchaseMemoInstruction`, `createTransferInstruction`) |
| **Reward Manager** | `DDZDcYdQFEMwcu2Mwo75yGFjJ1mUQyyXLWzhZLEVFcei` | Disburses rewards after quorum of node-operator **attestations** (secp256k1) + anti-abuse oracle | Claim $AUDIO challenge rewards; also backs per-coin reward pools. SDK: `RewardManagerClient` (`createSenderInstruction`, `createSubmitAttestationInstruction/Secp`, `createEvaluateAttestationsInstruction`, `getSubmittedAttestations`, `getRewardManagerState`) |
| **Staking Bridge** | `stkB5DZziVJT1C1VmzvDdRtdWxfs5nwcHViiaNBDK31` | **Permissionless**: swaps SPL-USDC → SPL-AUDIO via Raydium, then bridges SPL-AUDIO → ERC-20 AUDIO via **Wormhole** | Converts USDC content revenue into staked $AUDIO on Ethereum; anyone can crank it |

---

## 3. Payments

All money movement is **on Solana** (Ethereum is only staking/governance).

- **USDC track/album purchases**: SDK `tracks.purchaseTrack` / `getPurchaseTrackInstructions` (same for albums). Flow: read `streamConditions.usdcPurchase.splits` (or `downloadConditions`) from the track → `prepareSplits` (resolves each recipient's USDC user bank via Claimable Tokens) → Payment Router `createRouteInstruction` + purchase memo (+ optional location memo) → pay either from an external Solana wallet (`wallet` param) or from the authed user's **USDC user bank** (Claimable Tokens secp transfer → Payment Router), relayed fee-free via Solana Relay. Price in cents; optional `extraAmount` ("pay extra"). Discovery indexes memos → purchase records.
- **Tips**: `audiusSdk.users.sendTip({senderUserId, receiverUserId, amount})` — wAUDIO user-bank → user-bank transfer via Claimable Tokens (secp instruction + transfer instruction), relayed. `users.sendTipReaction` for reactions. Read side: `GET /tips` (REST + `sdk.tips`).
- **History/read endpoints**: `GET /users/{id}/purchases`, `/purchases/count`, `/purchasers`, `/purchases/download` (CSV); sales CSV (`downloadSalesAsCSVBlob`), USDC withdrawals CSV (`downloadUSDCWithdrawalsAsCSVBlob`); `$AUDIO` tx history `GET /transactions` (deprecated → `/users/{id}/transactions/audio`, `sdk.full.users.getAudioTransactions()`). Signed-request headers (`Encoded-Data-Message/Signature`) or OAuth for private ones.
- **Payouts**: artists receive USDC directly into their user banks via Payment Router splits at purchase time (no settlement step); withdrawals via user-bank transfer (withdraw USDC flow in app); network revenue → Staking Bridge → staked $AUDIO on Ethereum.

---

## 4. Reward pools (artist-coin rewards)

Hybrid OAP-chain + Solana design (verified in go-openaudio `pkg/sdk/rewards/rewards.go` and docs.openaudio.org/tutorials/create-reward-pools):

- Each pool is keyed by a **Solana Reward Manager state account pubkey**; pool governance/consensus lives on the OAP chain (CometBFT validators), disbursement on Solana. For **launchpad coins the relay auto-creates the reward pool at launch** (confirmLaunchCoin), deriving the RM keypair from `(launchpadDeterministicSecret, mint)`; 5% of supply funds it.
- `CreateRewardPool` tx (Go SDK) requires an ed25519 signature by the RM keypair (anti-frontrunning); params: reward ID, name, amount per claim, authorized **claim authorities** (Ethereum secp256k1 keys), deadline block height.
- Claim flow: claim authority verifies eligibility off-chain (custom logic) → signs an **attestation** with unique specifier (prevents double-claims) → user submits attestations to the Reward Manager program → tokens disbursed. Validators can be added/removed as senders on the Solana RM (`CreateSenderPublic`).
- REST surface: `POST /rewards/code` (create reward code, body: base64 **Solana Ed25519 signature of the string "code"** + mint + amount), `GET/POST /coins/{mint}/redeem` and `/redeem/{code}` (check availability / claim by code), `POST /rewards/claim` (claim all undisbursed rewards for a user, optional challengeId/specifier filter). Challenge side: `GET /challenges/undisbursed[/{user_id}]`, `GET /challenges/{challenge_id}/attest?oracle=&specifier=&user_id=`.
- So an agent can: create reward codes for its own coin (with wallet signature), distribute codes to fans, and fans (or the agent for its user) claim via REST — no raw Solana tx needed for the claim path.

---

## 5. docs.openaudio.org summary

- **`/reference/solana-programs`**: the 4-program table above with mainnet+testnet IDs, one-line purposes, link to the GitHub repo.
- **`/tutorials/launch-artist-coins`**: launch via `@meteora-ag/dynamic-bonding-curve-sdk` — prerequisites (name, ticker, description, ≤1000×1000 PNG, creator Solana wallet, optional initial $AUDIO buy); standardized config (1B supply / 9 decimals / $AUDIO quote / 16-point curve); 50% creator vesting 5y; graduation at 1M $AUDIO; creator gets 50% of locked LP + 50% of trading fees; single flow = config creation + pool init + optional first purchase.
- Related pages: `/concepts/artist-coins` (tokenomics & use cases; "any app can provide access to Artist Coins" — infra is open source), `/tutorials/create-reward-pools` (Go SDK attestation flow, §4), `/concepts/audio` (token addresses on both chains).

---

## 6. $AUDIO on Solana vs Ethereum

- **Solana SPL mint `9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM`** ("wAUDIO", Wormhole-wrapped): all in-app economy — user-bank balances, tips, artist-coin bonding-curve quote asset, reward/challenge payouts, trading pairs. It's even listed by `GET /coins` as ticker AUDIO.
- **Ethereum ERC-20 `0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998`**: staking, delegation, and governance of the protocol (eth-contracts repo; "staking $AUDIO gives governance weight"). The **Staking Bridge** program is the one-way pipeline Solana-USDC → Solana-AUDIO (Raydium) → Ethereum-AUDIO (Wormhole) into staking.
- Net: an agent earns/spends/trades $AUDIO on Solana; it stakes/votes on Ethereum L1 (or queries the staking subgraph).

---

## Source URLs
- https://docs.openaudio.org/reference/solana-programs
- https://docs.openaudio.org/tutorials/launch-artist-coins
- https://docs.openaudio.org/tutorials/create-reward-pools
- https://docs.openaudio.org/concepts/artist-coins
- https://docs.openaudio.org/concepts/audio
- https://github.com/OpenAudio/solana-programs
- https://github.com/OpenAudio/go-openaudio (pkg/sdk/rewards/rewards.go)
- https://github.com/AudiusProject/apps — packages/sdk/src/sdk/services/Solana/SolanaRelay.ts, services/Solana/programs/{ClaimableTokensClient,PaymentRouterClient,RewardManagerClient}, api/users/UsersApi.ts (sendTip), api/tracks/TracksApi.ts (purchaseTrack), createSdk.ts (coins/tips/rewards namespaces), packages/web/src/pages/fan-clubs-launchpad-page + hooks/useLaunchCoin.ts
- Live OpenAPI spec: https://api.audius.co/v1/swagger.yaml (tags: coins, rewards, challenges, tips, transactions, wallet, prizes, fan_club)
- https://docs.meteora.ag (Dynamic Bonding Curve: 16-point virtual curve, migration_quote_threshold graduation to DAMM v1/v2); https://www.npmjs.com/package/@meteora-ag/dynamic-bonding-curve-sdk
- News: https://musically.com/2025/10/09/latest-audius-feature-will-see-artists-creating-crypto-coins/ ; https://weraveyou.com/2025/10/audius-artist-coins-crypto/ ; https://help.audius.co/product/artist-coins
