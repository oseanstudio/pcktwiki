import type { LichenNoteWithContent } from '@/types/lichen'
import { parseNoteContent } from '@/lib/lichen/content-meta'
import { isBranchSlug } from '@/lib/lichen/branches'
import { isTalkSlug } from '@/lib/lichen/content-meta'

export interface TimelineEvent {
  note: LichenNoteWithContent
  date: string
  era?: string
  sortKey: string
}

export function listTimelineEvents(notes: LichenNoteWithContent[]): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (const note of notes) {
    if (isTalkSlug(note.slug) || isBranchSlug(note.slug)) continue
    const meta = parseNoteContent(note.content)
    if (meta.template !== 'event' && !meta.date && !meta.era) continue
    if (!meta.date && !meta.era) continue
    const date = meta.date ?? ''
    events.push({
      note,
      date,
      era: meta.era,
      sortKey: date || `~${meta.era ?? note.title}`,
    })
  }
  return events.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.note.title.localeCompare(b.note.title))
}

export interface NoteFilters {
  template?: string | null
  status?: 'draft' | 'stub' | null
  canon?: 'main' | 'au' | 'spoilers' | null
  /** When true, hide au and spoilers unless they match canon filter. */
  hideNonMain?: boolean
}

export function noteMatchesFilters(
  note: LichenNoteWithContent,
  filters: NoteFilters,
): boolean {
  const meta = parseNoteContent(note.content)
  if (filters.template && meta.template !== filters.template) return false
  if (filters.status && meta.status !== filters.status) return false
  if (filters.canon && (meta.canon ?? 'main') !== filters.canon) return false
  if (filters.hideNonMain) {
    const canon = meta.canon ?? 'main'
    if (canon !== 'main') return false
  }
  return true
}

export function filterNotes(
  notes: LichenNoteWithContent[],
  filters: NoteFilters,
): LichenNoteWithContent[] {
  return notes.filter((note) => noteMatchesFilters(note, filters))
}
