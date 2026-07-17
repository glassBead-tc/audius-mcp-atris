// Cross-check Audius write paths via the official @audius/sdk.
// Path A: sdk.tracks.favoriteTrack        — new REST write (POST /v1/tracks/{id}/favorites)
// Path B: favoriteTrackWithEntityManager  — legacy client-signed EntityManager relay
// Then verify against the indexer (GET /users/{id}/favorites, paginated).

import { readFileSync } from 'node:fs'
import { sdk } from '@audius/sdk'

const env = readFileSync('/workspaces/audius-mcp-atris/.env', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim()
const apiKey = get('AUDIUS_API_KEY')
const apiSecret = get('AUDIUS_API_SECRET')

const USER = 'E2AjR'
const TRACK = process.argv[2] ?? 'Xk6Exdq' // Pacific Patterns x Underbelly - Dust
const MODE = process.argv[3] ?? 'rest'     // rest | em

const audius = sdk({ apiKey, apiSecret, appName: 'atris-2026' })

const isIndexed = async () => {
  for (let offset = 0; offset < 600; offset += 100) {
    const res = await fetch(
      `https://api.audius.co/v1/users/${USER}/favorites?limit=100&offset=${offset}`,
      { headers: { 'x-api-key': apiKey } }
    )
    const j = await res.json()
    const batch = j.data ?? []
    if (batch.some((f) => f.favorite_item_id === TRACK)) return true
    if (batch.length < 100) break
  }
  return false
}

const main = async () => {
  console.log(`mode=${MODE} track=${TRACK} indexed-before=${await isIndexed()}`)

  try {
    const receipt = MODE === 'em'
      ? await audius.tracks.favoriteTrackWithEntityManager({ trackId: TRACK, userId: USER })
      : await audius.tracks.favoriteTrack({ trackId: TRACK, userId: USER })
    console.log('write response:', JSON.stringify(receipt))
  } catch (e) {
    console.log('write FAILED:', e?.constructor?.name, e?.message ?? String(e))
    if (e?.response) {
      console.log('  status:', e.response.status)
      try { console.log('  body:', (await e.response.text()).slice(0, 300)) } catch {}
    }
    process.exit(1)
  }

  for (let i = 1; i <= 5; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    if (await isIndexed()) {
      console.log(`INDEXED after ~${i * 3}s`)
      process.exit(0)
    }
  }
  console.log('NOT indexed after 15s (silent discard?)')
  process.exit(2)
}

main().catch((e) => { console.error('fatal:', e); process.exit(3) })
