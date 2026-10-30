import { Agent } from '@atproto/api'
import { listWikis } from '@/lib/atproto/lichen'
import { resolveDidDoc } from '@/lib/atproto/pds'
import { listReposByCollection } from '@/lib/atproto/relay'
import { WIKI_DIRECTORY_CONCURRENCY, WIKI_DIRECTORY_TTL_MS } from '@/lib/cache-constants'
import { runSettledWithConcurrency } from '@/lib/concurrency'
import { accentColorForSlug, listFeaturedWikiReferences } from '@/lib/lichen/featured-wiki-loader'
import { COLLECTIONS } from '@/lib/lichen/collections'
import { createRetryFetch } from '@/lib/http-retry'
import type { LichenWikiRecord } from '@/types/lichen'

/**
 * Every public wiki on the network, as far as the relay knows about it. This is
 * deliberately metadata-only: names and descriptions are small enough to hold
 * for the whole network at once, where article bodies are not.
 */
export interface DirectoryWiki {
  did: string
  /** Handle when the DID document declares one, otherwise the DID itself. */
  handle: string
  slug: string
  name: string
  description: string
  /** Domain the wiki is published under — shown to distinguish same-named wikis. */
  pdsHost: string
  accentColor: string
  createdAt: string
}

const STORAGE_KEY = 'pckt.wiki.wiki-directory'

interface StoredDirectory {
  wikis: DirectoryWiki[]
  fetchedAt: number
}

let memoryCache: StoredDirectory | null = null
let inflight: Promise<DirectoryWiki[]> | null = null

export function pdsHostFromHandle(handle: string): string {
  const labels = handle.split('.')
  // A two-label handle is already its own domain — dropping the first label
  // would leave a bare TLD ("j3s.sh" shown as "sh"). Longer handles are a
  // subdomain of the host that issued them, which is the part worth showing.
  if (labels.length <= 2) return handle
  return labels.slice(1).join('.')
}

export function directoryKey(handle: string, slug: string): string {
  return `${handle.toLowerCase()}:${slug}`
}

function readStored(): StoredDirectory | null {
  if (memoryCache) return memoryCache
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDirectory
    if (!Array.isArray(parsed?.wikis) || typeof parsed.fetchedAt !== 'number') return null
    memoryCache = parsed
    return parsed
  } catch {
    return null
  }
}

function writeStored(wikis: DirectoryWiki[]): void {
  const entry: StoredDirectory = { wikis, fetchedAt: Date.now() }
  memoryCache = entry

  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage full or unavailable — the memory cache still serves this session.
  }
}

function isPublishedWiki(wiki: LichenWikiRecord): boolean {
  // Same rules loadPublicWikiData applies, so the directory never advertises a
  // wiki that would then refuse to open.
  return wiki.visibility === 'public' && !wiki.deletedAt && !wiki.redirectSlug
}

function toDirectoryWiki(wiki: LichenWikiRecord, did: string, handle: string): DirectoryWiki {
  return {
    did,
    handle,
    slug: wiki.slug,
    name: wiki.name,
    description: wiki.description ?? '',
    pdsHost: pdsHostFromHandle(handle),
    accentColor: wiki.accentColor ?? accentColorForSlug(wiki.slug),
    createdAt: wiki.createdAt,
  }
}

async function loadRepoWikis(did: string): Promise<DirectoryWiki[]> {
  const { pdsUrl, handle } = await resolveDidDoc(did)
  const agent = new Agent({ service: pdsUrl, fetch: createRetryFetch() })
  const wikis = await listWikis(agent, did)

  return wikis.filter(isPublishedWiki).map((wiki) => toDirectoryWiki(wiki, did, handle ?? did))
}

/**
 * Featured entries are merged in by handle rather than crawled, so a wiki stays
 * findable even if its PDS is not federated with the relay we query.
 */
function mergeFeaturedPlaceholders(wikis: DirectoryWiki[]): DirectoryWiki[] {
  const byKey = new Map(wikis.map((wiki) => [directoryKey(wiki.handle, wiki.slug), wiki]))

  for (const ref of listFeaturedWikiReferences()) {
    const key = directoryKey(ref.handle, ref.slug)
    if (byKey.has(key)) continue

    byKey.set(key, {
      did: '',
      handle: ref.handle,
      slug: ref.slug,
      name: ref.slug,
      description: '',
      pdsHost: pdsHostFromHandle(ref.handle),
      accentColor: accentColorForSlug(ref.slug),
      createdAt: '',
    })
  }

  return [...byKey.values()]
}

export function getCachedWikiDirectory(): DirectoryWiki[] | null {
  const stored = readStored()
  if (!stored) return null
  if (Date.now() - stored.fetchedAt > WIKI_DIRECTORY_TTL_MS) return null
  return stored.wikis
}

export async function loadWikiDirectory(options?: { force?: boolean }): Promise<DirectoryWiki[]> {
  if (!options?.force) {
    const cached = getCachedWikiDirectory()
    if (cached) return cached
    if (inflight) return inflight
  }

  const run = (async () => {
    const dids = await listReposByCollection(COLLECTIONS.wiki)

    const results = await runSettledWithConcurrency(dids, WIKI_DIRECTORY_CONCURRENCY, (did) =>
      loadRepoWikis(did),
    )

    const wikis: DirectoryWiki[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') wikis.push(...result.value)
    }

    const merged = mergeFeaturedPlaceholders(wikis)
    writeStored(merged)
    return merged
  })()

  inflight = run
  try {
    return await run
  } catch (err) {
    // A failed crawl falls back to whatever is on disk, however stale, rather
    // than collapsing search back to nothing.
    const stale = readStored()
    if (stale?.wikis.length) return stale.wikis
    throw err
  } finally {
    if (inflight === run) inflight = null
  }
}
