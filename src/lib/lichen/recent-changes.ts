import type { LichenNoteWithContent, LichenRevisionRecord } from '@/types/lichen'

export interface RecentChange {
  revision: LichenRevisionRecord
  note: LichenNoteWithContent
}

export function listRecentChanges(
  revisions: LichenRevisionRecord[],
  notes: LichenNoteWithContent[],
  limit = 30,
): RecentChange[] {
  const noteByUri = new Map(notes.map((note) => [note.uri, note]))
  const changes: RecentChange[] = []

  const sorted = [...revisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  for (const revision of sorted) {
    const note = noteByUri.get(revision.noteRef)
    if (!note) continue
    changes.push({ revision, note })
    if (changes.length >= limit) break
  }

  return changes
}
