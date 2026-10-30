import { BROWSE_CACHE_TTL_MS } from '@/lib/cache-constants'
import {
  getWiki as getStoredWiki,
  putWiki,
  setPinned,
  isPinned,
  listPinned,
  listCached,
  deleteWiki as deleteStoredWiki,
  type StoredWikiEntry,
  type WikiAccess,
} from '@/lib/offline/wiki-store'
import type {
  LichenNoteRecord,
  LichenNoteWithContent,
  LichenRevisionRecord,
  LichenWikiRecord,
} from '@/types/lichen'

const STORAGE_PREFIX = 'pckt.wiki.public-wiki.'

export interface PublicWikiCacheEntry {
  handle: string
  slug: string
  did: string
  wiki: LichenWikiRecord | null
  noteRecords: LichenNoteRecord[]
  revisionRecords: LichenRevisionRecord[]
  notesWithContent: LichenNoteWithContent[]
  fetchedAt: number
}

export type { StoredWikiEntry, WikiAccess }

const memory = new Map<string, PublicWikiCacheEntry>()

export function publicWikiCacheKey(handle: string, slug: string): string {
  return `${handle.replace(/^@/, '').toLowerCase()}:${slug}`
}

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`
}

function readStorage(key: string): PublicWikiCacheEntry | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(key))
    if (!raw) return null
    return JSON.parse(raw) as PublicWikiCacheEntry
  } catch {
    return null
  }
}

function writeStorage(key: string, entry: PublicWikiCacheEntry): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry))
  } catch {
    // sessionStorage full or unavailable
  }
}

export function getPublicWikiCache(
  handle: string,
  slug: string,
  maxAgeMs = BROWSE_CACHE_TTL_MS,
): PublicWikiCacheEntry | null {
  const key = publicWikiCacheKey(handle, slug)
  const now = Date.now()

  const mem = memory.get(key)
  if (mem && now - mem.fetchedAt < maxAgeMs) {
    return mem
  }

  const stored = readStorage(key)
  if (stored && now - stored.fetchedAt < maxAgeMs) {
    memory.set(key, stored)
    return stored
  }

  return null
}

export async function loadPublicWikiCache(
  handle: string,
  slug: string,
  options?: { maxAgeMs?: number; allowStale?: boolean },
): Promise<StoredWikiEntry | null> {
  const maxAgeMs = options?.maxAgeMs ?? BROWSE_CACHE_TTL_MS
  const fresh = getPublicWikiCache(handle, slug, maxAgeMs)
  if (fresh) {
    const stored = await getStoredWiki(handle, slug, maxAgeMs, options?.allowStale)
    if (stored) return stored
    return {
      ...fresh,
      pinned: false,
      access: 'public',
      pdsUrl: null,
    }
  }

  const stored = await getStoredWiki(handle, slug, maxAgeMs, options?.allowStale)
  if (stored) {
    memory.set(publicWikiCacheKey(handle, slug), stored)
    writeStorage(publicWikiCacheKey(handle, slug), stored)
  }
  return stored
}

export function setPublicWikiCache(
  entry: PublicWikiCacheEntry,
  options?: { pinned?: boolean; access?: WikiAccess; pdsUrl?: string | null },
): void {
  const key = publicWikiCacheKey(entry.handle, entry.slug)
  memory.set(key, entry)
  writeStorage(key, entry)
  void putWiki(entry, options)
}

export function clearPublicWikiCache(handle: string, slug: string): void {
  const key = publicWikiCacheKey(handle, slug)
  memory.delete(key)
  try {
    sessionStorage.removeItem(storageKey(key))
  } catch {
    // ignore
  }
  void deleteStoredWiki(handle, slug)
}

export { setPinned, isPinned, listPinned, listCached }

export function viewingCachedCopy(entry: PublicWikiCacheEntry | null): boolean {
  if (!entry) return false
  return Date.now() - entry.fetchedAt > BROWSE_CACHE_TTL_MS || !navigator.onLine
}
