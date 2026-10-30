import { describe, expect, it } from 'vitest'
import { noteToMarkdown, parseNoteMarkdown } from '@/lib/export/bundle-frontmatter'
import { parseFrontmatter } from '@/lib/lichen/frontmatter'

describe('bundle frontmatter round trip', () => {
  it('keeps author frontmatter parseable in the exported file', () => {
    const content = '---\nredirect: elsewhere\ncategories: [Lore, Places]\n---\n\nBody text.'
    const md = noteToMarkdown({ slug: 'home', title: 'Home' }, content)

    // The old format prepended "# Title", which pushed this block out of
    // first position and made it inert.
    expect(md.startsWith('---\n')).toBe(true)
    const { frontmatter } = parseFrontmatter(md)
    expect(frontmatter.redirect).toBe('elsewhere')
    expect(frontmatter.categories).toEqual(['Lore', 'Places'])
  })

  it('restores content byte-for-byte', () => {
    const content = '---\nredirect: elsewhere\nmap-x: 42\n---\n\nBody **text**.'
    const parsed = parseNoteMarkdown(
      noteToMarkdown({ slug: 'a-place', title: 'A Place' }, content),
    )
    expect(parsed.content).toBe(content)
    expect(parsed.slug).toBe('a-place')
    expect(parsed.title).toBe('A Place')
  })

  it('preserves frontmatter keys it does not model', () => {
    const content = '---\nsomething-custom: kept\n---\n\nBody.'
    const parsed = parseNoteMarkdown(noteToMarkdown({ slug: 'x', title: 'X' }, content))
    expect(parsed.content).toContain('something-custom: kept')
  })

  it('handles notes with no frontmatter', () => {
    const parsed = parseNoteMarkdown(
      noteToMarkdown({ slug: 'plain', title: 'Plain' }, 'Just a body.'),
    )
    expect(parsed.content).toBe('Just a body.')
    expect(parsed.title).toBe('Plain')
  })

  it('quotes titles containing colons', () => {
    const parsed = parseNoteMarkdown(
      noteToMarkdown({ slug: 'talk:home', title: 'Talk: Home' }, 'Body.'),
    )
    expect(parsed.title).toBe('Talk: Home')
    expect(parsed.slug).toBe('talk:home')
  })

  it('round trips subheader links including image paths', () => {
    const md = noteToMarkdown(
      {
        slug: 'home',
        title: 'Home',
        subheaderLinks: [
          { label: 'Guide', url: '/guide', image: { path: 'media/icon.png' } },
          { label: 'External', url: 'https://example.com' },
        ],
      },
      'Body.',
    )
    const parsed = parseNoteMarkdown(md)
    expect(parsed.subheaderLinks).toEqual([
      { label: 'Guide', url: '/guide', image: { path: 'media/icon.png' } },
      { label: 'External', url: 'https://example.com' },
    ])
    expect(parsed.content).toBe('Body.')
  })

  it('preserves createdAt', () => {
    const parsed = parseNoteMarkdown(
      noteToMarkdown(
        { slug: 'x', title: 'X', createdAt: '2024-01-02T03:04:05.000Z' },
        'Body.',
      ),
    )
    expect(parsed.createdAt).toBe('2024-01-02T03:04:05.000Z')
  })

  it('still reads the legacy v2 heading format', () => {
    const parsed = parseNoteMarkdown('# Old Title\n\nLegacy body.')
    expect(parsed.title).toBe('Old Title')
    expect(parsed.content).toBe('Legacy body.')
  })

  it('does not let author frontmatter shadow bundle keys', () => {
    const content = '---\ntitle: Sneaky\nslug: sneaky\n---\n\nBody.'
    const parsed = parseNoteMarkdown(noteToMarkdown({ slug: 'real', title: 'Real' }, content))
    expect(parsed.title).toBe('Real')
    expect(parsed.slug).toBe('real')
  })
})
