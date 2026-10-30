import { describe, expect, it } from 'vitest'
import {
  rankSuggestions,
  wikilinkContextAt,
  wikilinkContextForRange,
} from '@/lib/editor/suggest'

describe('wikilinkContextAt (collapsed caret)', () => {
  it('returns null once a pipe (label syntax) is past the caret', () => {
    const doc = '[[gar|den'
    // caret right after the pipe
    expect(wikilinkContextAt(doc, 7)).toBeNull()
  })

  it('detects a caret inside an empty link', () => {
    const doc = '[[ ]]'
    const ctx = wikilinkContextAt(doc, 2)
    expect(ctx).toEqual({
      mode: 'note',
      queryStart: 2,
      queryEnd: 2,
      replaceEnd: 2,
      query: '',
    })
  })

  it('returns null when the caret is outside any brackets', () => {
    expect(wikilinkContextAt('hello world', 5)).toBeNull()
  })

  it('detects category context', () => {
    const doc = '[[Category:Gard'
    const ctx = wikilinkContextAt(doc, doc.length)
    expect(ctx?.mode).toBe('category')
    expect(ctx?.query).toBe('Gard')
    expect(ctx?.queryStart).toBe(2 + 'category:'.length)
  })
})

describe('wikilinkContextForRange (selection inside brackets)', () => {
  it('treats a selected word inside [[ ]] as the query', () => {
    // [[Yameii]] — "Yameii" is selected (offsets 2..8)
    const doc = '[[Yameii]]'
    const ctx = wikilinkContextForRange(doc, 2, 8)
    expect(ctx).not.toBeNull()
    expect(ctx!.mode).toBe('note')
    expect(ctx!.query).toBe('Yameii')
    // Replace span covers the selection; closing ]] sits just past it.
    expect(ctx!.queryStart).toBe(2)
    expect(ctx!.queryEnd).toBe(8)
    expect(ctx!.replaceEnd).toBe(10)
  })

  it('replace span is the selection end when there is no closing ]]', () => {
    // [[Yameii with no close, "Yameii" selected
    const doc = '[[Yameii'
    const ctx = wikilinkContextForRange(doc, 2, 8)
    expect(ctx!.query).toBe('Yameii')
    expect(ctx!.replaceEnd).toBe(8) // no closing brackets to consume
  })

  it('returns null for a selection that is not inside brackets', () => {
    expect(wikilinkContextForRange('hello world', 0, 5)).toBeNull()
  })

  it('returns null when the selection spans the opening brackets', () => {
    // "[[Yam" selected — straddles the [[ , not a valid inner selection
    const doc = '[[Yameii]]'
    expect(wikilinkContextForRange(doc, 0, 5)).toBeNull()
  })

  it('collapses to caret behaviour for a zero-width range', () => {
    const doc = '[[gar'
    const ctx = wikilinkContextForRange(doc, 5, 5)
    expect(ctx!.query).toBe('gar')
    expect(ctx!.queryStart).toBe(2)
  })

  it('handles a reversed selection (to < from)', () => {
    const doc = '[[Yameii]]'
    const ctx = wikilinkContextForRange(doc, 8, 2)
    expect(ctx!.query).toBe('Yameii')
  })
})

describe('rankSuggestions', () => {
  const pages = [
    { slug: 'yameii', title: 'Yameii' },
    { slug: 'skybot', title: 'Skybot' },
    { slug: 'garden', title: 'The Garden' },
  ]

  it('ranks prefix matches first', () => {
    const items = rankSuggestions(pages, 'ya')
    expect(items[0]?.value).toBe('yameii')
  })

  it('appends a Create entry for a query that matches no slug', () => {
    const items = rankSuggestions(pages, 'newpage')
    const create = items.find((i) => i.isNew)
    expect(create).toBeDefined()
    expect(create!.value).toBe('newpage')
  })

  it('does not append Create when the slug exists', () => {
    const items = rankSuggestions(pages, 'yameii')
    expect(items.some((i) => i.isNew)).toBe(false)
  })
})
