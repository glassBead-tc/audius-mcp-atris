# Agent-Facing Tooling in the Audius / Open Audio Protocol Ecosystem (as of July 2026)

Research date: 2026-07-17. All files below were fetched live via curl and verified.

---

## 1. Official agent-facing files (agents.md / skill.md / llms.txt)

Audius now ships a **full agents.md ecosystem across both domains** — this launched with the Feb 2026 "agents and vibecoders" push (see §4).

| URL | Status | Contents |
|---|---|---|
| https://audius.co/agents.md | **200, 17 KB markdown** (v1.0, YAML frontmatter `name: audius`) | Main agent entry point |
| https://audius.co/skill.md | 200, 13.7 KB | SDK/API "skill file" for agents |
| https://audius.co/llms.txt | 200, 6 KB | Platform overview + agent pointers |
| https://blog.audius.co/llms.txt | referenced | Blog post index for LLMs |
| https://api.audius.co/agents.md | **404** | Does not exist |
| https://docs.audius.co/llms.txt | 200 | Docs index; links llms-full.txt |
| https://docs.audius.co/llms-full.txt | 200, 278 KB | Entire dev docs in one file |
| https://openaudio.org/agents.md | 200, 11.5 KB (v1.0, `name: open-audio-protocol`) | Protocol-layer agent file |
| https://openaudio.org/skill.md | 200, 6.6 KB | Validator/go-openaudio skill file |
| https://openaudio.org/llms.txt | 200, 4 KB | OAP overview |
| https://docs.openaudio.org/llms.txt | 200, 4.1 KB | OAP docs index (source: docs.audius.co) |

### What audius.co/agents.md tells agents (summary)

- Framing: "**For agents:** Everything here is a recommendation, not a prescription. Use maximal creativity… Agentic apps use Audius as the open standard for music." Calls Audius "the de facto standard for agentic music apps" and "the reference client and agent-friendly gateway to the protocol [OAP]."
- **Layering table**: Audius = application layer (REST API, JS SDK, dev tools) for players/apps/frontends; OAP = protocol layer (storage, streaming, consensus, staking, governance) for nodes/validators. Cross-links to openaudio.org/agents.md for protocol work.
- **API**: base `https://api.audius.co/v1`; domains: users, tracks, playlists, comments, tips, challenges, resolve, explore, events, rewards, developer-apps. "Read-only by default; writes require API credentials." Explicit warning: `discoveryprovider.audius.co` is **deprecated**, always use `api.audius.co`.
- **SDK**: `@audius/sdk` (npm, v15.3.1 as of May 2026); init with `apiKey` (+ `apiSecret` for writes, server-only).
- **API keys**: from audius.co/settings ("Manage Your Apps") or the newer **https://api.audius.co/plans** keys portal (free tier available).
- **Log in with Audius** OAuth: required for user-specific actions (favorites, reposts, uploads); frontend SDK helpers + documented manual server-side flow.
- **Image mirrors rule** (repeated emphatically "Critical for agents"): never strip the `mirrors` array; retry failed image loads by swapping hosts.
- **Developer paths table** + pointers to runnable examples in the `AudiusProject/apps` monorepo: `packages/web/examples` (trending, update-profile [OAuth write scope + server bearer + updateUser], upload [uploadTrackFiles, createTrack], gated-upload [geo-gated streaming]) and `packages/mobile/examples` (trending, auth-sign-in, like-repost, update-profile — all using the "server holds developer-app bearer" write pattern).
- Ends: "_Recommendations only. Go build something unexpected._"

### What audius.co/skill.md adds

- **Explicit OpenAPI ingestion guidance for AI agents**: "Fetch and include the swagger spec in your context to understand endpoints, request/response shapes, and auth." Two specs: `https://api.audius.co/v1/swagger.yaml` (standard) and `/v1/full/swagger.yaml` (full response schemas). This is exactly the input audius-mcp-atris already indexes.
- `x-api-key` header on every request; writes via OAuth or API secret.
- Credential flow, SDK init, first calls, create-audius-app, OAuth notes (SDK OAuth helpers are browser-only; manual guide for servers), mirrors guide, Postman collection.

### openaudio.org/agents.md (protocol layer)

- OAP = "the Global Music Database… largest open, programmable music catalog"; storage, streaming, **programmable sale, and access control**.
- "**Audius is optional.**" Agents can run their own indexer/API via go-openaudio.
- Core concepts: DDEX-extended wire protocol (protobuf via `OpenAudio/ddex-proto`; ERN/MEAD/PIE message types), validators (200k $AUDIO bond, Core consensus + Mediorum storage), staking (7%/yr), **artist coins** (Solana/Meteora bonding curve vs $AUDIO, gated releases, reward pools), governance, **moderation** (validators designate a moderation party; default **Tiki Labs**), $AUDIO addresses, Ethereum contract table, Solana programs.
- Tutorials index: Run a Node, Launch Artist Coins, Create Reward Pools, **Gate Release Access**.

### Notable: no MCP anywhere official

`grep -i mcp` over the 278 KB llms-full.txt: **zero hits**. Audius's official agent strategy is agents.md/skill.md/llms.txt + raw OpenAPI ingestion — not MCP.

---

## 2. MCP servers for Audius / OAP

- **No official MCP server exists** from Audius/AudiusProject/OpenAudio. GitHub org search and code search for `modelcontextprotocol` in AudiusProject: zero hits. npm search "openaudio mcp": nothing.
- GitHub search "audius mcp" returns only:
  - `glassBead-tc/audius-mcp-atris` (this project, 5 stars) — Code Mode server, search+execute over the swagger index.
  - `waldzellai/audius-mcp-server` (0 stars, Sep 2025) — same author's earlier org; the older 105-tool architecture.
- npm: `audius-mcp-atris` 2.3.1 (Jun 2025) and mirror `@mseep/audius-mcp-atris` 1.1.6. Nothing else Audius-related.
- Third-party directories (Playbooks: https://playbooks.com/mcp/glassbead-tc-audius; Skywork deep-dive article, Oct 2025) list the atris server as *the* Audius MCP — describing the legacy 105-tool version ("~95% of the Audius Protocol API").
- **Conclusion: audius-mcp-atris is effectively the only Audius MCP server in the ecosystem, and the official channel has left the MCP lane open.**

---

## 3. Agent-relevant auth/write surface (2025–2026)

From the live swagger (fetched 2026-07-17) and docs:

- **OAuth "Log in with Audius"**: `read` scope (email + profile) and `write` scope ("perform most actions on the user's behalf, but NOT DMs or wallets"). Guide: https://docs.audius.co/developers/guides/log-in-with-audius
- **Developer-apps endpoints** (tag `developer_apps`), all noting "Indexer validates grants":
  - `POST /developer-apps` — create app
  - `GET/PUT/DELETE /developer-apps/{address}` — address *is* the API key
  - `POST /developer-apps/{address}/register-api-key` — **new**: registers api_key/api_secret in the `api_keys` table for apps created via raw EntityManager `ManageEntity` tx (instead of the REST POST). "Inserts with **rps=10, rpm=500000**" — i.e., default per-key rate limits. Security: BearerAuth | BasicAuth | OAuth2 `write`.
  - `POST /developer-apps/{address}/access-keys` — **create a bearer token (API access key)** for a developer app; `POST …/access-keys/deactivate` to revoke. This is the primitive behind the "server-held bearer" write pattern in the official examples.
- **api.audius.co/plans** — key-provisioning portal with tiered plans (JS app; free tier per swagger intro: "Read-only — most endpoints work without credentials. Use an API key for higher rate limits.").
- Official write pattern for apps/agents (per examples): OAuth user consent in client → server holds developer-app bearer → server performs `updateUser` / `favoriteTrack` / `createTrack` etc. No agent-specific delegation primitive beyond this yet.

---

## 4. AI/agent features & announcements on Audius

### "Programmable Music for Agents and Vibecoders" — Feb 25, 2026 (official launch)

- Blog: https://blog.audius.co/posts/programmable-music-for-agents-and-vibecoders (ray j); press release: https://www.prweb.com/releases/programmable-music-for-agents-and-vibecoders-open-audio-protocol-and-audius-launch-agent-first-infrastructure-for-the-next-era-of-music-302697297.html
- Positions OAP as "**agent-native music infrastructure**": machine-readable rights and controls, composable metadata, internet-native financial rails, permissionless APIs. "Agents need infrastructure. They need primitives to build on and interfaces to interact with each other and with humans."
- Explicitly cites **Claude Code and Codex** as the tools (Roneil Rumburg, CEO: "tools like Claude Code and Codex open this ability to a far larger group"); Ray Jacobson (CTO): "a framework where any developer or hobbyist can challenge the streaming status quo."
- Example use cases named: autonomous radio stations, token-gated fan communities, genre-adaptive agents, personalized DAO soundtracks.
- The agents.md/skill.md/llms.txt files (§1) are the deliverables of this launch. **No rate limits, agent authorization scheme, or roadmap were specified.**

### AI music attribution (since 2023, still live)

- `allow_ai_attribution` is a per-user opt-in (Settings → AI attribution). Only opted-in artists appear in the upload form's attribution dropdown. Uploaders can flag tracks as AI-generated and attribute the style-source artist.
- API endpoint: **Get AI Attributed Tracks by User Handle** — https://docs.audius.co/developers/api/get-ai-attributed-tracks-by-user-handle/
- Policy: Audius "in no way supports AI tracks trained on Audius artists' music and uploaded without their permission" — consent-based opt-in only.
- Sources: https://blog.audius.co/article/introducing-ai-music-attribution-on-audius, https://help.audius.co/product/ai-generated-music-on-audius, https://www.billboard.com/pro/audius-ai-opt-in-generated-tracks/, https://musically.com/2023/05/03/audius-wants-to-help-artists-to-opt-in-or-out-of-ai-music/

---

## 5. Norms / moderation / constraints on automated actors

- **Moderation** (https://docs.openaudio.org/concepts/moderation): validators designate a moderation party for DMCA/content moderation; default is **Tiki Labs, Inc.** (`0x071718c690fEfCE978bb39366709f5E51A82A3CD`, endpoint https://notifier.audius.co), providing a free US-based closed-source audio fingerprinting library. Moderation contract: `0x6f08105c8CEef2BC5653640fcdbBE1e7bb519D39`.
- **No published norms for agents/bots**: neither Tiki Labs nor the OpenAudio docs address automated writes, bot behavior, or agent rate-limit policy. The only concrete constraint found is the per-API-key default of **rps=10 / rpm=500,000** baked into `register-api-key`, plus "API key for higher rate limits" in the swagger intro.
- Tone is affirmatively pro-agent ("permissionless," "recommendations, not rules") rather than restrictive. Gap: no explicit ToS language on automated writes was surfaced in search.

---

## 6. Upcoming/adjacent OAP features relevant to agents

- **Programmable distribution / per-track access policies** — shipped, documented on both docs sites:
  - https://docs.openaudio.org/tutorials/gate-release-access and https://docs.audius.co/docs/developers/guides/gate-release-access.md ("Programmable distribution with access authorities and gate-release-access signing").
  - Mechanism: creator designates wallet addresses as **`access_authorities`** on a track; validator nodes reject stream requests not signed by one (401). A creator-run "access server" enforces arbitrary policy (payment, geo, subscription, token-gating) then signs **time-limited stream URLs** (JCS canonicalization + Ethereum personal sign). Examples: Go SDK, Cloudflare Workers, Vercel Edge. This is the hook an agent could use to implement custom monetization.
  - DDEX **deals** in the wire protocol define territories, usage types, price tiers, availability windows.
- **Encrypted emails / email access grants** — live in the API and SDK:
  - Swagger: `GET /users/{receiving_user_id}/emails/{grantor_user_id}/key` ("Gets the encrypted key for email access between the receiving user and grantor"); `email_access` schema (`email_owner_user_id`, grants); purchase/sale schemas carry `encrypted_email` ("Encrypted email of buyer if available") + encrypted decryption key.
  - SDK: `UsersApi.shareEmail` (packages/sdk/src/sdk/api/users/UsersApi.ts in AudiusProject/audius-protocol) — symmetric-key encrypts the email, encrypts the key per grantee, writes via EntityManager with `Action.ADD_EMAIL` / `EntityType.ENCRYPTED_EMAIL` and `access_grants`. Purpose: sharing buyer emails with sellers/labels on sales, E2E-encrypted on-chain. Not yet documented in guides.
- **Artist coins / reward pools / gated releases** — tutorials live (launch-artist-coins, create-reward-pools); Solana + Meteora; graduation at 1M $AUDIO.
- OAP blog (https://docs.openaudio.org/blog) posts to date: OAP intro (Oct 2025), Claimable Tokens/Solana rent (Dec 2025), Agents & Vibecoders (Feb 2026), Disclosure's Friends & Family label (Mar 2026), consensus-halt postmortem (Mar 2026). No MCP or email-grant posts yet.

---

## Gaps / opportunities for audius-mcp-atris

1. **No official MCP server** — atris is the only one; official guidance stops at "ingest swagger.yaml," which is precisely what atris's Code Mode search+execute already operationalizes. Positioning: "the MCP layer Audius's agents.md assumes you'll build."
2. agents.md's mandatory-feeling guidance (mirrors retry, api.audius.co not discoveryprovider, never strip `mirrors`) could be enforced/encoded in atris's sandbox client and type generator.
3. Agent authorization is still developer-app-shaped: OAuth write scope + server-held bearer + new `access-keys` endpoints. No delegated-agent grant primitive exists yet — the silent-discard write bug already documented in this repo remains the frontier.
4. Untooled surfaces atris could expose first: gate-release-access signing (access authorities), email access grants (ENCRYPTED_EMAIL), artist coins/reward pools, AI-attribution queries (`get-ai-attributed-tracks-by-user-handle`).
