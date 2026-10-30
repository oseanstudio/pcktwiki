import type { LichenNoteWithContent } from '@/types/lichen'
import { extractWikilinks } from '@/lib/lichen/wikilinks'

export interface Backlink {
  sourceNoteUri: string
  sourceSlug: string
  sourceTitle: string
  targetNoteSlug: string
  wikiSlug: string
}

export function computeBacklinks(
  notes: LichenNoteWithContent[],
  wikiSlug: string,
  knownWikiSlugs: Set<string>,
): Backlink[] {
  const backlinks: Backlink[] = []

  for (const note of notes) {
    const targets = extractWikilinks(note.content, wikiSlug)
    for (const target of targets) {
      const targetWikiSlug = target.wikiSlug ?? wikiSlug
      if (!knownWikiSlugs.has(targetWikiSlug)) continue
      backlinks.push({
        sourceNoteUri: note.uri,
        sourceSlug: note.slug,
        sourceTitle: note.title,
        targetNoteSlug: target.noteSlug || 'home',
        wikiSlug: targetWikiSlug,
      })
    }
  }

  return backlinks
}

export function getBacklinksForNote(backlinks: Backlink[], noteSlug: string): Backlink[] {
  return backlinks.filter((link) => link.targetNoteSlug === noteSlug)
}
