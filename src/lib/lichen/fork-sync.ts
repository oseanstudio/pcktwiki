import type { LichenNoteWithContent } from '@/types/lichen'
import type { ForkRecord } from '@/lib/lichen/fork'

export type ForkChangeType = 'modified' | 'added' | 'removed'

export interface ForkChange {
  type: ForkChangeType
  slug: string
  title: string
  /** Source content at last sync (merge base). '' for newly added notes. */
  base: string
  /** Current source content. '' when the note was removed upstream. */
  theirs: string
  /** Current content in the user's fork. '' for notes not present in the fork. */
  mine: string
  /** True when the fork was locally edited away from the base AND upstream also changed. */
  conflicted: boolean
  /** Source note's latest revision URI (for advancing the baseline). */
  sourceRevisionUri: string | null
}

/**
 * Compute the set of upstream changes that differ from the user's fork,
 * using the stored per-note baseline as the merge base.
 */
export function computeForkChanges(
  fork: ForkRecord,
  sourceNotes: LichenNoteWithContent[],
  forkNotes: LichenNoteWithContent[],
): ForkChange[] {
  const changes: ForkChange[] = []
  const forkBySlug = new Map(forkNotes.map((note) => [note.slug, note]))
  const sourceSlugs = new Set<string>()

  for (const sourceNote of sourceNotes) {
    sourceSlugs.add(sourceNote.slug)
    const baseline = fork.baselines[sourceNote.slug]
    const forkNote = forkBySlug.get(sourceNote.slug)
    const theirs = sourceNote.content

    if (!baseline && !forkNote) {
      // Brand-new note added upstream after the fork was created.
      changes.push({
        type: 'added',
        slug: sourceNote.slug,
        title: sourceNote.title,
        base: '',
        theirs,
        mine: '',
        conflicted: false,
        sourceRevisionUri: sourceNote.latestRevisionUri,
      })
      continue
    }

    const base = baseline?.sourceContent ?? ''
    if (theirs === base) continue // upstream unchanged since last sync

    const mine = forkNote?.content ?? ''
    if (mine === theirs) continue // fork already matches upstream

    changes.push({
      type: 'modified',
      slug: sourceNote.slug,
      title: sourceNote.title,
      base,
      theirs,
      mine,
      conflicted: mine !== base,
      sourceRevisionUri: sourceNote.latestRevisionUri,
    })
  }

  // Notes the user tracked from upstream that no longer exist in the source.
  for (const [slug, baseline] of Object.entries(fork.baselines)) {
    if (sourceSlugs.has(slug)) continue
    const forkNote = forkBySlug.get(slug)
    if (!forkNote) continue
    changes.push({
      type: 'removed',
      slug,
      title: forkNote.title,
      base: baseline.sourceContent,
      theirs: '',
      mine: forkNote.content,
      conflicted: forkNote.content !== baseline.sourceContent,
      sourceRevisionUri: null,
    })
  }

  return changes.sort((a, b) => a.slug.localeCompare(b.slug))
}

export function summarizeForkChanges(changes: ForkChange[]): {
  total: number
  added: number
  modified: number
  removed: number
  conflicts: number
} {
  return {
    total: changes.length,
    added: changes.filter((c) => c.type === 'added').length,
    modified: changes.filter((c) => c.type === 'modified').length,
    removed: changes.filter((c) => c.type === 'removed').length,
    conflicts: changes.filter((c) => c.conflicted).length,
  }
}
