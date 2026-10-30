import { describe, expect, it } from 'vitest'
import { findBranchNotes, findDuplicateSlugs } from '@/lib/lichen/maintenance'
import type { LichenNoteWithContent } from '@/types/lichen'

function note(rkey: string, slug: string, content = ''): LichenNoteWithContent {
  return {
    uri: `at://did:plc:test/wiki.lichen.note/${rkey}`,
    cid: `cid-${rkey}`,
    slug,
    title: slug,
    wikiRef: 'at://did:plc:test/wiki.lichen.wiki/w',
    createdAt: '2026-01-01T00:00:00.000Z',
    content,
    latestRevisionUri: null,
  }
}

const rkeyOf = (n: LichenNoteWithContent) => n.uri.split('/').pop()

describe('findDuplicateSlugs', () => {
  it('groups records that share a slug', () => {
    const notes = [note('a1', 'locations', 'real'), note('a2', 'locations'), note('b1', 'groups')]
    const duplicates = findDuplicateSlugs(notes)

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].slug).toBe('locations')
    expect(duplicates[0].notes).toHaveLength(2)
  })

  it('marks the first match reachable, matching how slug lookups resolve', () => {
    const notes = [note('first', 'x'), note('second', 'x'), note('third', 'x')]
    const [group] = findDuplicateSlugs(notes)

    expect(rkeyOf(group.reachable)).toBe('first')
    expect(group.stranded.map(rkeyOf)).toEqual(['second', 'third'])
  })

  it('ignores slugs held by a single record', () => {
    expect(findDuplicateSlugs([note('a', 'one'), note('b', 'two')])).toEqual([])
  })

  it('orders the worst offenders first', () => {
    const notes = [
      note('a', 'twice'),
      note('b', 'twice'),
      note('c', 'thrice'),
      note('d', 'thrice'),
      note('e', 'thrice'),
    ]
    expect(findDuplicateSlugs(notes).map((d) => d.slug)).toEqual(['thrice', 'twice'])
  })
})

describe('findBranchNotes', () => {
  it('lists only branch notes', () => {
    const notes = [note('a', 'characters'), note('b', 'branch:characters:draft')]
    const branches = findBranchNotes(notes)

    expect(branches).toHaveLength(1)
    expect(branches[0].note.slug).toBe('branch:characters:draft')
  })

  it('resolves the parent slug', () => {
    const notes = [note('a', 'characters'), note('b', 'branch:characters:draft')]
    expect(findBranchNotes(notes)[0].parentSlug).toBe('characters')
  })

  it('is not orphaned while its parent article exists', () => {
    const notes = [note('a', 'characters'), note('b', 'branch:characters:draft')]
    expect(findBranchNotes(notes)[0].orphaned).toBe(false)
  })

  it('is orphaned once the parent is gone', () => {
    expect(findBranchNotes([note('b', 'branch:characters:draft')])[0].orphaned).toBe(true)
  })

  it('flags a legacy slash slug and offers its migration', () => {
    const notes = [note('a', 'characters'), note('b', 'branch:characters/suggestion-ms6mbgqj')]
    const [branch] = findBranchNotes(notes)

    expect(branch.legacySlug).toBe(true)
    expect(branch.migratedSlug).toBe('branch:characters:suggestion-ms6mbgqj')
  })

  it('leaves migratedSlug null for a current-format slug', () => {
    const notes = [note('a', 'characters'), note('b', 'branch:characters:draft')]
    const [branch] = findBranchNotes(notes)

    expect(branch.legacySlug).toBe(false)
    expect(branch.migratedSlug).toBeNull()
  })

  it('surfaces unreachable slugs before merely orphaned ones', () => {
    const notes = [
      note('orphan', 'branch:gone:draft'),
      note('legacy', 'branch:characters/old'),
      note('characters', 'characters'),
    ]
    expect(findBranchNotes(notes).map((b) => b.note.slug)).toEqual([
      'branch:characters/old',
      'branch:gone:draft',
    ])
  })
})
