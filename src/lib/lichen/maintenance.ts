import type { LichenNoteWithContent } from '@/types/lichen'
import { parseNoteContent } from '@/lib/lichen/content-meta'
import { extractWikilinks } from '@/lib/lichen/wikilinks'
import {
  isBranchSlug,
  isLegacyBranchSlug,
  migratedBranchSlug,
  parentSlugFromBranch,
} from '@/lib/lichen/branches'
import { isTalkSlug } from '@/lib/lichen/content-meta'
import { parseRelationFromWikilink } from '@/lib/lichen/relations'

export interface WantedPage {
  slug: string
  label: string
  referencedBy: string[]
}

/**
 * Several note records sharing one slug. Only the first is reachable — slug
 * lookups return one match — so the rest are stranded but still show up in
 * navigation and recent changes.
 */
export interface DuplicateSlug {
  slug: string
  /** Newest first; `reachable` is the one slug lookups actually resolve to. */
  notes: LichenNoteWithContent[]
  reachable: LichenNoteWithContent
  stranded: LichenNoteWithContent[]
}

/**
 * A branch note. Branches are hidden from the article list and reviewed from
 * their parent's edit page, so this is the only inventory of them — including
 * leftovers from flows that no longer exist.
 */
export interface BranchNoteInfo {
  note: LichenNoteWithContent
  parentSlug: string | null
  /** No parent note survives, so there is nothing to merge back into. */
  orphaned: boolean
  /**
   * Slug still uses the old `/` separator, which splits the URL across two
   * path segments and matches no route — the branch cannot be opened until it
   * is migrated.
   */
  legacySlug: boolean
  /** Slug this branch migrates to, when a valid one can be derived. */
  migratedSlug: string | null
}

export interface MaintenanceReport {
  wanted: WantedPage[]
  stubs: LichenNoteWithContent[]
  drafts: LichenNoteWithContent[]
  orphans: LichenNoteWithContent[]
  duplicates: DuplicateSlug[]
  branches: BranchNoteInfo[]
}

/** Every branch note, flagging those whose parent article is gone. */
export function findBranchNotes(notes: LichenNoteWithContent[]): BranchNoteInfo[] {
  const slugs = new Set(notes.map((note) => note.slug))
  return notes
    .filter((note) => isBranchSlug(note.slug))
    .map((note) => {
      const parentSlug = parentSlugFromBranch(note.slug)
      return {
        note,
        parentSlug,
        orphaned: !parentSlug || !slugs.has(parentSlug),
        legacySlug: isLegacyBranchSlug(note.slug),
        migratedSlug: migratedBranchSlug(note.slug),
      }
    })
    .sort(
      (a, b) =>
        Number(b.legacySlug) - Number(a.legacySlug) ||
        Number(b.orphaned) - Number(a.orphaned) ||
        a.note.slug.localeCompare(b.note.slug),
    )
}

/** Group notes by slug, reporting only the slugs held by more than one record. */
export function findDuplicateSlugs(notes: LichenNoteWithContent[]): DuplicateSlug[] {
  const bySlug = new Map<string, LichenNoteWithContent[]>()
  for (const note of notes) {
    const group = bySlug.get(note.slug)
    if (group) group.push(note)
    else bySlug.set(note.slug, [note])
  }

  const duplicates: DuplicateSlug[] = []
  for (const [slug, group] of bySlug) {
    if (group.length < 2) continue
    // getNoteBySlug takes the first match in store order, not the newest.
    const [reachable, ...stranded] = group
    duplicates.push({ slug, notes: group, reachable, stranded })
  }

  return duplicates.sort(
    (a, b) => b.notes.length - a.notes.length || a.slug.localeCompare(b.slug),
  )
}

const HIDDEN_PREFIXES = ['talk:', 'branch:']

function isNavHidden(slug: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => slug.startsWith(prefix)) || isTalkSlug(slug) || isBranchSlug(slug)
}

export function computeMaintenanceReport(
  notes: LichenNoteWithContent[],
  wikiSlug: string,
): MaintenanceReport {
  const existing = new Set(notes.map((note) => note.slug))
  const inbound = new Map<string, Set<string>>()
  const wantedMap = new Map<string, WantedPage>()

  for (const note of notes) {
    const links = extractWikilinks(note.content, wikiSlug)
    for (const link of links) {
      const relation = parseRelationFromWikilink(link.noteSlug)
      const targetSlug = relation?.targetSlug ?? link.noteSlug
      if (!targetSlug || targetSlug.startsWith('Category:')) continue

      if (!existing.has(targetSlug)) {
        const current = wantedMap.get(targetSlug) ?? {
          slug: targetSlug,
          label: link.label || targetSlug,
          referencedBy: [],
        }
        if (!current.referencedBy.includes(note.slug)) {
          current.referencedBy.push(note.slug)
        }
        wantedMap.set(targetSlug, current)
      } else {
        const set = inbound.get(targetSlug) ?? new Set()
        set.add(note.slug)
        inbound.set(targetSlug, set)
      }
    }
  }

  const stubs: LichenNoteWithContent[] = []
  const drafts: LichenNoteWithContent[] = []
  const orphans: LichenNoteWithContent[] = []

  for (const note of notes) {
    if (isNavHidden(note.slug) || note.slug === 'home' || note.slug === 'inbox') continue
    const meta = parseNoteContent(note.content)
    if (meta.status === 'stub') stubs.push(note)
    if (meta.status === 'draft') drafts.push(note)
    const refs = inbound.get(note.slug)
    if (!refs || refs.size === 0) orphans.push(note)
  }

  const wanted = [...wantedMap.values()].sort(
    (a, b) => b.referencedBy.length - a.referencedBy.length || a.slug.localeCompare(b.slug),
  )

  return {
    wanted,
    stubs,
    drafts,
    orphans,
    duplicates: findDuplicateSlugs(notes),
    branches: findBranchNotes(notes),
  }
}
