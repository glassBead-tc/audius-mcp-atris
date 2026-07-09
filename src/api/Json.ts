/**
 * Big-integer-safe JSON parsing (capability roadmap P1-1).
 *
 * Audius returns wei-scale (10^18+) integer amounts in tips, transactions,
 * and coin payloads. `JSON.parse` silently destroys them: JavaScript numbers
 * lose integer precision past 2^53, so amounts come out as garbage floats by
 * the time they reach the sandbox. The fix happens once, at the host parse:
 * any pure integer literal too long to be safely representable is re-quoted
 * so it survives as a string end-to-end (host result → JSON.stringify →
 * sandbox JSON.parse).
 *
 * The rule is positional, not value-precise: integers with more than 15
 * digits become strings. A handful of 16-digit values that would technically
 * fit in a double also become strings — predictable beats clever here, and
 * string amounts are always faithful.
 */

const MAX_SAFE_DIGITS = 15

const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9"

/**
 * Rewrite a JSON text so that pure integer literals longer than
 * MAX_SAFE_DIGITS digits are wrapped in quotes. String contents (including
 * escaped quotes) are never touched; floats and exponent-form numbers pass
 * through unchanged.
 */
export function quoteLargeIntegers(json: string): string {
  let out = ""
  let i = 0
  const n = json.length
  let inString = false

  while (i < n) {
    const ch = json[i]!

    if (inString) {
      if (ch === "\\") {
        out += ch + (json[i + 1] ?? "")
        i += 2
        continue
      }
      if (ch === '"') inString = false
      out += ch
      i++
      continue
    }

    if (ch === '"') {
      inString = true
      out += ch
      i++
      continue
    }

    if (ch === "-" || isDigit(ch)) {
      // Scan the integer part of the number literal.
      let j = i
      if (json[j] === "-") j++
      let digits = 0
      while (j < n && isDigit(json[j]!)) {
        j++
        digits++
      }
      const next = json[j]
      const isPureInteger = next !== "." && next !== "e" && next !== "E"

      if (isPureInteger && digits > MAX_SAFE_DIGITS) {
        out += `"${json.slice(i, j)}"`
        i = j
        continue
      }

      // Copy the full literal (including any fraction/exponent) untouched.
      while (
        j < n &&
        (isDigit(json[j]!) ||
          json[j] === "." ||
          json[j] === "e" ||
          json[j] === "E" ||
          json[j] === "+" ||
          json[j] === "-")
      ) {
        j++
      }
      out += json.slice(i, j)
      i = j
      continue
    }

    out += ch
    i++
  }

  return out
}

/** JSON.parse with large integers preserved as strings. */
export function parseJsonPreservingLargeInts(text: string): unknown {
  return JSON.parse(quoteLargeIntegers(text))
}
