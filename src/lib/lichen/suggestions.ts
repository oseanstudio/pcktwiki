import {
  branchNameFromSlug,
  isBranchSlug,
  parentSlugFromBranch,
} from '@/lib/lichen/branches'
import type { LichenNoteWithContent } from '@/types/lichen'

/**
 * Branch name prefix marking a branch as a suggested edit rather than ordinary
 * in-progress work. A suggestion is just a branch by convention — there is no
 * separate record type — so the name is what distinguishes it.
 */
export const SUGGESTION_NAME_PREFIX = 'suggestion'

export interface OpenSuggestion {
  branch: LichenNoteWithContent
  /** Article the suggestion would merge into. Guaranteed to exist. */
  parentSlug: string
}

export function isSuggestionSlug(slug: string): boolean {
  if (!isBranchSlug(slug)) return false
  const name = branchNameFromSlug(slug)
  return !!name && name.startsWith(SUGGESTION_NAME_PREFIX)
}

/**
 * Suggestion branches that still have an article to merge into.
 *
 * A suggestion whose parent is gone is deliberately excluded: there is nothing
 * to diff it against, and accepting it would have no destination. Maintenance
 * reports those as orphaned branches instead.
 */
export function listAllOpenSuggestions(
  notes: LichenNoteWithContent[],
): OpenSuggestion[] {
  const existingSlugs = new Set(notes.map((note) => note.slug))
  const open: OpenSuggestion[] = []

  for (const branch of notes) {
    if (!isSuggestionSlug(branch.slug)) continue
    const parentSlug = parentSlugFromBranch(branch.slug)
    if (!parentSlug || !existingSlugs.has(parentSlug)) continue
    open.push({ branch, parentSlug })
  }

  return open.sort(
    (a, b) =>
      a.parentSlug.localeCompare(b.parentSlug) ||
      a.branch.slug.localeCompare(b.branch.slug),
  )
}

/** Open suggestions targeting one article. */
export function listSuggestionsFor(
  notes: LichenNoteWithContent[],
  parentSlug: string,
): OpenSuggestion[] {
  return listAllOpenSuggestions(notes).filter((item) => item.parentSlug === parentSlug)
}
