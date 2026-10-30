import { CONSTELLATION_FETCH_CONCURRENCY } from '@/lib/cache-constants'
import { runSettledWithConcurrency } from '@/lib/concurrency'
import { getPublicAgent, resolveHandleToDid } from '@/lib/atproto/auth'
import { fetchBacklinks } from '@/lib/constellation/client'
import { COLLECTIONS } from '@/lib/lichen/collections'
import { wikiKey, type GuestFeedWiki } from '@/data/guest-feed'
import type { GuestFeedWikiDisplay, WikiGraphEdge } from '@/lib/lichen/guest-feed'

const handleCache = new Map<string, string | null>()

async function wikiDid(wiki: GuestFeedWiki): Promise<string> {
  return resolveHandleToDid(wiki.handle)
}

async function resolveDidToHandle(did: string): Promise<string | null> {
  if (handleCache.has(did)) return handleCache.get(did) ?? null

  try {
    const profile = await getPublicAgent().getProfile({ actor: did })
    const handle = profile.data.handle ?? null
    handleCache.set(did, handle)
    return handle
  } catch {
    handleCache.set(did, null)
    return null
  }
}

export async function discoverConstellationEdges(
  wikis: GuestFeedWikiDisplay[],
): Promise<WikiGraphEdge[]> {
  const didToWikis = new Map<string, GuestFeedWikiDisplay[]>()
  const wikiOwnerDid = new Map<string, string>()

  await Promise.all(
    wikis.map(async (wiki) => {
      const did = await wikiDid(wiki)
      wikiOwnerDid.set(wikiKey(wiki.handle, wiki.slug), did)
      const list = didToWikis.get(did) ?? []
      list.push(wiki)
      didToWikis.set(did, list)
    }),
  )

  const edges: WikiGraphEdge[] = []
  const seenPairs = new Set<string>()

  await runSettledWithConcurrency(
    wikis,
    CONSTELLATION_FETCH_CONCURRENCY,
    async (targetWiki) => {
      const targetDid = wikiOwnerDid.get(wikiKey(targetWiki.handle, targetWiki.slug))
      if (!targetDid) return

      const targetUri = `at://${targetDid}/wiki.lichen.wiki/${targetWiki.slug}`
      const backlinks = await fetchBacklinks({
        target: targetUri,
        collection: COLLECTIONS.bookmark,
        path: '.wikiRef',
        limit: 50,
      })

      for (const record of backlinks.linking_records) {
        if (record.did === targetDid) continue

        const sourceWikis = didToWikis.get(record.did)
        if (!sourceWikis?.length) continue

        const fromWiki = sourceWikis[0]!
        if (fromWiki.handle === targetWiki.handle && fromWiki.slug === targetWiki.slug) continue

        const pair = `${wikiKey(fromWiki.handle, fromWiki.slug)}->${wikiKey(targetWiki.handle, targetWiki.slug)}`
        if (seenPairs.has(pair)) continue
        seenPairs.add(pair)

        const bookmarkerHandle = await resolveDidToHandle(record.did)
        const label = bookmarkerHandle
          ? `Bookmarked by @${bookmarkerHandle}`
          : 'Bookmarked on the network'

        edges.push({
          from: fromWiki,
          to: targetWiki,
          label,
          source: 'network',
        })
      }
    },
  )

  return edges
}
