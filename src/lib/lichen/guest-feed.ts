import {
  GUEST_FEED_RELATIONS,
  GUEST_FEED_WIKIS,
  findGuestFeedWiki,
  wikiKey,
  type GuestFeedWiki,
} from '@/data/guest-feed'
import {
  accentColorForSlug,
  findCachedFeaturedWiki,
  loadFeaturedWikis,
} from '@/data/featured-wikis'
import { WIKI_FETCH_CONCURRENCY } from '@/lib/cache-constants'
import { runSettledWithConcurrency } from '@/lib/concurrency'
import { discoverConstellationEdges } from '@/lib/constellation/guest-feed-edges'
import { guestFeedNetworkWarning, isRateLimitError } from '@/lib/http-retry'
import { loadPublicWikiData } from '@/lib/lichen/load-public-wiki'
import { listRecentChanges, type RecentChange } from '@/lib/lichen/recent-changes'
import { extractWikilinks } from '@/lib/lichen/wikilinks'
import { parseNoteContent } from '@/lib/lichen/content-meta'
import type { LichenNoteWithContent } from '@/types/lichen'

export interface GuestFeedWikiDisplay extends GuestFeedWiki {
  name: string
  accentColor: string
  pdsHost: string
}

export interface GuestFeedItem extends RecentChange {
  wiki: GuestFeedWikiDisplay
  snippet: string
}

export type WikiRelationSource = 'curated' | 'wikilink' | 'network'

export interface WikiGraphEdge {
  from: GuestFeedWikiDisplay
  to: GuestFeedWikiDisplay
  label: string
  source: WikiRelationSource
  /** Note that contains the wikilink, when source is wikilink */
  viaNote?: { title: string; slug: string }
}

export interface GuestFeedSnapshot {
  items: GuestFeedItem[]
  wikis: GuestFeedWikiDisplay[]
  edges: WikiGraphEdge[]
  fetchedAt: string
  networkWarning: string | null
  rateLimited: boolean
}

function pdsHostFromHandle(handle: string): string {
  const dot = handle.indexOf('.')
  return dot >= 0 ? handle.slice(dot + 1) : handle
}

export function enrichGuestFeedWiki(wiki: GuestFeedWiki): GuestFeedWikiDisplay {
  const featured = findCachedFeaturedWiki(wiki.handle, wiki.slug)

  return {
    ...wiki,
    name: featured?.name ?? wiki.slug,
    accentColor: featured?.accentColor ?? accentColorForSlug(wiki.slug),
    pdsHost: pdsHostFromHandle(wiki.handle),
  }
}

function noteSnippet(note: LichenNoteWithContent, maxLen = 140): string {
  const parsed = parseNoteContent(note.content)
  const text = parsed.body.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen).trim()}…`
}

async function loadWikiNotesAndChanges(
  wiki: GuestFeedWikiDisplay,
  changeLimit: number,
  force?: boolean,
): Promise<{ changes: GuestFeedItem[]; notes: LichenNoteWithContent[] }> {
  const data = await loadPublicWikiData(wiki.handle, wiki.slug, { force })
  if (!data.wiki) {
    return { changes: [], notes: [] }
  }

  const changes = listRecentChanges(data.revisionRecords, data.notesWithContent, changeLimit)

  return {
    notes: data.notesWithContent,
    changes: changes.map((change) => ({
      ...change,
      wiki,
      snippet: noteSnippet(change.note),
    })),
  }
}

function discoverWikilinkEdges(
  wikis: GuestFeedWikiDisplay[],
  notesByWiki: Map<string, LichenNoteWithContent[]>,
): WikiGraphEdge[] {
  const wikiByKey = new Map(wikis.map((wiki) => [wikiKey(wiki.handle, wiki.slug), wiki]))
  const seen = new Set<string>()
  const edges: WikiGraphEdge[] = []

  for (const sourceWiki of wikis) {
    const notes = notesByWiki.get(wikiKey(sourceWiki.handle, sourceWiki.slug)) ?? []

    for (const note of notes) {
      const links = extractWikilinks(note.content, sourceWiki.slug)

      for (const link of links) {
        if (!link.ownerHandle || !link.wikiSlug) continue

        const target = findGuestFeedWiki(link.ownerHandle, link.wikiSlug)
        if (!target) continue
        if (target.handle === sourceWiki.handle && target.slug === sourceWiki.slug) continue

        const targetDisplay = wikiByKey.get(wikiKey(target.handle, target.slug))
        if (!targetDisplay) continue

        const edgeKey = `${wikiKey(sourceWiki.handle, sourceWiki.slug)}->${wikiKey(target.handle, target.slug)}:${note.slug}`
        if (seen.has(edgeKey)) continue
        seen.add(edgeKey)

        edges.push({
          from: sourceWiki,
          to: targetDisplay,
          label: link.noteSlug ? `Links to ${link.noteSlug}` : 'Cross-wiki link',
          source: 'wikilink',
          viaNote: { title: note.title, slug: note.slug },
        })
      }
    }
  }

  return edges
}

function curatedEdges(wikis: GuestFeedWikiDisplay[]): WikiGraphEdge[] {
  const wikiByKey = new Map(wikis.map((wiki) => [wikiKey(wiki.handle, wiki.slug), wiki]))
  const edges: WikiGraphEdge[] = []

  for (const relation of GUEST_FEED_RELATIONS) {
    const from = wikiByKey.get(wikiKey(relation.from.handle, relation.from.slug))
    const to = wikiByKey.get(wikiKey(relation.to.handle, relation.to.slug))
    if (!from || !to) continue

    edges.push({
      from,
      to,
      label: relation.label,
      source: 'curated',
    })
  }

  return edges
}

export function mergeGuestFeedEdges(
  curated: WikiGraphEdge[],
  discovered: WikiGraphEdge[],
  network: WikiGraphEdge[],
): WikiGraphEdge[] {
  const merged = [...curated]
  const seenPairs = new Set(
    curated.map((edge) => `${wikiKey(edge.from.handle, edge.from.slug)}->${wikiKey(edge.to.handle, edge.to.slug)}`),
  )

  for (const edge of [...discovered, ...network]) {
    const pair = `${wikiKey(edge.from.handle, edge.from.slug)}->${wikiKey(edge.to.handle, edge.to.slug)}`
    if (!seenPairs.has(pair)) {
      seenPairs.add(pair)
      merged.push(edge)
    }
  }

  return merged
}

export async function fetchGuestFeedNetworkEdges(
  wikis: GuestFeedWikiDisplay[],
): Promise<WikiGraphEdge[]> {
  return discoverConstellationEdges(wikis)
}

interface GuestFeedCoreResult {
  items: GuestFeedItem[]
  wikis: GuestFeedWikiDisplay[]
  edges: WikiGraphEdge[]
  notesByWiki: Map<string, LichenNoteWithContent[]>
  failedWikiCount: number
  sawRateLimit: boolean
}

export async function fetchGuestFeedCore(options?: {
  changeLimitPerWiki?: number
  totalLimit?: number
  wikis?: GuestFeedWiki[]
  force?: boolean
}): Promise<GuestFeedCoreResult> {
  await loadFeaturedWikis({ force: options?.force })

  const changeLimitPerWiki = options?.changeLimitPerWiki ?? 5
  const totalLimit = options?.totalLimit ?? 24
  const sourceWikis = options?.wikis ?? GUEST_FEED_WIKIS
  const wikis = sourceWikis.map(enrichGuestFeedWiki)

  const results = await runSettledWithConcurrency(
    wikis,
    WIKI_FETCH_CONCURRENCY,
    (wiki) => loadWikiNotesAndChanges(wiki, changeLimitPerWiki, options?.force),
  )

  const notesByWiki = new Map<string, LichenNoteWithContent[]>()
  const allChanges: GuestFeedItem[] = []
  let failedWikiCount = 0
  let sawRateLimit = false

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const wiki = wikis[i]!
    if (result.status !== 'fulfilled') {
      failedWikiCount++
      if (isRateLimitError(result.reason)) {
        sawRateLimit = true
      }
      continue
    }

    notesByWiki.set(wikiKey(wiki.handle, wiki.slug), result.value.notes)
    allChanges.push(...result.value.changes)
  }

  allChanges.sort((a, b) => b.revision.createdAt.localeCompare(a.revision.createdAt))

  const curated = curatedEdges(wikis)
  const discovered = discoverWikilinkEdges(wikis, notesByWiki)
  const items = allChanges.slice(0, totalLimit)

  return {
    items,
    wikis,
    edges: mergeGuestFeedEdges(curated, discovered, []),
    notesByWiki,
    failedWikiCount,
    sawRateLimit,
  }
}

export function buildGuestFeedSnapshot(
  core: GuestFeedCoreResult,
  network: WikiGraphEdge[],
  constellationDegraded: boolean,
): GuestFeedSnapshot {
  const networkStatus = guestFeedNetworkWarning({
    failedWikiCount: core.failedWikiCount,
    totalWikiCount: core.wikis.length,
    sawRateLimit: core.sawRateLimit || constellationDegraded,
    hasItems: core.items.length > 0,
    constellationDegraded,
  })

  const curated = core.edges.filter((edge) => edge.source === 'curated')
  const discovered = core.edges.filter((edge) => edge.source === 'wikilink')

  return {
    items: core.items,
    wikis: core.wikis,
    edges: mergeGuestFeedEdges(curated, discovered, network),
    fetchedAt: new Date().toISOString(),
    networkWarning: networkStatus.message,
    rateLimited: networkStatus.rateLimited,
  }
}

export async function fetchGuestFeed(options?: {
  changeLimitPerWiki?: number
  totalLimit?: number
  wikis?: GuestFeedWiki[]
  includeNetworkEdges?: boolean
  force?: boolean
}): Promise<GuestFeedSnapshot> {
  const core = await fetchGuestFeedCore(options)

  if (options?.includeNetworkEdges === false) {
    return buildGuestFeedSnapshot(core, [], false)
  }

  let constellationDegraded = false
  const network = await discoverConstellationEdges(core.wikis).catch((err) => {
    if (isRateLimitError(err)) {
      constellationDegraded = true
    }
    return [] as WikiGraphEdge[]
  })

  if (constellationDegraded) {
    core.sawRateLimit = true
  }

  return buildGuestFeedSnapshot(core, network, constellationDegraded)
}

export function filterFeedByTopic(items: GuestFeedItem[], topicId: string | null): GuestFeedItem[] {
  if (!topicId) return items
  return items.filter((item) => item.wiki.topics.includes(topicId))
}

export function wikisForTopic(wikis: GuestFeedWikiDisplay[], topicId: string | null): GuestFeedWikiDisplay[] {
  if (!topicId) return wikis
  return wikis.filter((wiki) => wiki.topics.includes(topicId))
}

export function edgesForTopic(edges: WikiGraphEdge[], topicId: string | null): WikiGraphEdge[] {
  if (!topicId) return edges
  return edges.filter(
    (edge) => edge.from.topics.includes(topicId) || edge.to.topics.includes(topicId),
  )
}
