import type { Agent } from '@atproto/api'
import type { LichenNoteRecord, LichenRevisionRecord } from '@/types/lichen'
import { writeNoteRecord, writeVerbatimRevision } from '@/lib/atproto/lichen'
import type { WikiBundleNote } from '@/lib/export/wiki-bundle'

export interface RestoreNoteResult {
  note: LichenNoteRecord
  /** How many revision records were replayed onto the restored note. */
  revisionsReplayed: number
}

/**
 * Recreate a note from a backup, keeping its original creation time and
 * replaying its recorded revisions in order.
 *
 * Revisions reference each other by AT-URI, and a restore mints new URIs, so
 * each `parentRevision` is remapped to the revision we just wrote. Writing them
 * in chronological order keeps that chain intact; without it the history would
 * collapse into a single "Imported" edit.
 */
export async function restoreNoteWithHistory(
  agent: Agent,
  wikiRef: string,
  slug: string,
  note: WikiBundleNote,
  revisions: LichenRevisionRecord[] | undefined,
): Promise<RestoreNoteResult> {
  const created = await writeNoteRecord(
    agent,
    slug,
    note.title,
    wikiRef,
    undefined,
    undefined,
    note.createdAt,
  )

  const revisionsReplayed = await replayRevisionsOnto(agent, created.uri, revisions)
  return { note: created, revisionsReplayed }
}

/**
 * Replay a bundle's revisions onto a note that already exists — the home note,
 * which the wiki create flow makes before the restore gets a say.
 */
export async function replayRevisionsOnto(
  agent: Agent,
  noteUri: string,
  revisions: LichenRevisionRecord[] | undefined,
): Promise<number> {
  if (!revisions?.length) return 0

  const ordered = [...revisions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const uriMap = new Map<string, string>()
  let previousUri: string | undefined
  let replayed = 0

  for (const revision of ordered) {
    const parent = revision.parentRevision
      ? uriMap.get(revision.parentRevision) ?? previousUri
      : undefined

    const written = await writeVerbatimRevision(agent, {
      noteRef: noteUri,
      diff: revision.diff,
      diffFormat: revision.diffFormat,
      createdAt: revision.createdAt,
      parentRevision: parent,
      message: revision.message,
      snapshot: revision.snapshot,
    })

    uriMap.set(revision.uri, written.uri)
    previousUri = written.uri
    replayed += 1
  }

  return replayed
}

/**
 * True when the bundle carries enough history for a faithful restore rather
 * than a fresh copy.
 */
export function hasRestorableHistory(
  revisions: Record<string, LichenRevisionRecord[]> | undefined,
): boolean {
  return Boolean(revisions && Object.values(revisions).some((list) => list.length > 0))
}
