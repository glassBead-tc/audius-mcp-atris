/**
 * Protocol-flavored failure explainer (capability roadmap 5a).
 *
 * Audius API failures often encode platform semantics an agent can't guess:
 * empty-authedWallet 403s (the request needed a signature, not a bearer),
 * grant mismatches, chain-halt write failures, per-key rate limits. This
 * module turns the raw error body into an actionable next step, appended to
 * the error the sandbox sees.
 */

/**
 * Explain an Audius API error response. Returns an actionable hint, or
 * undefined when the error speaks for itself.
 */
export const explainAudiusError = (
  status: number,
  body: string,
  method: string
): string | undefined => {
  const isWrite = method === "POST" || method === "PUT" || method === "DELETE"

  if (status === 403) {
    // "You are not authorized ... authedWallet= myId=143127" — empty wallet:
    // no signature reached the API. The endpoint authenticates via a signed
    // request (or grant-backed bearer), not the anonymous API key.
    if (/authedWallet=\s*(?:my(?:Id|Wallet)=|["}]|$)/.test(body)) {
      return "The API resolved NO signing wallet (authedWallet is empty) — this endpoint " +
        "wants an authenticated request. For gated reads, retry with { auth: 'signed' } " +
        "(requires an active user login); writes need a logged-in user so the server can sign."
    }
    // authedWallet=0x… — a signature arrived but authorization failed: that
    // wallet has no grant from (or is not) the target user.
    const wallet = body.match(/authedWallet=(0x[0-9a-fA-F]{40})/)?.[1]
    if (wallet) {
      return `The API authenticated wallet ${wallet} but it is not authorized for the ` +
        "requested user/wallet — the user has not granted this app (check " +
        `/grantees/${wallet.toLowerCase()}/users), or the route requires the user's OWN ` +
        "wallet (myWallet routes), which app-key signing cannot satisfy."
    }
    return undefined
  }

  if (status === 401) {
    return "No valid credential: the bearer token is missing, expired, or revoked. " +
      "Re-authenticate (MCP OAuth or the login tool) and retry."
  }

  if (status === 429) {
    return "Rate limited: default per-key limits are 10 requests/second (500k/minute). " +
      "Back off and batch reads inside a single execute call where possible."
  }

  if (status >= 500 && isWrite) {
    return "Write failures can be UPSTREAM, not yours: check chain health with " +
      "protocol.request('/core.v1.CoreService/GetStatus') — if chainInfo.currentHeight " +
      "is not advancing, block production has halted and ALL writes fail platform-wide. " +
      "Even when writes return 200 + a receipt, the effect only exists once indexed — " +
      "always verify with a follow-up read."
  }

  return undefined
}
