# Solana Agent-Tooling Landscape — Research for Audius/OAP MCP (July 2026)

Research question: should the Audius/Open Audio Code Mode MCP server BUILD its own Solana
integration or REUSE existing tools/skills? Findings below; recommendation at the end.

---

## 1. Leading Solana MCP servers and agent toolkits

### SendAI solana-agent-kit (+ solana-mcp)
- Repos: https://github.com/sendaifun/solana-agent-kit (~1.7k stars, 870 forks), MCP wrapper at https://github.com/sendaifun/solana-mcp (~161 stars, 31 commits)
- Version: v2 (v2.0.9, mid-2025). Modular plugin architecture: `@solana-agent-kit/plugin-token`, `-nft`, `-defi`, `-misc`, `-blinks`. 60+ actions: Jupiter swaps, SPL token deploy, Metaplex NFTs, perps (Drift/Adrena), staking, lending, bridging (Wormhole/deBridge).
- Maintenance: community assessments (PulseMCP, Oct 2025) rate the MCP server as **low-maintenance**; the agent kit itself is more active but v2 momentum has slowed. https://www.pulsemcp.com/servers/sendaifun-solana
- Key management: raw `SOLANA_PRIVATE_KEY` env var (base58) + `RPC_URL`; docs recommend a dedicated agent wallet. v2 added an embedded-wallet adapter interface so signing can be delegated (`wallet.signTransaction`), compatible with Turnkey/Privy-style signers, but the default is a hot key in env.
- Curates https://github.com/sendaifun/awesome-solana-mcp-servers — ~15 community servers (Aldrin Labs RPC server with 21 RPC methods, Jupiter limit-order server, wallet analyzers, meme deployers). Mostly small, unofficial, variable maintenance.

### Solana Foundation — Solana Developer MCP
- https://mcp.solana.com/ (remote MCP, no API key; `codex/claude mcp add --url https://mcp.solana.com/mcp`)
- **Docs/dev-assist only, not on-chain**: `list_sections`, `get_documentation`, semantic doc search, `Solana_Expert__Ask_For_Help`, `program_autofixer` (Anchor/Pinocchio anti-pattern scanner). No RPC, no signing.

### Helius core-ai (official)
- https://github.com/helius-labs/core-ai — CLI (95+ commands), MCP server (`helius-mcp`), Claude Code plugin, and skills. Latest release helius-cli@2.1.0 **June 24, 2026**; 494 commits — actively maintained. https://www.helius.dev/blog/helius-for-agents
- MCP: 10 tools (9 domain-routed + `expandResult` for paging — a context-friendly design similar to Code Mode). Covers RPC, DAS API, ZK compression, WebSockets + LaserStream gRPC streaming, webhooks, priority-fee tx sending, wallet/history analysis, and **autonomous account signup** (agent can create its own Helius account/API key).
- Key management: CLI generates/stores a local keypair at `~/.helius/keypair.json`; API key via flag/env/config. Signing = local hot key.

### QuickNode MCP
- Official connector in the Anthropic MCP directory (remote hosted, connect by URL) + local `@quicknode/mcp` npm package. 80+ chains. Permissions tied to API-key role (Viewer = read-only, Admin = full) — a useful built-in authz notch. https://blog.quicknode.com/quicknode-is-now-an-official-connector-in-the-anthropic-mcp-directory/
- Also publishes a build-your-own Solana MCP guide: https://www.quicknode.com/guides/ai/solana-mcp-server

### Alchemy MCP
- 159 tools across 100+ networks incl. Solana DAS, token prices, tx history. Agent-native platform: agents sign up via SIWE and pay via x402 (USDC on Base). https://www.alchemy.com/overviews/best-blockchain-apis-for-autonomous-onchain-agents

### Jupiter MCP servers (community)
- `kukapay/jupiter-mcp` and `araa47/jupiter-mcp` — swaps via Jupiter **Ultra API**, limit orders via Trigger API. Both require base58 private key in env + RPC URL. Unofficial, small.

**Takeaway:** the credible, actively-maintained on-chain servers in mid-2026 are the infra-provider ones (Helius, QuickNode, Alchemy). SendAI's kit is the biggest generalist but MCP wrapper maintenance is weak and its key model is a hot env-var key.

---

## 2. Claude Skills (SKILL.md) for Solana

- **solana-foundation/solana-dev-skill** — https://github.com/solana-foundation/solana-dev-skill — 531 stars, MIT, actively maintained. Install: `npx skills add solana-foundation/solana-dev-skill`. Covers: `@solana/kit` v7 (primary client SDK; web3.js v3 RC as legacy path), Anchor 1.1.x, Pinocchio 0.11+, Wallet Standard via `@solana/kit-plugin-wallet`, Codama codegen, Token-2022 confidential transfers, Surfpool/LiteSVM/Mollusk testing, security patterns. **This is the canonical dev skill.**
- **Helius skills** (in core-ai): `helius`, `helius-jupiter` (DeFi apps combining Jupiter + Helius), `helius-dflow`, `helius-okx`, `helius-phantom`, `svm` (protocol internals).
- **CryptoSkills** (https://cryptoskills.dev) — community library, ~95 Solana skills in Anthropic/Bankr SKILL.md format, installed via `npx cryptoskills install`. Includes a **Meteora skill** covering DLMM, DAMM v1/v2, **Dynamic Bonding Curve**, Zap, Alpha Vault, M3M3 — 8 code examples + templates. https://cryptoskills.dev/skills/meteora — plus Anchor scaffold/audit/deploy, Jupiter, Helius, Pyth, Squads, Metaplex skills.
- anthropics/skills has no Solana skill; travisvn/awesome-claude-skills indexes the community ones. https://github.com/anthropics/skills

---

## 3. Agent key management best practice (2025–2026)

Consensus from vendor comparisons (Crossmint, Openfort, Turnkey; https://www.crossmint.com/learn/agent-wallets-compared, https://www.openfort.io/blog/best-agent-wallets-for-developers):

- **Anti-pattern:** raw EOA private key in env (what most Solana MCP servers still do) — unconditional authority, no limits, no rotation without asset migration.
- **Signing-infra layer** (composable): **Turnkey** (TEE, remote attestation, sub-150ms signing, in-enclave policy engine, Ed25519 native), **Privy** (TEE + Shamir, off-chain policies: transfer limits, protocol allowlists, recipient restrictions, time windows), **Alchemy signer**.
- **Purpose-built agent smart wallets:** **Crossmint** (owner/agent separation, USDC wallets on Solana, x402-compatible, virtual cards with spend limits), Coinbase Agentic Wallets, thirdweb.
- **On-chain policy on Solana specifically:**
  - **Swig** (https://onswig.com, https://build.onswig.com) — on-chain smart-wallet framework: role-based, up to 65k roles per wallet, each role = authority + scoped permission, **session keys** (time/amount-limited), gasless UX; explicitly marketed for AI-agent delegation. Integrates with Para for social-login authorities.
  - **Squads** (multisig/smart accounts) — agent as one signer with human co-sign or spending-limit vaults; the standard treasury answer.
- **Recommended pattern for an Audius agent:** owner keeps a primary wallet; agent gets either (a) a Turnkey/Privy server-signer with policy (allowlist: Jupiter, Meteora DBC program, Audius claim programs; per-tx and daily caps), or (b) a Swig session key scoped to those programs, or (c) a Squads sub-account with spending limits. Never the artist's main key.

---

## 4. Meteora (Audius artist-coin infrastructure)

- Confirmed: Audius Artist Coins launch on **Meteora's Dynamic Bonding Curve (DBC), quoted against $AUDIO**; 1B supply, 25% sold on the curve to graduation, auto-migration to DAMM v2 at threshold. https://blog.audius.co/article/artistcoinlaunchpad, https://docs.openaudio.org/concepts/artist-coins/
- **TypeScript SDK:** `@meteora-ag/dynamic-bonding-curve-sdk` (https://github.com/MeteoraAg/dynamic-bonding-curve-sdk, npm). `DynamicBondingCurveClient(connection)` — operations: `createPool` (launch token with config key: mints, name, symbol, URI), **swap** (base↔quote, ExactIn/ExactOut/PartialFill = buy/sell), **quote** functions, migration handling. Docs + example scripts: https://docs.meteora.ag/developer-guide/guides/dbc/typescript-sdk/example-scripts
- Program repo: https://github.com/MeteoraAg/dynamic-bonding-curve; launchpad scaffold ("Fun Launch") available.
- DBC pools are **routed by Jupiter from day one**, so buy/sell of un-graduated artist coins can also go through Jupiter rather than direct SDK calls.
- No official Meteora MCP server; coverage exists as the CryptoSkills Meteora SKILL.md and Bitquery's DBC data API (MEV-filtered swaps, USD price, mcap): https://docs.bitquery.io/docs/blockchain/Solana/meteora-dynamic-bonding-curve-api/
- **What an agent needs:** RPC connection + the DBC SDK (or Jupiter routing) + a signer. Launching = `createPool` with an Audius-side config key (Audius launchpad presumably owns the partner config; launching *through Audius* likely stays a product flow, but buy/sell/quote is fully scriptable).

## 5. Jupiter ($AUDIO ↔ USDC swaps)

- **Ultra API** is the current flagship (supersedes legacy Swap API): order → client-signs → execute. Jupiter handles slippage protection, MEV protection, tx landing (no own RPC needed), gasless in some routes; fee 5–10 bps. https://developers.jup.ag/docs/ultra
- **Free access:** `lite-api.jup.ag` needs no API key; `api.jup.ag` keys via portal.jup.ag (Free/Pro/Ultra plans; fixed per-account rate limits, 60s sliding window). Legacy-portal users keep limits free until **June 30, 2026** — migration deadline just passed. https://developers.jup.ag/docs/portal/rate-limits
- MCP: community `jupiter-mcp` servers exist (see §1); Helius's `helius-jupiter` skill covers the integration pattern. Client always signs — Jupiter never holds keys, so it composes cleanly with any signer from §3.

## 6. RPC access for agents

Free tiers (2026 comparisons: https://www.alchemy.com/overviews/solana-rpc, https://madeonsol.com/compare-rpc):
- **dRPC** 50M CU/mo, 30 RPS (most generous); **Alchemy** 30M CU/mo; **QuickNode** 10M credits/mo; **Syndica** 10M req/mo; **Chainstack** 3M; **Helius** 1M credits @ 10 RPS (paid: $49/mo 10M).
- **WebSockets:** standard `accountSubscribe`/`logsSubscribe`/`programSubscribe` on all providers — sufficient to watch a DBC pool account or Audius claim program logs in near-real-time. Helius adds Enhanced WebSockets + **LaserStream (gRPC/Geyser)** for guaranteed streaming; Geyser-grade streams generally need paid plans.
- For "watch artist-coin trades / reward claims": free-tier websocket `logsSubscribe` on the DBC program filtered by pool, or Helius **webhooks** (address-activity push, available on low tiers) — webhooks are the cheapest reliable option for a server like ours.

---

## Recommendation: REUSE the pieces, build only the thin Audius-specific seam

1. **Don't adopt a general Solana MCP server** (SendAI etc.) — our server is Code Mode; bolting on another 10-60 tools contradicts its design, and the community servers' env-var hot-key model is the known anti-pattern.
2. **Reuse SDKs inside our sandbox/execute path:** `@meteora-ag/dynamic-bonding-curve-sdk` for artist-coin quote/buy/sell, Jupiter Ultra (lite-api, keyless) for $AUDIO↔USDC, `@solana/kit` for RPC. These are exactly Code-Mode-shaped: a `solana`/`jupiter`/`meteora` client handle in the sandbox, like `audius.request`.
3. **Reuse skills for development:** `solana-foundation/solana-dev-skill` + CryptoSkills `meteora` skill locally while building; no need to author a Solana dev skill.
4. **Build:** (a) the sandbox host functions (RPC read + quote endpoints first — read-only needs no key), (b) the signing seam as a pluggable signer interface, defaulting to *no key*, with Turnkey/Privy or Swig session keys as the opt-in write path with program allowlists + spend caps, (c) webhook/websocket watcher for artist-coin trades and reward claims (Helius webhooks cheapest).
5. Signing policy should mirror the lesson already learned on the Audius write path: server-side confirm guard + explicit caps before any value-moving call.
