import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { BROWSE_CACHE_TTL_MS } from '@/lib/cache-constants'
import type { PublicWikiCacheEntry } from '@/lib/lichen/wiki-cache'

export type WikiAccess = 'public' | 'private'

export interface StoredWikiEntry extends PublicWikiCacheEntry {
  pinned: boolean
  access: WikiAccess
  pdsUrl: string | null
}

interface WikiStoreSchema extends DBSchema {
  wikis: {
    key: string
    value: StoredWikiEntry
    indexes: { pinned: number }
  }
  media: {
    key: string
    value: { url: string; blob: Blob; fetchedAt: number }
  }
}

const DB_NAME = 'pckt-wiki-offline'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<WikiStoreSchema>> | null = null

function getDb(): Promise<IDBPDatabase<WikiStoreSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<WikiStoreSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const wikiStore = db.createObjectStore('wikis', { keyPath: 'key' })
        wikiStore.createIndex('pinned', 'pinned')
        db.createObjectStore('media', { keyPath: 'url' })
      },
    })
  }
  return dbPromise
}

export function wikiStoreKey(handle: string, slug: string): string {
  return `${handle.replace(/^@/, '').toLowerCase()}:${slug}`
}

export async function getWiki(
  handle: string,
  slug: string,
  maxAgeMs = BROWSE_CACHE_TTL_MS,
  allowStale = false,
): Promise<StoredWikiEntry | null> {
  try {
    const db = await getDb()
    const entry = await db.get('wikis', wikiStoreKey(handle, slug))
    if (!entry) return null
    const age = Date.now() - entry.fetchedAt
    if (!allowStale && age > maxAgeMs) return null
    return entry
  } catch {
    return null
  }
}

export async function putWiki(
  entry: PublicWikiCacheEntry,
  options?: { pinned?: boolean; access?: WikiAccess; pdsUrl?: string | null },
): Promise<void> {
  try {
    const db = await getDb()
    const key = wikiStoreKey(entry.handle, entry.slug)
    const existing = await db.get('wikis', key)
    const stored: StoredWikiEntry & { key: string } = {
      key,
      ...entry,
      pinned: options?.pinned ?? existing?.pinned ?? false,
      access: options?.access ?? existing?.access ?? 'public',
      pdsUrl: options?.pdsUrl ?? existing?.pdsUrl ?? null,
    }
    await db.put('wikis', stored)
  } catch {
    // IndexedDB unavailable or quota exceeded
  }
}

export async function listPinned(): Promise<StoredWikiEntry[]> {
  try {
    const db = await getDb()
    const all = await db.getAllFromIndex('wikis', 'pinned')
    return all.filter((entry) => entry.pinned)
  } catch {
    return []
  }
}

export async function listCached(): Promise<StoredWikiEntry[]> {
  try {
    const db = await getDb()
    return db.getAll('wikis')
  } catch {
    return []
  }
}

export async function setPinned(handle: string, slug: string, pinned: boolean): Promise<void> {
  try {
    const db = await getDb()
    const key = wikiStoreKey(handle, slug)
    const entry = await db.get('wikis', key)
    if (!entry) return
    await db.put('wikis', { ...entry, pinned })
  } catch {
    // ignore
  }
}

export async function isPinned(handle: string, slug: string): Promise<boolean> {
  const entry = await getWiki(handle, slug, Infinity, true)
  return entry?.pinned ?? false
}

export async function deleteWiki(handle: string, slug: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete('wikis', wikiStoreKey(handle, slug))
  } catch {
    // ignore
  }
}

export async function putMediaBlob(url: string, blob: Blob): Promise<void> {
  try {
    const db = await getDb()
    await db.put('media', { url, blob, fetchedAt: Date.now() })
  } catch {
    // ignore
  }
}

export async function getMediaBlob(url: string): Promise<Blob | null> {
  try {
    const db = await getDb()
    const entry = await db.get('media', url)
    return entry?.blob ?? null
  } catch {
    return null
  }
}
