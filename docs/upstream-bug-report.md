# Bug report: OAuth-delegated writes silently discarded for apps without a server-registered api_secret

*Prepared 2026-07-10 from a source trace of `AudiusProject/api` @ b41b8659 and
`OpenAudio/go-openaudio` @ 50e54b5c, plus live reproduction on api.audius.co.
Suitable for posting to the Audius developer Discord / GitHub issues.*

Third-party delegated writes via OAuth 2.0 PKCE bearer tokens on api.audius.co return
200 with a mined transaction but are silently discarded at index time whenever the
developer app's `api_secret` is not stored in the API server's `api_keys` table (true
for all apps created via the protocol dashboard; migration `0189_api_keys_tables.sql`
backfilled `api_secret = NULL`). Root cause: `getApiSigner` in `api/request_helpers.go`
(L64-75), after `getSignerFromOAuthToken` fails to find an `api_secret`, silently falls
back to signing the ManageEntity tx with `config.AudiusApiSecret` — the first-party app
key. The core node's `InjectSigner` (go-openaudio `pkg/core/server/connect.go:198`)
stamps the recovered first-party address as the on-chain signer; consensus performs no
authorization (`validateV1Transaction`, `abci.go:1146-1148`), so the tx mines; the
ETL's `ValidateSigner` (go-openaudio
`pkg/etl/processors/entity_manager/validate.go:108-111`) then finds no grant from the
user to the *first-party* wallet and rejects with a `ValidationError` that is only a
`Warn` log ("entity manager validation rejected", `pkg/etl/indexer.go:577`). The client
sees 200 + tx hash and no state change, ever.

Two adjacent defects compound this:

1. `POST /v1/developer-apps/{address}/access-keys` mints `api_access_keys` rows without
   requiring a stored `api_secret`, producing bearer credentials that always fail with
   401 "Invalid or expired access token" (`getSignerFromApiAccessKey` needs the
   `api_keys` join with a non-empty secret).
2. `POST /v1/developer-apps/{address}/register-api-key` accepts any `api_secret`
   without verifying it derives the app address, so a typo'd secret reproduces the
   silent-discard failure with a different wrong signer.

Additionally, `@audius/sdk` v15.3.1's REST write methods send no `Authorization` header
at all and are rejected by the write handlers ("missing Authorization header",
surfaced as a 500) — the Go API's write path reads only the `Authorization` header for
signer resolution and does not support the SDK's `Encoded-Data-Signature` flow.

**Working third-party write shapes today**: `Authorization: Basic
base64(anything:<api_secret_hex>)` on the `/v1` write endpoints (verified end-to-end:
favorite and unfavorite both indexed), or the legacy `POST /relay` flow (which
validates grants loudly before relaying).

**Suggested fixes**: in `getApiSigner`, return 403 ("app secret not registered — use
/relay or register-api-key") instead of falling back to `AudiusApiSecret` when the
request was authenticated by a third-party OAuth token; validate secret↔address at
register-api-key and access-key mint time; and perform the grant/signer check at
SendTransaction (as `POST /relay` already does) so unauthorized ManageEntity txs fail
loudly at submission instead of mining and being dropped by the indexer.

## Reproduction (as observed 2026-07-10)

1. Developer app created via protocol dashboard (no server-stored secret).
2. OAuth 2.0 PKCE flow with `scope=write`; user consents; grant visible in
   `GET /v1/users/{id}/authorized_apps` within seconds.
3. `POST /v1/tracks/{id}/favorites?user_id={id}` with `Authorization: Bearer
   <access_token>` → 200 `{block_hash, block_number, transaction_hash}`.
4. The favorite never appears in any indexed read (waited 3+ minutes; reproduced across
   two apps, fresh grants, clean target tracks, explicit and implicit `user_id`).
5. Same request with `Authorization: Basic base64(x:<api_secret>)` → 200 and indexed
   within seconds.
