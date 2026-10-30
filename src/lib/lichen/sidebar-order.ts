import type { LichenNoteWithContent } from '@/types/lichen'
import { isBranchSlug } from '@/lib/lichen/branches'
import { isTalkSlug } from '@/lib/lichen/content-meta'

/**
 * Articles for the left sidebar / quick nav: one entry per slug, no talk or
 * branch pages. Duplicate-slug records all route to the same page, so listing
 * each would give identical links — keep the first match.
 */
export function articleNotesForSidebar(
  notes: LichenNoteWithContent[],
): LichenNoteWithContent[] {
  const bySlug = new Map<string, LichenNoteWithContent>()
  for (const note of notes) {
    if (isTalkSlug(note.slug) || isBranchSlug(note.slug)) continue
    if (!bySlug.has(note.slug)) bySlug.set(note.slug, note)
  }
  return [...bySlug.values()]
}

/** Sidebar / quick-nav label — prefers a custom navTitle when set. */
export function noteNavLabel(
  note: Pick<{ title: string; navTitle?: string }, 'title' | 'navTitle'>,
): string {
  const custom = note.navTitle?.trim()
  return custom || note.title
}

function byTitle(a: LichenNoteWithContent, b: LichenNoteWithContent): number {
  return noteNavLabel(a).localeCompare(noteNavLabel(b))
}

/**
 * Order sidebar articles by an optional saved slug list.
 *
 * - `undefined` / `null`: show every article, A–Z by title (default).
 * - array (including empty): whitelist — only listed slugs, in that order.
 *   Unknown/stale slugs are ignored. Omitted articles are hidden until added back.
 */
export function orderNotesForSidebar(
  notes: LichenNoteWithContent[],
  sidebarOrder?: string[] | null,
): LichenNoteWithContent[] {
  const articles = articleNotesForSidebar(notes)
  if (sidebarOrder == null) {
    return articles.sort(byTitle)
  }

  const bySlug = new Map(articles.map((note) => [note.slug, note]))
  const ordered: LichenNoteWithContent[] = []
  const placed = new Set<string>()

  for (const slug of sidebarOrder) {
    const note = bySlug.get(slug)
    if (!note || placed.has(slug)) continue
    ordered.push(note)
    placed.add(slug)
  }

  return ordered
}

/**
 * Articles that exist but are not in the sidebar whitelist. Empty when the
 * sidebar is still in default (show-all) mode.
 */
export function hiddenNotesForSidebar(
  notes: LichenNoteWithContent[],
  sidebarOrder?: string[] | null,
): LichenNoteWithContent[] {
  if (sidebarOrder == null) return []
  const visible = new Set(sidebarOrder)
  return articleNotesForSidebar(notes)
    .filter((note) => !visible.has(note.slug))
    .sort(byTitle)
}
