import type { Agent } from '@atproto/api'
import { COLLECTIONS } from '@/lib/lichen/collections'
import { listRecords } from '@/lib/atproto/lichen'

/**
 * Where a reader has been on a wiki's map.
 *
 * Writes land in localStorage first so discovery is instant and works signed
 * out, then mirror to the reader's own PDS (`wiki.pckt.mapProgress`) so
 * progress follows the account to another device.
 *
 * Merges are a union, never an overwrite. Discovery only ever adds places, so
 * two devices exploring different regions both keep their finds, and a stale
 * device coming back online cannot erase anything. The cost of that choice is
 * that forgetting a place has to be explicit — see `resetProgress`.
 */

const STORAGE_KEY = 'pckt.wiki.map-progress'
const PROGRESS_EVENT = 'pckt-map-progress-change'

interface StoredWikiProgress {
  slugs: string[]
  updatedAt: string
}

type StoredProgress = Record<string, StoredWikiProgress>

function readAll(): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as StoredProgress
  } catch {
    return {}
  }
}

function writeAll(progress: StoredProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // A full or unavailable store shouldn't break the map.
  }
  emitChange()
}

function emitChange(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT))
}

export function subscribeMapProgress(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(PROGRESS_EVENT, listener)
  // Another tab writing the same key should update this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(PROGRESS_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getDiscovered(wikiUri: string): Set<string> {
  const entry = readAll()[wikiUri]
  return new Set(Array.isArray(entry?.slugs) ? entry.slugs : [])
}

/** Records a visit locally. Returns true only when this is a new place. */
export function markDiscovered(wikiUri: string, slug: string): boolean {
  if (!wikiUri || !slug) return false
  const all = readAll()
  const current = new Set(all[wikiUri]?.slugs ?? [])
  if (current.has(slug)) return false
  current.add(slug)
  all[wikiUri] = { slugs: [...current], updatedAt: new Date().toISOString() }
  writeAll(all)
  return true
}

/** Clears this wiki's progress locally. Fogs the map again. */
export function resetProgress(wikiUri: string): void {
  const all = readAll()
  if (!(wikiUri in all)) return
  delete all[wikiUri]
  writeAll(all)
}

function replaceDiscovered(wikiUri: string, slugs: Iterable<string>): void {
  const all = readAll()
  all[wikiUri] = { slugs: [...new Set(slugs)], updatedAt: new Date().toISOString() }
  writeAll(all)
}

export interface MapProgressRecord {
  uri: string
  wikiRef: string
  discovered: string[]
  updatedAt: string
}

export async function listMapProgress(agent: Agent, did: string): Promise<MapProgressRecord[]> {
  return listRecords(agent, did, COLLECTIONS.mapProgress, (uri, _cid, _rkey, value) => ({
    uri,
    wikiRef: String(value.wikiRef ?? ''),
    discovered: Array.isArray(value.discovered) ? value.discovered.map(String) : [],
    updatedAt: String(value.updatedAt ?? new Date().toISOString()),
  }))
}

export async function findMapProgressForWiki(
  agent: Agent,
  did: string,
  wikiRef: string,
): Promise<MapProgressRecord | null> {
  const records = await listMapProgress(agent, did)
  return records.find((record) => record.wikiRef === wikiRef) ?? null
}

/**
 * Writes progress to the reader's repo. Reuses the existing record's rkey so a
 * wiki keeps one record instead of accumulating one per visit.
 */
export async function putMapProgress(
  agent: Agent,
  wikiRef: string,
  discovered: readonly string[],
  existingUri?: string,
): Promise<void> {
  const updatedAt = new Date().toISOString()
  const record = {
    $type: COLLECTIONS.mapProgress,
    wikiRef,
    discovered: [...discovered],
    updatedAt,
  }

  const rkey = existingUri?.split('/').pop()
  if (rkey) {
    await agent.com.atproto.repo.putRecord({
      repo: agent.accountDid,
      collection: COLLECTIONS.mapProgress,
      rkey,
      record,
    })
    return
  }

  await agent.com.atproto.repo.createRecord({
    repo: agent.accountDid,
    collection: COLLECTIONS.mapProgress,
    record,
  })
}

/** Union of two sets of found places, in stable order. */
export function mergeDiscovered(
  local: Iterable<string>,
  remote: Iterable<string>,
): string[] {
  return [...new Set([...local, ...remote])].sort()
}

export interface MapProgressSyncResult {
  discovered: Set<string>
  /** Places this device learned about from the PDS. */
  pulled: number
  /** Places this device contributed back to the PDS. */
  pushed: number
}

/**
 * Reconciles this device with the reader's PDS: pulls down places found
 * elsewhere, pushes up ones found here. Safe to call repeatedly — it only
 * writes when the two sides actually differ.
 */
export async function syncMapProgress(
  agent: Agent,
  wikiUri: string,
): Promise<MapProgressSyncResult> {
  const local = getDiscovered(wikiUri)
  const remoteRecord = await findMapProgressForWiki(agent, agent.accountDid, wikiUri)
  const remote = new Set(remoteRecord?.discovered ?? [])

  const merged = mergeDiscovered(local, remote)
  const pulled = merged.length - local.size
  const pushed = merged.length - remote.size

  if (pulled > 0) {
    replaceDiscovered(wikiUri, merged)
  }

  // Nothing found here that the PDS is missing means no write is needed. A
  // brand-new reader with an empty map doesn't get a record either.
  if (pushed > 0 || (remoteRecord == null && merged.length > 0)) {
    await putMapProgress(agent, wikiUri, merged, remoteRecord?.uri)
  }

  return { discovered: new Set(merged), pulled, pushed }
}

/**
 * Deletes this wiki's progress from the reader's repo as well as locally, so a
 * reset isn't undone by the next sync pulling the old list back down.
 */
export async function resetMapProgressEverywhere(
  agent: Agent | null,
  wikiUri: string,
): Promise<void> {
  resetProgress(wikiUri)
  if (!agent) return
  const existing = await findMapProgressForWiki(agent, agent.accountDid, wikiUri)
  if (!existing) return
  const rkey = existing.uri.split('/').pop()
  if (!rkey) return
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.accountDid,
    collection: COLLECTIONS.mapProgress,
    rkey,
  })
}
