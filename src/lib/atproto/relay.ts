import { fetchWithRetry, toUserFacingNetworkError } from '@/lib/http-retry'

/**
 * Relays expose `com.atproto.sync.listReposByCollection`, which answers the one
 * question no PDS can: *which repos in the whole network hold records of this
 * type*. It is the only discovery primitive available to a client-side app —
 * without it "global search" can only ever mean "search a hardcoded list".
 */
export const RELAY_BASE_URL = 'https://relay1.us-west.bsky.network'

/** Repos per page; the endpoint's documented maximum. */
const PAGE_LIMIT = 1000

/**
 * Ceiling on pagination so a runaway cursor can't spin forever. Lichen wikis
 * number in the dozens today, so this leaves several orders of magnitude of
 * headroom before it ever bites.
 */
const MAX_PAGES = 20

interface ListReposByCollectionResponse {
  repos?: Array<{ did?: string }>
  cursor?: string
}

export async function listReposByCollection(
  collection: string,
  options: { signal?: AbortSignal } = {},
): Promise<string[]> {
  const dids: string[] = []
  const seen = new Set<string>()
  let cursor: string | undefined
  let pages = 0

  do {
    const query = new URLSearchParams({ collection, limit: String(PAGE_LIMIT) })
    if (cursor) query.set('cursor', cursor)

    const response = await fetchWithRetry(
      `${RELAY_BASE_URL}/xrpc/com.atproto.sync.listReposByCollection?${query}`,
      { headers: { accept: 'application/json' }, signal: options.signal },
    )

    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? toUserFacingNetworkError({ status: 429 })
          : `Relay listReposByCollection failed (${response.status})`,
      )
    }

    const data = (await response.json()) as ListReposByCollectionResponse

    for (const repo of data.repos ?? []) {
      if (repo?.did && !seen.has(repo.did)) {
        seen.add(repo.did)
        dids.push(repo.did)
      }
    }

    cursor = data.cursor || undefined
    pages++
  } while (cursor && pages < MAX_PAGES)

  return dids
}
