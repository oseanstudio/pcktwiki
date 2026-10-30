import { HANDLE_CACHE_TTL_MS } from '@/lib/cache-constants'

const STORAGE_KEY = 'pckt.wiki.handle-cache'
const DID_STORAGE_KEY = 'pckt.wiki.did-handle-cache'
const PDS_STORAGE_KEY = 'pckt.wiki.pds-cache'

interface HandleCacheEntry {
  did: string
  expiresAt: number
}

interface DidHandleCacheEntry {
  handle: string
  expiresAt: number
}

type HandleCacheStore = Record<string, HandleCacheEntry>
type DidHandleCacheStore = Record<string, DidHandleCacheEntry>

const memory = new Map<string, HandleCacheEntry>()
const didMemory = new Map<string, DidHandleCacheEntry>()

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, '').toLowerCase()
}

function readStorage(): HandleCacheStore {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as HandleCacheStore
  } catch {
    return {}
  }
}

function writeStorage(store: HandleCacheStore): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // sessionStorage full or unavailable
  }
}

function pruneStore(store: HandleCacheStore): HandleCacheStore {
  const now = Date.now()
  const next: HandleCacheStore = {}
  for (const [key, entry] of Object.entries(store)) {
    if (entry.expiresAt > now) {
      next[key] = entry
    }
  }
  return next
}

export function getCachedDid(handle: string): string | null {
  const key = normalizeHandle(handle)
  const now = Date.now()

  const mem = memory.get(key)
  if (mem && mem.expiresAt > now) {
    return mem.did
  }

  const store = pruneStore(readStorage())
  const stored = store[key]
  if (stored && stored.expiresAt > now) {
    memory.set(key, stored)
    return stored.did
  }

  return null
}

export function setCachedDid(handle: string, did: string): void {
  const key = normalizeHandle(handle)
  const entry: HandleCacheEntry = {
    did,
    expiresAt: Date.now() + HANDLE_CACHE_TTL_MS,
  }

  memory.set(key, entry)

  const store = pruneStore(readStorage())
  store[key] = entry
  writeStorage(store)

  setCachedHandle(did, handle)
}

function readDidStorage(): DidHandleCacheStore {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(DID_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as DidHandleCacheStore
  } catch {
    return {}
  }
}

function writeDidStorage(store: DidHandleCacheStore): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(DID_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // sessionStorage full or unavailable
  }
}

function pruneDidStore(store: DidHandleCacheStore): DidHandleCacheStore {
  const now = Date.now()
  const next: DidHandleCacheStore = {}
  for (const [key, entry] of Object.entries(store)) {
    if (entry.expiresAt > now) {
      next[key] = entry
    }
  }
  return next
}

export function getCachedHandle(did: string): string | null {
  const now = Date.now()

  const mem = didMemory.get(did)
  if (mem && mem.expiresAt > now) {
    return mem.handle
  }

  const store = pruneDidStore(readDidStorage())
  const stored = store[did]
  if (stored && stored.expiresAt > now) {
    didMemory.set(did, stored)
    return stored.handle
  }

  return null
}

export function setCachedHandle(did: string, handle: string): void {
  const normalized = normalizeHandle(handle)
  const entry: DidHandleCacheEntry = {
    handle: normalized,
    expiresAt: Date.now() + HANDLE_CACHE_TTL_MS,
  }

  didMemory.set(did, entry)

  const store = pruneDidStore(readDidStorage())
  store[did] = entry
  writeDidStorage(store)
}

interface PdsCacheEntry {
  pdsUrl: string
  expiresAt: number
}

type PdsCacheStore = Record<string, PdsCacheEntry>

const pdsMemory = new Map<string, PdsCacheEntry>()

function readPdsStorage(): PdsCacheStore {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PDS_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as PdsCacheStore
  } catch {
    return {}
  }
}

function writePdsStorage(store: PdsCacheStore): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PDS_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage full or unavailable
  }
}

function prunePdsStore(store: PdsCacheStore): PdsCacheStore {
  const now = Date.now()
  const next: PdsCacheStore = {}
  for (const [key, entry] of Object.entries(store)) {
    if (entry.expiresAt > now) next[key] = entry
  }
  return next
}

export function getCachedPdsUrl(did: string): string | null {
  const now = Date.now()
  const mem = pdsMemory.get(did)
  if (mem && mem.expiresAt > now) return mem.pdsUrl

  const store = prunePdsStore(readPdsStorage())
  const stored = store[did]
  if (stored && stored.expiresAt > now) {
    pdsMemory.set(did, stored)
    return stored.pdsUrl
  }
  return null
}

export function setCachedPdsUrl(did: string, pdsUrl: string): void {
  const entry: PdsCacheEntry = {
    pdsUrl,
    expiresAt: Date.now() + HANDLE_CACHE_TTL_MS,
  }
  pdsMemory.set(did, entry)
  const store = prunePdsStore(readPdsStorage())
  store[did] = entry
  writePdsStorage(store)
}
