import { wikiPath } from '@/data/featured-wikis'
import { GLOBAL_SEARCH_ARTICLE_BUDGET, WIKI_FETCH_CONCURRENCY } from '@/lib/cache-constants'
import { runSettledWithConcurrency } from '@/lib/concurrency'
import { getCachedActorAvatar, preloadActorAvatars } from '@/lib/atproto/actor-avatars'
import { isAtprotoBlobUrl, resolveBlobDisplayUrl } from '@/lib/atproto/blobs'
import { loadPublicWikiData } from '@/lib/lichen/load-public-wiki'
import { extractFirstImageUrl } from '@/lib/lichen/note-images'
import { searchWikiNotes } from '@/lib/lichen/search'
import { loadWikiDirectory, type DirectoryWiki } from '@/lib/lichen/wiki-directory'
import type { LichenNoteWithContent } from '@/types/lichen'

export interface GlobalSearchWiki {
  handle: string
  slug: string
  name: string
  description: string
  pdsHost: string
  accentColor: string
  /** Owner DID — used to resolve `blob:cid` thumbnails to getBlob URLs. */
  did: string
}

/**
 * Built in two phases. Wiki metadata covers the whole network and is cheap
 * enough to hold at once; article bodies are two paginated repo reads per wiki,
 * so they are filled in behind the query rather than up front. `indexedWikis`
 * records which wikis have had that second phase run, which is what separates
 * "no articles matched" from "articles not fetched yet".
 */
export interface GlobalSearchIndex {
  wikis: GlobalSearchWiki[]
  notesByWiki: Map<string, LichenNoteWithContent[]>
  indexedWikis: Set<string>
  noteThumbnails: Map<string, string>
  wikiThumbnails: Map<string, string>
  authorAvatars: Map<string, string>
  loadedAt: string
}

export type GlobalSearchResult =
  | {
      kind: 'wiki'
      wiki: GlobalSearchWiki
      score: number
      thumbnailUrl?: string
    }
  | {
      kind: 'note'
      wiki: GlobalSearchWiki
      note: LichenNoteWithContent
      snippet: string
      score: number
      thumbnailUrl?: string
    }

export function wikiKey(handle: string, slug: string): string {
  return `${handle.toLowerCase()}:${slug}`
}

function toSearchWiki(wiki: DirectoryWiki): GlobalSearchWiki {
  return {
    handle: wiki.handle,
    slug: wiki.slug,
    name: wiki.name,
    description: wiki.description,
    pdsHost: wiki.pdsHost,
    accentColor: wiki.accentColor,
    did: wiki.did,
  }
}

async function resolveSearchImageUrl(did: string, image: string): Promise<string | null> {
  const trimmed = image.trim()
  if (!trimmed || !did) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (!isAtprotoBlobUrl(trimmed)) return null
  try {
    return await resolveBlobDisplayUrl(did, trimmed)
  } catch {
    return null
  }
}

function findWikiThumbnail(notes: LichenNoteWithContent[]): string | null {
  const home = notes.find((note) => note.slug === 'home')
  if (home) {
    const image = extractFirstImageUrl(home.content)
    if (image) return image
  }

  for (const note of notes) {
    const image = extractFirstImageUrl(note.content)
    if (image) return image
  }

  return null
}

function resolveThumbnail(
  index: GlobalSearchIndex,
  wiki: GlobalSearchWiki,
  note?: LichenNoteWithContent,
): string | undefined {
  if (note) {
    return (
      index.noteThumbnails.get(note.uri) ??
      index.authorAvatars.get(wiki.handle.toLowerCase()) ??
      index.wikiThumbnails.get(wikiKey(wiki.handle, wiki.slug))
    )
  }

  return (
    index.wikiThumbnails.get(wikiKey(wiki.handle, wiki.slug)) ??
    index.authorAvatars.get(wiki.handle.toLowerCase())
  )
}

async function loadWikiNotes(handle: string, slug: string): Promise<LichenNoteWithContent[]> {
  try {
    const data = await loadPublicWikiData(handle, slug)
    return data.notesWithContent
  } catch {
    return []
  }
}

/**
 * Phase one: every public wiki the relay knows about, metadata only. Fast
 * enough to answer "does this wiki exist" for the whole network.
 */
export async function loadGlobalSearchIndex(): Promise<GlobalSearchIndex> {
  const directory = await loadWikiDirectory()

  return {
    wikis: directory.map(toSearchWiki),
    notesByWiki: new Map(),
    indexedWikis: new Set(),
    noteThumbnails: new Map(),
    wikiThumbnails: new Map(),
    authorAvatars: new Map(),
    loadedAt: new Date().toISOString(),
  }
}

/**
 * Picks which wikis are worth spending the article budget on for this query.
 * Wikis whose own name or description already matches are indexed first — a
 * query that names a wiki almost always wants that wiki's articles too.
 */
export function selectArticleTargets(
  index: GlobalSearchIndex,
  query: string,
  budget = GLOBAL_SEARCH_ARTICLE_BUDGET,
): GlobalSearchWiki[] {
  const terms = queryTerms(query)
  if (!terms.length) return []

  const pending = index.wikis.filter(
    (wiki) => !index.indexedWikis.has(wikiKey(wiki.handle, wiki.slug)),
  )

  return pending
    .map((wiki) => ({ wiki, score: scoreWiki(wiki, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, budget)
    .map((entry) => entry.wiki)
}

/**
 * Phase two: pull articles for a subset of wikis and fold them into a new index
 * object. Returns a fresh object rather than mutating so reactive consumers see
 * the change.
 */
export async function indexArticlesFor(
  index: GlobalSearchIndex,
  wikis: GlobalSearchWiki[],
): Promise<GlobalSearchIndex> {
  if (!wikis.length) return index

  const results = await runSettledWithConcurrency(wikis, WIKI_FETCH_CONCURRENCY, (wiki) =>
    loadWikiNotes(wiki.handle, wiki.slug),
  )

  const notesByWiki = new Map(index.notesByWiki)
  const indexedWikis = new Set(index.indexedWikis)
  const noteThumbnails = new Map(index.noteThumbnails)
  const wikiThumbnails = new Map(index.wikiThumbnails)

  for (let i = 0; i < results.length; i++) {
    const wiki = wikis[i]!
    const key = wikiKey(wiki.handle, wiki.slug)
    indexedWikis.add(key)

    const result = results[i]
    if (result?.status !== 'fulfilled') continue

    const notes = result.value
    notesByWiki.set(key, notes)

    for (const note of notes) {
      const image = extractFirstImageUrl(note.content)
      if (image) {
        const resolved = await resolveSearchImageUrl(wiki.did, image)
        if (resolved) noteThumbnails.set(note.uri, resolved)
      }
    }

    const wikiImage = findWikiThumbnail(notes)
    if (wikiImage) {
      const resolved = await resolveSearchImageUrl(wiki.did, wikiImage)
      if (resolved) wikiThumbnails.set(key, resolved)
    }
  }

  const authorAvatars = await loadAuthorAvatars(index.authorAvatars, wikis)

  return {
    ...index,
    notesByWiki,
    indexedWikis,
    noteThumbnails,
    wikiThumbnails,
    authorAvatars,
    loadedAt: new Date().toISOString(),
  }
}

async function loadAuthorAvatars(
  existing: Map<string, string>,
  wikis: GlobalSearchWiki[],
): Promise<Map<string, string>> {
  // Avatars cost a profile lookup each, so they follow the article budget
  // rather than covering every handle in the directory.
  const handles = wikis.map((wiki) => wiki.handle).filter((handle) => !handle.startsWith('did:'))
  if (!handles.length) return existing

  try {
    await preloadActorAvatars(handles)
  } catch {
    return existing
  }

  const avatars = new Map(existing)
  for (const handle of handles) {
    const url = getCachedActorAvatar(handle)
    if (url) avatars.set(handle.toLowerCase(), url)
  }
  return avatars
}

function queryTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

function scoreWiki(wiki: GlobalSearchWiki, terms: string[]): number {
  const name = wiki.name.toLowerCase()
  const desc = wiki.description.toLowerCase()
  const handle = wiki.handle.toLowerCase()
  const slug = wiki.slug.toLowerCase()
  const pds = wiki.pdsHost.toLowerCase()

  let score = 0
  for (const term of terms) {
    if (slug === term || name === term) score += 100
    if (name.includes(term)) score += 60
    if (slug.includes(term)) score += 40
    if (handle.includes(term)) score += 35
    if (desc.includes(term)) score += 25
    if (pds.includes(term)) score += 15
  }
  return score
}

export function searchGlobalIndex(
  index: GlobalSearchIndex,
  query: string,
  limit = 10,
): GlobalSearchResult[] {
  const terms = queryTerms(query)
  if (terms.length === 0) return []

  const results: GlobalSearchResult[] = []

  for (const wiki of index.wikis) {
    const wikiScore = scoreWiki(wiki, terms)
    if (wikiScore > 0) {
      results.push({
        kind: 'wiki',
        wiki,
        score: wikiScore,
        thumbnailUrl: resolveThumbnail(index, wiki),
      })
    }

    const notes = index.notesByWiki.get(wikiKey(wiki.handle, wiki.slug))
    if (!notes?.length) continue

    for (const noteResult of searchWikiNotes(notes, query, 5)) {
      results.push({
        kind: 'note',
        wiki,
        note: noteResult.note,
        snippet: noteResult.snippet,
        score: noteResult.score,
        thumbnailUrl: resolveThumbnail(index, wiki, noteResult.note),
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function resultPath(result: GlobalSearchResult): string {
  if (result.kind === 'wiki') {
    return wikiPath(result.wiki.handle, result.wiki.slug)
  }
  return `${wikiPath(result.wiki.handle, result.wiki.slug)}/${encodeURIComponent(result.note.slug)}`
}
