import { fetchBacklinks, type ConstellationLinkingRecord } from '@/lib/constellation/client'
import { COLLECTIONS } from '@/lib/lichen/collections'
import { getCachedHandle, setCachedHandle } from '@/lib/atproto/handle-cache'
import { getPublicAgent } from '@/lib/atproto/auth'
import { getActorProfile } from '@/lib/standardsite/blog'

/**
 * A wiki that names this one as its fork parent.
 *
 * `forkedFrom` lives on the fork's own record, so the source has no local list
 * of its children — the reverse direction has to come from a network index.
 * Constellation tracks records by the URIs they point at, which is exactly this
 * edge.
 */
export interface ForkOfWiki {
  did: string
  /** Resolved handle; falls back to the DID when resolution fails. */
  handle: string
  /** Wiki slug, which is the record's rkey. */
  slug: string
  uri: string
}

/** Constellation path for `wiki.lichen.wiki` → `forkedFrom`. */
const FORKED_FROM_PATH = '.forkedFrom'

function toFork(record: ConstellationLinkingRecord): ForkOfWiki {
  return {
    did: record.did,
    handle: record.did,
    slug: record.rkey,
    uri: `at://${record.did}/${record.collection}/${record.rkey}`,
  }
}

/**
 * List the wikis forked from `sourceWikiUri`, newest-indexed first.
 *
 * Returns an empty list rather than throwing when the index is unreachable:
 * fork discovery is supplementary, and a Constellation outage should not break
 * the page it is shown on.
 */
export async function listForksOfWiki(
  sourceWikiUri: string,
  options: { limit?: number; resolveHandles?: boolean } = {},
): Promise<ForkOfWiki[]> {
  if (!sourceWikiUri) return []

  let records: ConstellationLinkingRecord[]
  try {
    const response = await fetchBacklinks({
      target: sourceWikiUri,
      collection: COLLECTIONS.wiki,
      path: FORKED_FROM_PATH,
      limit: options.limit ?? 16,
    })
    records = response.linking_records ?? []
  } catch {
    return []
  }

  const forks = records.map(toFork)
  if (options.resolveHandles === false) return forks

  return Promise.all(
    forks.map(async (fork) => ({ ...fork, handle: await resolveHandle(fork.did) })),
  )
}

/** DID → handle, cached; falls back to the DID so a link is always renderable. */
export async function resolveHandle(did: string): Promise<string> {
  const cached = getCachedHandle(did)
  if (cached) return cached
  try {
    const profile = await getActorProfile(getPublicAgent(), did)
    if (profile.handle) {
      setCachedHandle(did, profile.handle)
      return profile.handle
    }
  } catch {
    // Fall through to the DID.
  }
  return did
}

/** How many wikis have been forked from this one. */
export async function countForksOfWiki(sourceWikiUri: string): Promise<number> {
  if (!sourceWikiUri) return 0
  try {
    const response = await fetchBacklinks({
      target: sourceWikiUri,
      collection: COLLECTIONS.wiki,
      path: FORKED_FROM_PATH,
      limit: 1,
    })
    return response.total ?? 0
  } catch {
    return 0
  }
}
