import { describe, expect, it } from 'vitest'
import { buildNotePreview, leadImageFromNote, leadTextFromMarkdown } from '@/lib/link-preview'
import type { LichenNoteWithContent } from '@/types/lichen'

function note(content: string): LichenNoteWithContent {
  return {
    uri: 'at://did:plc:x/wiki.lichen.note/abc',
    cid: 'cid',
    slug: 'emic-and-etic',
    title: 'Emic and etic',
    wikiRef: 'at://did:plc:x/wiki.lichen.wiki/w',
    createdAt: '2026-01-01T00:00:00Z',
    content,
    latestRevisionUri: null,
  }
}

describe('leadTextFromMarkdown', () => {
  it('strips markup down to prose', () => {
    const text = leadTextFromMarkdown(
      '# Heading\n\n**Emic** and *etic* refer to [[field research|two kinds]] of work — see [docs](https://x.dev).',
    )
    expect(text).toBe('Emic and etic refer to two kinds of work — see docs.')
  })

  it('skips infoboxes, images, categories and embeds', () => {
    const text = leadTextFromMarkdown(
      '{{infobox name=Fetish|type=Object}}\n\n![photo](blob:abc)\n\n{{embed:other}}\n\nA fetish is an object.\n\n[[Category:Anthropology]]',
    )
    expect(text).toBe('A fetish is an object.')
  })

  it('truncates on a word boundary', () => {
    const text = leadTextFromMarkdown(`${'word '.repeat(200)}`, 40)
    expect(text.length).toBeLessThanOrEqual(41)
    expect(text.endsWith('…')).toBe(true)
    expect(text).not.toContain('wor…')
  })

  it('returns an empty string for a page with no prose', () => {
    expect(leadTextFromMarkdown('{{infobox name=X}}')).toBe('')
  })
})

describe('leadImageFromNote', () => {
  it('prefers the infobox image', () => {
    expect(leadImageFromNote('![a](blob:body)', 'blob:infobox')).toBe('blob:infobox')
  })

  it('falls back to the first body image', () => {
    expect(leadImageFromNote('text\n\n![a](blob:body "w=10&h=10")')).toBe('blob:body')
  })

  it('returns undefined when there is no image', () => {
    expect(leadImageFromNote('just text')).toBeUndefined()
  })
})

describe('buildNotePreview', () => {
  it('reads title, lead and image off a note', () => {
    const preview = buildNotePreview(
      note('---\nstatus: stub\n---\n\n![cover](blob:cid1)\n\nEmic and etic are terms.'),
    )
    expect(preview.title).toBe('Emic and etic')
    expect(preview.text).toBe('Emic and etic are terms.')
    expect(preview.imageSrc).toBe('blob:cid1')
    expect(preview.isStub).toBe(true)
  })

  it('marks a bodyless note as a stub', () => {
    expect(buildNotePreview(note('')).isStub).toBe(true)
  })
})
