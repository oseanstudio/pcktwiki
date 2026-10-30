import { describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import { parseSectionAttrs, sectionPlugin } from '@/lib/markdown-sections'

function render(source: string): string {
  const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
  md.use(sectionPlugin)
  return md.render(source)
}

describe('parseSectionAttrs', () => {
  it('reads quoted, bare and flag attributes', () => {
    expect(parseSectionAttrs('title="Recent updates" cols=3 reverse')).toEqual({
      title: 'Recent updates',
      cols: '3',
      reverse: '',
    })
  })

  it('ignores unknown keys', () => {
    expect(parseSectionAttrs('title=Hi onclick=alert')).toEqual({ title: 'Hi' })
  })
})

describe('section containers', () => {
  it('wraps nested markdown in a section body', () => {
    const html = render(':::hero title="The anime"\nWatch **now**\n:::')
    expect(html).toContain('<section class="md-section md-hero">')
    expect(html).toContain('<h2 class="md-section-title">The anime</h2>')
    expect(html).toContain('<div class="md-hero-body">')
    expect(html).toContain('<strong>now</strong>')
  })

  it('nests equal-length markers by name/bare pairing', () => {
    const html = render(
      [':::grid cols=3', ':::card title="Rig"', 'Free', ':::', ':::card title="Pack"', ':::', ':::'].join('\n'),
    )
    expect(html).toContain('md-grid md-cols--3')
    expect(html.match(/<article class="md-card">/g)).toHaveLength(2)
    // The grid closes after both cards, not after the first one.
    expect(html.trimEnd().endsWith('</section>')).toBe(true)
  })

  it('escapes attribute text', () => {
    const html = render(':::grid title="<img src=x onerror=1>"\n:::')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=1&gt;')
  })

  it('drops unsafe hrefs but keeps safe ones', () => {
    // eslint-disable-next-line no-script-url
    expect(render(':::card title=Go href="javascript:alert(1)"\n:::')).not.toContain('<a href')
    expect(render(':::card title=Go href="/@me/wiki/page"\n:::')).toContain(
      '<a href="/@me/wiki/page">Go</a>',
    )
  })

  it('renders a clamped progress meter', () => {
    const html = render(':::meter value=15 max=100 label=Members title="Goal"\nAlmost there\n:::')
    expect(html).toContain('<div class="md-meter-fill" style="width:15%"></div>')
    expect(html).toContain('15 / 100 Members')
    expect(html).toContain('Almost there')

    expect(render(':::meter value=500 max=100\n:::')).toContain('style="width:100%"')
    expect(render(':::meter value=-5 max=100\n:::')).toContain('style="width:0%"')
    // A missing max must not produce NaN width.
    expect(render(':::meter value=5\n:::')).toContain('style="width:0%"')
  })

  it('adds a read-more link to posts that have one', () => {
    const html = render(':::post date="Jul 10, 2025" title=Update href="/updates" more="Read on"\nBody\n:::')
    expect(html).toContain('<p class="md-post-date">Jul 10, 2025</p>')
    expect(html).toContain('<a href="/updates">Read on</a>')
  })

  it('closes an unterminated section at the end of the document', () => {
    const html = render(':::grid\nstill typing')
    expect(html).not.toContain(':::')
    expect(html).toContain('</section>')
  })

  it('leaves a bare marker alone outside a section', () => {
    expect(render('hello\n\n:::\n')).not.toContain('md-section')
  })

  it('keeps unknown section names as a plain band', () => {
    const html = render(':::mystery title=Hm\ntext\n:::')
    expect(html).toContain('<section class="md-section md-section--mystery">')
  })
})

describe('section blocks in the editor block model', () => {
  it('treats a whole section as one draggable block', async () => {
    const { parseEditorBlocks, reorderEditorBlocks } = await import('@/lib/editor-blocks')
    const doc = 'Intro paragraph.\n\n:::grid cols=2\n:::card title="A"\ntext\n:::\n:::\n\nOutro paragraph.\n'

    const blocks = parseEditorBlocks(doc)
    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'section', 'paragraph'])
    expect(doc.slice(blocks[1].start, blocks[1].end)).toContain(':::card')

    const moved = reorderEditorBlocks(doc, 1, 0)
    expect(moved.indexOf(':::grid')).toBeLessThan(moved.indexOf('Intro paragraph.'))
  })

  it('gives an unterminated section the rest of the document', async () => {
    const { parseEditorBlocks } = await import('@/lib/editor-blocks')
    const blocks = parseEditorBlocks('text\n\n:::grid\nhalf typed\n')
    expect(blocks[blocks.length - 1].type).toBe('section')
  })
})

describe('section insert actions', () => {
  it('scaffolds every section with its placeholder selected', async () => {
    const { applyAction, SECTION_ACTION_IDS } = await import('@/lib/editor/actions')
    expect(SECTION_ACTION_IDS).toHaveLength(10)

    for (const id of SECTION_ACTION_IDS) {
      const patch = applyAction('', 0, 0, id)
      // Renders to real markup, with no marker left behind.
      expect(render(patch.insert)).not.toContain(':::')
      expect(patch.selectionEnd).toBeGreaterThan(patch.selectionStart)
    }
  })

  it('opens the block below the current line', async () => {
    const { applyAction } = await import('@/lib/editor/actions')
    const patch = applyAction('Existing text', 5, 5, 'sectionHero')
    expect(patch.insert.startsWith('\n\n:::hero')).toBe(true)
  })
})
