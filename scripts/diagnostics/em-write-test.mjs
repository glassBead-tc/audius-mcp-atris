// Legacy EntityManager write path, assembled from SDK internals (the Node
// bundle of @audius/sdk 15.3.1 omits the *WithEntityManager methods).
// This path signs the tx client-side with the app key and submits via relay,
// then confirmWrite polls until the block is indexed — grant failures loud.

import { readFileSync } from 'node:fs'
import {
  createAppWalletClient,
  EntityManagerClient,
  getDefaultEntityManagerConfig,
  EntityManagerAction,
  EntityType,
  productionConfig,
  decodeHashId
} from '@audius/sdk'

const env = readFileSync('/workspaces/audius-mcp-atris/.env', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim()
const apiKey = get('AUDIUS_API_KEY')
const apiSecret = get('AUDIUS_API_SECRET')

const USER = 'E2AjR'
const TRACK = process.argv[2] ?? 'Xk6Exdq'
const ACTION = process.argv[3] === 'unsave' ? EntityManagerAction.UNSAVE : EntityManagerAction.SAVE

const wallet = createAppWalletClient({ apiKey, apiSecret })
const em = new EntityManagerClient({
  ...getDefaultEntityManagerConfig(productionConfig),
  audiusWalletClient: wallet
})

const main = async () => {
  console.log(`action=${ACTION} track=${TRACK} (userId=${decodeHashId(USER)}, entityId=${decodeHashId(TRACK)})`)
  const receipt = await em.manageEntity({
    userId: decodeHashId(USER),
    entityType: EntityType.TRACK,
    entityId: decodeHashId(TRACK),
    action: ACTION,
    confirmationTimeout: 30000
  })
  console.log('receipt:', JSON.stringify(receipt))

  // confirmWrite polls the API until the block is indexed
  const confirmed = await em.confirmWrite({
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber,
    confirmationTimeout: 30000
  })
  console.log('confirmed indexed:', confirmed)
}

main().catch(async (e) => {
  console.error('FAILED:', e?.constructor?.name, e?.message ?? String(e))
  if (e?.response) {
    console.error('  url:', e.response.url)
    console.error('  status:', e.response.status)
    try { console.error('  body:', (await e.response.text()).slice(0, 500)) } catch {}
  }
  process.exit(1)
})
