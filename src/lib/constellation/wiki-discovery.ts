import { loadFeaturedWikis } from '@/data/featured-wikis'
import { loadPublicWikiData } from '@/lib/lichen/load-public-wiki'
import { fetchLinksAll } from '@/lib/constellation/client'

export interface DiscoveredWiki {
  handle: string
  slug: string
  name: string
  noteCount: number
  source: 'featured' | 'constellation' | 'recent'
  lastActive?: string
}

export async function discoverRecentWikis(limit = 20): Promise<DiscoveredWiki[]> {
  const featuredWikis = await loadFeaturedWikis()
  const discovered = new Map<string, DiscoveredWiki>()

  for (const wiki of featuredWikis) {
    discovered.set(`${wiki.handle}:${wiki.slug}`, {
      handle: wiki.handle,
      slug: wiki.slug,
      name: wiki.name,
      noteCount: wiki.noteCount,
      source: 'featured',
    })
  }

  for (const seed of featuredWikis.slice(0, 4)) {
    try {
      const entry = await loadPublicWikiData(seed.handle, seed.slug)
      if (!entry.wiki) continue

      const links = await fetchLinksAll(entry.wiki.uri)
      for (const [collection, sources] of Object.entries(links.links)) {
        if (!collection.includes('wiki.lichen')) continue
        for (const [did] of Object.entries(sources)) {
          const key = `${did}:unknown`
          if (!discovered.has(key)) {
            discovered.set(key, {
              handle: did.slice(0, 12) + '…',
              slug: 'wiki',
              name: `Wiki on ${did.slice(0, 12)}…`,
              noteCount: 0,
              source: 'constellation',
            })
          }
        }
      }
    } catch {
      // seed unavailable
    }
  }

  const recent: DiscoveredWiki[] = []
  for (const wiki of featuredWikis) {
    try {
      const entry = await loadPublicWikiData(wiki.handle, wiki.slug, { force: true })
      const latest = entry.revisionRecords
        .map((r) => r.createdAt)
        .sort()
        .at(-1)
      recent.push({
        handle: wiki.handle,
        slug: wiki.slug,
        name: entry.wiki?.name ?? wiki.name,
        noteCount: entry.notesWithContent.length,
        source: 'recent',
        lastActive: latest,
      })
    } catch {
      recent.push({
        handle: wiki.handle,
        slug: wiki.slug,
        name: wiki.name,
        noteCount: wiki.noteCount,
        source: 'featured',
      })
    }
  }

  recent.sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? ''))

  for (const item of recent) {
    discovered.set(`${item.handle}:${item.slug}`, item)
  }

  return [...discovered.values()]
    .filter((w) => w.source !== 'constellation' || w.noteCount > 0)
    .slice(0, limit)
}
