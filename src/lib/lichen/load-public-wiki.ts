import { getWikiBySlug, listNotes, listRevisions } from '@/lib/atproto/lichen'
import { resolveHandleToDid, getReadAgentForRepo } from '@/lib/atproto/auth'
import { buildNoteContents, attachContentToNotes } from '@/lib/lichen/revisions'
import {
  getPublicWikiCache,
  loadPublicWikiCache,
  setPublicWikiCache,
  type PublicWikiCacheEntry,
} from '@/lib/lichen/wiki-cache'
import { assetUrl } from '@/lib/base-url'
import { isOnline } from '@/lib/offline-queue'
import type { LichenNoteWithContent } from '@/types/lichen'

export type { PublicWikiCacheEntry }

async function loadMirrorFallback(handle: string, slug: string): Promise<PublicWikiCacheEntry | null> {
  try {
    const normalized = handle.replace(/^@/, '').toLowerCase()
    const response = await fetch(
      assetUrl(`mirrors/${encodeURIComponent(normalized)}/${encodeURIComponent(slug)}.json`),
    )
    if (!response.ok) return null
    const entry = (await response.json()) as PublicWikiCacheEntry
    if (entry?.wiki) {
      setPublicWikiCache(entry, { access: 'public' })
    }
    return entry?.wiki ? entry : null
  } catch {
    return null
  }
}

export async function loadPublicWikiData(
  handle: string,
  slug: string,
  options?: { force?: boolean },
): Promise<PublicWikiCacheEntry> {
  if (!options?.force) {
    const cached = getPublicWikiCache(handle, slug)
    if (cached) return cached
  }

  if (!isOnline()) {
    const stale = await loadPublicWikiCache(handle, slug, { allowStale: true })
    if (stale?.wiki) return stale
    const mirror = await loadMirrorFallback(handle, slug)
    if (mirror) return mirror
    throw new Error('Wiki is not available offline')
  }

  try {
    const did = await resolveHandleToDid(handle)
    const agent = await getReadAgentForRepo(did)
    const wiki = await getWikiBySlug(agent, did, slug)

    if (!wiki || wiki.visibility !== 'public' || wiki.deletedAt || wiki.redirectSlug) {
      return {
        handle,
        slug,
        did,
        wiki: null,
        noteRecords: [],
        revisionRecords: [],
        notesWithContent: [],
        fetchedAt: Date.now(),
      }
    }

    const [allNotes, allRevisions] = await Promise.all([
      listNotes(agent, did),
      listRevisions(agent, did),
    ])

    const wikiNotes = allNotes.filter((note) => note.wikiRef === wiki.uri)
    const noteUris = new Set(wikiNotes.map((note) => note.uri))
    const wikiRevisions = allRevisions.filter((revision) => noteUris.has(revision.noteRef))
    const contents = buildNoteContents(wikiRevisions)
    const notesWithContent = attachContentToNotes(wikiNotes, contents)

    const entry: PublicWikiCacheEntry = {
      handle,
      slug,
      did,
      wiki,
      noteRecords: wikiNotes,
      revisionRecords: wikiRevisions,
      notesWithContent,
      fetchedAt: Date.now(),
    }

    setPublicWikiCache(entry, { access: 'public' })
    return entry
  } catch (err) {
    const stale = await loadPublicWikiCache(handle, slug, { allowStale: true })
    if (stale?.wiki) return stale
    const mirror = await loadMirrorFallback(handle, slug)
    if (mirror) return mirror
    throw err
  }
}

export function wikiNotesFromCache(entry: PublicWikiCacheEntry): LichenNoteWithContent[] {
  return entry.notesWithContent
}
