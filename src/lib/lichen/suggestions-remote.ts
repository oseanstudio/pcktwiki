import { getRecord } from '@/lib/atproto/lichen'
import { fetchBacklinks } from '@/lib/constellation/client'
import { COLLECTIONS } from '@/lib/lichen/collections'
import type { LichenSuggestionRecord, SuggestionKind, SuggestionStatus } from '@/types/lichen'

/**
 * Suggestions live in each author's own repo (`wiki.pckt.suggestion`) because
 * the author cannot write to the wiki owner's repo. Discovery mirrors member
 * requests: Constellation indexes records whose `.wikiRef` points at the wiki.
 */

const REJECTED_KEY = 'pckt.wiki.suggestions.rejected'

function readRejected(): Set<string> {
  try {
    const raw = localStorage.getItem(REJECTED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeRejected(ids: Set<string>): void {
  localStorage.setItem(REJECTED_KEY, JSON.stringify([...ids]))
}

export function isSuggestionRejected(uri: string): boolean {
  return readRejected().has(uri)
}

export function rejectSuggestionLocally(uri: string): void {
  const ids = readRejected()
  ids.add(uri)
  writeRejected(ids)
}

export function clearRejectedSuggestion(uri: string): void {
  const ids = readRejected()
  ids.delete(uri)
  writeRejected(ids)
}

function mapSuggestion(
  uri: string,
  authorDid: string,
  value: Record<string, unknown>,
): LichenSuggestionRecord {
  return {
    uri,
    cid: '',
    authorDid,
    wikiRef: String(value.wikiRef ?? ''),
    noteSlug: String(value.noteSlug ?? ''),
    kind: (value.kind as SuggestionKind) === 'image' ? 'image' : 'edit',
    content: typeof value.content === 'string' ? value.content : undefined,
    title: typeof value.title === 'string' ? value.title : undefined,
    baseRevision: typeof value.baseRevision === 'string' ? value.baseRevision : undefined,
    message: typeof value.message === 'string' ? value.message : undefined,
    blobs: Array.isArray(value.blobs) ? value.blobs : undefined,
    alt: typeof value.alt === 'string' ? value.alt : undefined,
    status: (value.status as SuggestionStatus) ?? 'pending',
    createdAt: String(value.createdAt ?? new Date().toISOString()),
  }
}

/** Suggestions other accounts have filed against this wiki, newest first. */
export async function listIncomingSuggestions(
  agent: import('@atproto/api').Agent,
  wikiRef: string,
  options: { includeReviewed?: boolean } = {},
): Promise<LichenSuggestionRecord[]> {
  const linking = await fetchBacklinks({
    target: wikiRef,
    collection: COLLECTIONS.suggestion,
    path: '.wikiRef',
    limit: 100,
  }).catch(() => ({ linking_records: [], total: 0, cursor: null }))

  const rejected = readRejected()
  const results: LichenSuggestionRecord[] = []

  for (const record of linking.linking_records) {
    const uri = `at://${record.did}/${record.collection}/${record.rkey}`
    if (rejected.has(uri)) continue
    try {
      const value = await getRecord(agent, record.did, COLLECTIONS.suggestion, record.rkey)
      if (!value) continue
      const suggestion = mapSuggestion(uri, record.did, value)
      if (suggestion.wikiRef !== wikiRef) continue
      if (suggestion.status === 'withdrawn' || suggestion.status === 'rejected') continue
      if (!options.includeReviewed && suggestion.status === 'approved') continue
      results.push(suggestion)
    } catch {
      // skip unreachable authors
    }
  }

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return results
}

/** Rewrite `blob:oldCid` embeds after a blob has been re-uploaded to a new repo. */
export function rewriteBlobCid(content: string, oldCid: string, newCid: string): string {
  if (!oldCid || oldCid === newCid) return content
  return content.split(`blob:${oldCid}`).join(`blob:${newCid}`)
}
