import { describe, expect, it } from 'vitest'
import {
  isSuggestionSlug,
  listAllOpenSuggestions,
  listSuggestionsFor,
} from '@/lib/lichen/suggestions'
import type { LichenNoteWithContent } from '@/types/lichen'

function note(slug: string): LichenNoteWithContent {
  return {
    uri: `at://did:plc:test/wiki.lichen.note/${slug.replace(/[^a-z0-9]/gi, '')}`,
    cid: 'c',
    slug,
    title: slug,
    wikiRef: 'at://did:plc:test/wiki.lichen.wiki/w',
    createdAt: '2026-01-01T00:00:00.000Z',
    content: 'body',
    latestRevisionUri: null,
  }
}

describe('isSuggestionSlug', () => {
  it('matches a suggestion-named branch in the current format', () => {
    expect(isSuggestionSlug('branch:characters:suggestion-abc')).toBe(true)
  })

  it('matches one in the legacy slash format too', () => {
    expect(isSuggestionSlug('branch:characters/suggestion-abc')).toBe(true)
  })

  it('rejects an ordinary branch', () => {
    expect(isSuggestionSlug('branch:characters:draft')).toBe(false)
  })

  it('rejects a plain article', () => {
    expect(isSuggestionSlug('characters')).toBe(false)
  })
})

describe('listAllOpenSuggestions', () => {
  it('pairs a suggestion with the article it targets', () => {
    const notes = [note('characters'), note('branch:characters:suggestion-1')]
    const open = listAllOpenSuggestions(notes)

    expect(open).toHaveLength(1)
    expect(open[0].parentSlug).toBe('characters')
    expect(open[0].branch.slug).toBe('branch:characters:suggestion-1')
  })

  it('excludes a suggestion whose parent article is gone', () => {
    // Nothing to diff against and nowhere to accept it — Maintenance owns these.
    expect(listAllOpenSuggestions([note('branch:missing:suggestion-1')])).toEqual([])
  })

  it('ignores non-suggestion branches', () => {
    const notes = [note('characters'), note('branch:characters:draft')]
    expect(listAllOpenSuggestions(notes)).toEqual([])
  })

  it('orders by target article, then by branch', () => {
    const notes = [
      note('zed'),
      note('alpha'),
      note('branch:zed:suggestion-1'),
      note('branch:alpha:suggestion-2'),
      note('branch:alpha:suggestion-1'),
    ]
    expect(listAllOpenSuggestions(notes).map((s) => s.branch.slug)).toEqual([
      'branch:alpha:suggestion-1',
      'branch:alpha:suggestion-2',
      'branch:zed:suggestion-1',
    ])
  })
})

describe('listSuggestionsFor', () => {
  it('returns only the ones targeting that article', () => {
    const notes = [
      note('characters'),
      note('locations'),
      note('branch:characters:suggestion-1'),
      note('branch:locations:suggestion-1'),
    ]
    const open = listSuggestionsFor(notes, 'characters')

    expect(open).toHaveLength(1)
    expect(open[0].parentSlug).toBe('characters')
  })

  it('returns nothing for an article with no suggestions', () => {
    expect(listSuggestionsFor([note('characters')], 'characters')).toEqual([])
  })
})
