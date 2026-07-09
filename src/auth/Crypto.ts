/**
 * Stateless crypto for the OAuth broker (capability roadmap Phase 2).
 *
 * The broker keeps no database: every piece of flow state (registered
 * client, pending login, authorization code) is sealed into an AES-256-GCM
 * token under a single symmetric key derived from MCP_AUTH_SECRET. Each
 * sealed blob carries a `purpose` tag so a token minted for one step can
 * never be replayed at another, and an optional expiry.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const ALG = "aes-256-gcm"
const IV_BYTES = 12
const TAG_BYTES = 16

export const deriveKey = (secret: string): Buffer =>
  createHash("sha256").update(secret).digest()

interface SealedPayload<T> {
  readonly p: string
  readonly exp?: number
  readonly d: T
}

/** Encrypt `data` into a purpose-tagged, optionally expiring opaque token. */
export const seal = <T>(key: Buffer, purpose: string, data: T, ttlSeconds?: number): string => {
  const payload: SealedPayload<T> = {
    p: purpose,
    d: data,
    ...(ttlSeconds !== undefined
      ? { exp: Math.floor(Date.now() / 1000) + ttlSeconds }
      : {})
  }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALG, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url")
}

/**
 * Decrypt and validate a sealed token. Returns null (never throws) on any
 * failure: tampering, wrong key, wrong purpose, or expiry.
 */
export const unseal = <T>(key: Buffer, purpose: string, token: string): T | null => {
  try {
    const raw = Buffer.from(token, "base64url")
    if (raw.length <= IV_BYTES + TAG_BYTES) return null
    const iv = raw.subarray(0, IV_BYTES)
    const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
    const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES)
    const decipher = createDecipheriv(ALG, key, iv)
    decipher.setAuthTag(tag)
    const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
    const payload = JSON.parse(json) as SealedPayload<T>
    if (payload.p !== purpose) return null
    if (payload.exp !== undefined && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload.d
  } catch {
    return null
  }
}

/** URL-safe random token (PKCE verifiers, upstream state). */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString("base64url")

/** RFC 7636 S256: BASE64URL(SHA256(verifier)). */
export const s256Challenge = (verifier: string): string =>
  createHash("sha256").update(verifier).digest("base64url")
