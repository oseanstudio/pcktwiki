import { getPublicAgent } from '@/lib/atproto/auth'

/**
 * Does `ownerDid` follow `did`?
 *
 * Backs the "people I follow can contribute" wiki policy. Checked against the
 * public AppView follow graph; a wiki is not obligated to honour it, so this
 * is a convenience gate — the owner still reviews whatever lands in the queue.
 * Fails closed: if the graph cannot be read, the answer is no.
 */

const PAGE_LIMIT = 100
/** Follow graphs can be huge; past this the gate is meaningless anyway. */
const MAX_PAGES = 10

const cache = new Map<string, boolean>()

export function clearFollowCheckCache(): void {
  cache.clear()
}

export async function doesFollow(ownerDid: string, did: string): Promise<boolean> {
  if (!ownerDid || !did) return false
  if (ownerDid === did) return true

  const key = `${ownerDid}|${did}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  try {
    const agent = getPublicAgent()
    let cursor: string | undefined
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await agent.app.bsky.graph.getFollows({
        actor: ownerDid,
        limit: PAGE_LIMIT,
        cursor,
      })
      if (response.data.follows.some((follow) => follow.did === did)) {
        cache.set(key, true)
        return true
      }
      cursor = response.data.cursor
      if (!cursor) break
    }
    cache.set(key, false)
    return false
  } catch {
    return false
  }
}
