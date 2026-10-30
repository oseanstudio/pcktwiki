import type { LichenNoteWithContent, LichenRevisionRecord } from '@/types/lichen'
import { normalizeLF, tryApplyDiff } from '@/lib/lichen/diff'

/** A single point on the wiki-wide timeline (one note revision). */
export interface WikiVersionEntry {
  revisionUri: string
  noteRef: string
  noteSlug: string
  noteTitle: string
  message?: string
  createdAt: string
}

/** State of one note when rewinding the whole wiki to a timestamp. */
export interface NoteRewindState {
  note: LichenNoteWithContent
  /** Content reconstructed as of the target time. */
  contentAtTime: string
  /** Whether the note existed (had any revision) at or before the target time. */
  existedAtTime: boolean
  /** Whether restoring would change anything for this note. */
  willChange: boolean
}

export interface WikiRewindPlan {
  targetTime: string
  /** Existing notes whose content will be rolled back. */
  restore: NoteRewindState[]
  /** Notes created after the target time that will be removed. */
  remove: NoteRewindState[]
  /** Notes already matching the target state (no-op). */
  unchanged: NoteRewindState[]
}

function orderRevisions(revisions: LichenRevisionRecord[]): LichenRevisionRecord[] {
  const byUri = new Map(revisions.map((revision) => [revision.uri, revision]))
  const roots = revisions.filter((revision) => !revision.parentRevision)
  if (roots.length === 0) {
    return [...revisions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  const ordered: LichenRevisionRecord[] = []
  const visited = new Set<string>()
  let current: LichenRevisionRecord | undefined = roots.sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )[0]

  while (current && !visited.has(current.uri)) {
    ordered.push(current)
    visited.add(current.uri)
    current = [...byUri.values()].find((revision) => revision.parentRevision === current!.uri)
  }

  for (const revision of revisions) {
    if (!visited.has(revision.uri)) ordered.push(revision)
  }

  return ordered.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * Build a merged, newest-first timeline of every revision across the wiki's notes.
 */
export function buildWikiTimeline(
  notes: LichenNoteWithContent[],
  revisions: LichenRevisionRecord[],
): WikiVersionEntry[] {
  const noteByUri = new Map(notes.map((note) => [note.uri, note]))
  return revisions
    .filter((revision) => noteByUri.has(revision.noteRef))
    .map((revision) => {
      const note = noteByUri.get(revision.noteRef)!
      return {
        revisionUri: revision.uri,
        noteRef: revision.noteRef,
        noteSlug: note.slug,
        noteTitle: note.title,
        message: revision.message,
        createdAt: revision.createdAt,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Reconstruct a note's content as it was at (or before) the given timestamp.
 * Returns null when the note had no revision at or before that time.
 */
export function reconstructNoteAtTime(
  noteRef: string,
  revisions: LichenRevisionRecord[],
  timeISO: string,
): string | null {
  const ordered = orderRevisions(revisions.filter((revision) => revision.noteRef === noteRef))
  let content = ''
  let applied = false

  for (const revision of ordered) {
    if (revision.createdAt > timeISO) break
    if (revision.diffFormat !== 'diff-match-patch') continue
    const next = tryApplyDiff(content, revision.diff)
    if (next === null) continue
    content = normalizeLF(next)
    applied = true
  }

  return applied ? content : null
}

/**
 * Compute what would change if the whole wiki were rewound to a timestamp.
 * Content rollbacks are written as new revisions (fully reversible); notes that
 * did not yet exist at the target time are removed.
 */
export function planWikiRewind(
  notes: LichenNoteWithContent[],
  revisions: LichenRevisionRecord[],
  targetTime: string,
): WikiRewindPlan {
  const restore: NoteRewindState[] = []
  const remove: NoteRewindState[] = []
  const unchanged: NoteRewindState[] = []

  for (const note of notes) {
    const contentAtTime = reconstructNoteAtTime(note.uri, revisions, targetTime)
    const existedAtTime = contentAtTime !== null

    if (!existedAtTime) {
      remove.push({ note, contentAtTime: '', existedAtTime: false, willChange: true })
      continue
    }

    const willChange = contentAtTime !== note.content
    const state: NoteRewindState = {
      note,
      contentAtTime,
      existedAtTime: true,
      willChange,
    }
    if (willChange) restore.push(state)
    else unchanged.push(state)
  }

  return { targetTime, restore, remove, unchanged }
}

export function rewindPlanIsNoop(plan: WikiRewindPlan): boolean {
  return plan.restore.length === 0 && plan.remove.length === 0
}
