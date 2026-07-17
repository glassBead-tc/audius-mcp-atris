/**
 * Ethereum personal-sign for Audius signed-read requests.
 *
 * api.audius.co's auth middleware accepts `user_data` + `user_signature`
 * query params (auth_middleware.go recoverAuthorityFromSignatureHeaders):
 * it recovers the signing wallet from an eth personal-sign over an
 * arbitrary message and authorizes via the wallet's grant from the user.
 * Signing with the developer-app secret therefore unlocks gated reads for
 * any user who granted the app — verified live 2026-07-17 (/fan_club/feed
 * 200 via query params; the equivalent Encoded-Data-* HEADERS are stripped
 * upstream of the API, so query params are the reliable transport).
 */
import { keccak_256 } from "@noble/hashes/sha3.js"
import { hmac } from "@noble/hashes/hmac.js"
import { sha256 } from "@noble/hashes/sha2.js"
import * as secp256k1 from "@noble/secp256k1"

// noble/secp256k1 v3 ships hash-free; wire the RFC 6979 nonce hmac once.
secp256k1.hashes.hmacSha256 = (key: Uint8Array, ...msgs: Uint8Array[]) =>
  hmac(sha256, key, secp256k1.etc.concatBytes(...msgs))
secp256k1.hashes.sha256 = sha256

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Sign a message the way eth_personal_sign does and return the 65-byte
 * r||s||v signature as 0x-hex (v = 27/28, what the API's FromHex expects).
 * Verified byte-identical to ethers.Wallet.signMessage.
 */
export const signPersonalMessage = (message: string, privateKeyHex: string): string => {
  const messageBytes = new TextEncoder().encode(message)
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${messageBytes.length}`)
  const prefixed = new Uint8Array(prefix.length + messageBytes.length)
  prefixed.set(prefix)
  prefixed.set(messageBytes, prefix.length)
  const digest = keccak_256(prefixed)

  // format: "recovered" = 65 bytes with the recovery id FIRST (v3 layout).
  const sig = secp256k1.sign(digest, hexToBytes(privateKeyHex), {
    prehash: false,
    format: "recovered"
  })

  let hex = "0x"
  for (const byte of sig.subarray(1)) hex += byte.toString(16).padStart(2, "0")
  hex += (sig[0]! + 27).toString(16).padStart(2, "0")
  return hex
}
