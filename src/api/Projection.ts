/**
 * Projection.ts — the default projection layer (AX-02).
 *
 * Audius API responses are fat: a single track is ~6 KB and most of it is
 * artwork mirror arrays, signed stream URLs, CID hashes and wallet addresses —
 * bytes no agent reasoning step consumes. By default the sandbox strips these
 * heavy, low-signal keys before a result crosses back to the model.
 *
 * Opt out per call:  options.raw === true   or   options.detail === "full"
 * Project precisely: options.fields = ["data.title", "data.user.name", ...]
 *
 * This is a defence-in-depth layer beneath the ResponseGuard cap (AX-01a):
 * projection keeps the common case small; the cap guarantees the worst case.
 */

/** Heavy / low-signal keys stripped at the default detail level. */
const HEAVY_KEYS = new Set<string>([
  "artwork", "cover_art", "cover_art_sizes", "cover_photo", "cover_photo_sizes",
  "cover_photo_cids", "cover_photo_legacy", "profile_picture", "profile_picture_sizes",
  "profile_picture_cids", "profile_picture_legacy",
  "stream", "download", "preview", "track_cid", "orig_file_cid", "preview_cid",
  "orig_filename", "field_visibility", "track_segments", "audio_upload_id",
  "blocknumber", "erc_wallet", "spl_wallet", "spl_usdc_wallet", "spl_usdc_payout_wallet",
  "payout_wallet", "associated_wallets_balance", "associated_sol_wallets_balance",
  "creator_node_endpoint", "ddex_app", "ddex_release_ids", "audio_analysis_error_count"
])

export interface ProjectionOptions {
  raw?: boolean
  detail?: "minimal" | "standard" | "full"
  fields?: string[]
}

export interface ProjectionOutcome {
  readonly value: unknown
  readonly projected: boolean
  readonly note?: string
}

function stripHeavy(value: unknown, dropped: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => stripHeavy(v, dropped))
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (HEAVY_KEYS.has(k)) {
        dropped.add(k)
        continue
      }
      out[k] = stripHeavy(v, dropped)
    }
    return out
  }
  return value
}

/** Navigate a dot-path, mapping element-wise across any array crossed. */
function pickPath(value: unknown, segments: string[]): unknown {
  if (segments.length === 0) return value
  if (Array.isArray(value)) {
    return value.map((v) => pickPath(v, segments))
  }
  if (value && typeof value === "object") {
    const head = segments[0]
    const child = (value as Record<string, unknown>)[head]
    return { [head]: pickPath(child, segments.slice(1)) }
  }
  return undefined
}

function deepMerge(a: unknown, b: unknown): unknown {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.map((el, i) => (i < b.length ? deepMerge(el, b[i]) : el))
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
    const out: Record<string, unknown> = { ...(a as Record<string, unknown>) }
    for (const [k, v] of Object.entries(b as Record<string, unknown>)) {
      out[k] = k in out ? deepMerge(out[k], v) : v
    }
    return out
  }
  return b ?? a
}

/**
 * Apply projection to an API response value. Returns the (possibly trimmed)
 * value plus an honest note describing what the membrane did (AX-04).
 *
 * `options` is the raw options object the agent passed to audius.request —
 * projection reads `raw`, `detail`, and `fields` from it and ignores the rest.
 */
export function project(
  value: unknown,
  options: Record<string, unknown> = {}
): ProjectionOutcome {
  const raw = options["raw"] === true
  const detail = options["detail"]
  const fields = Array.isArray(options["fields"])
    ? (options["fields"] as unknown[]).filter((f): f is string => typeof f === "string")
    : undefined

  if (raw || detail === "full") {
    return { value, projected: false }
  }

  if (fields && fields.length > 0) {
    let acc: unknown = undefined
    for (const f of fields) {
      const picked = pickPath(value, f.split("."))
      acc = acc === undefined ? picked : deepMerge(acc, picked)
    }
    return {
      value: acc,
      projected: true,
      note: `projected to fields [${fields.join(", ")}]`
    }
  }

  const dropped = new Set<string>()
  const stripped = stripHeavy(value, dropped)
  if (dropped.size === 0) {
    return { value: stripped, projected: false }
  }
  return {
    value: stripped,
    projected: true,
    note:
      `dropped ${dropped.size} heavy key type(s) [${[...dropped].sort().join(", ")}] — ` +
      `pass { raw: true } in options for the full response`
  }
}
