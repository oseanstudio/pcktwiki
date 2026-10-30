import { describe, expect, it } from 'vitest'
import {
  branchNameFromSlug,
  branchSlugFor,
  createBranchSlug,
  isBranchSlug,
  isLegacyBranchSlug,
  migratedBranchSlug,
  parentSlugFromBranch,
} from '@/lib/lichen/branches'

describe('branchSlugFor', () => {
  it('uses a separator that survives as one URL path segment', () => {
    const slug = branchSlugFor('characters', 'My Draft')
    expect(slug).toBe('branch:characters:my-draft')
    // A "/" here would split the slug across two route segments and 404.
    expect(slug).not.toContain('/')
  })

  it('normalizes names to a slug form', () => {
    expect(branchSlugFor('a', 'Mixed  Case_Name!')).toBe('branch:a:mixed-case-name')
  })
})

describe('parentSlugFromBranch', () => {
  it('reads the current format', () => {
    expect(parentSlugFromBranch('branch:characters:draft')).toBe('characters')
  })

  it('still reads the legacy slash format', () => {
    expect(parentSlugFromBranch('branch:characters/suggestion-ms6mbgqj')).toBe('characters')
  })

  it('returns null for a non-branch slug', () => {
    expect(parentSlugFromBranch('characters')).toBeNull()
  })

  it('returns null when no separator follows the prefix', () => {
    expect(parentSlugFromBranch('branch:characters')).toBeNull()
  })
})

describe('branchNameFromSlug', () => {
  it('reads both formats', () => {
    expect(branchNameFromSlug('branch:characters:draft')).toBe('draft')
    expect(branchNameFromSlug('branch:characters/suggestion-1')).toBe('suggestion-1')
  })

  it('returns null for a non-branch slug', () => {
    expect(branchNameFromSlug('characters')).toBeNull()
  })
})

describe('legacy slug migration', () => {
  it('detects the unreachable slash form', () => {
    expect(isLegacyBranchSlug('branch:characters/suggestion-ms6mbgqj')).toBe(true)
    expect(isLegacyBranchSlug('branch:characters:draft')).toBe(false)
    expect(isLegacyBranchSlug('characters')).toBe(false)
  })

  it('rewrites to the current separator', () => {
    expect(migratedBranchSlug('branch:characters/suggestion-ms6mbgqj')).toBe(
      'branch:characters:suggestion-ms6mbgqj',
    )
  })

  it('flattens any further slash, which would still split the URL', () => {
    const migrated = migratedBranchSlug('branch:characters/deep/name')
    expect(migrated).toBe('branch:characters:deep-name')
    expect(migrated).not.toContain('/')
  })

  it('returns null for a slug that needs no migration', () => {
    expect(migratedBranchSlug('branch:characters:draft')).toBeNull()
  })
})

describe('createBranchSlug', () => {
  it('avoids colliding with an existing slug', () => {
    const existing = ['branch:a:draft']
    expect(createBranchSlug('a', 'draft', existing)).toBe('branch:a:draft-2')
  })

  it('keeps counting past the first collision', () => {
    const existing = ['branch:a:draft', 'branch:a:draft-2']
    expect(createBranchSlug('a', 'draft', existing)).toBe('branch:a:draft-3')
  })

  it('falls back to a usable name when normalization empties it', () => {
    expect(createBranchSlug('a', '!!!', [])).toBe('branch:a:branch')
  })
})

describe('isBranchSlug', () => {
  it('matches only the branch namespace', () => {
    expect(isBranchSlug('branch:a:b')).toBe(true)
    expect(isBranchSlug('talk:a')).toBe(false)
    expect(isBranchSlug('a')).toBe(false)
  })
})
