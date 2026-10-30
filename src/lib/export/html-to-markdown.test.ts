import { describe, expect, it } from 'vitest'
import {
  parseHtml,
  sitePageToMarkdown,
  slugFromSiteFilename,
} from '@/lib/export/html-to-markdown'

function page(body: string, title = 'A Page'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><title>${title}</title><link rel="stylesheet" href="assets/site.css" /></head>
<body>
  <div class="site-shell">
    <header class="site-brand"><h1><a href="index.html">Demo Wiki</a></h1></header>
    <nav class="site-nav"><a href="index.html">Home</a></nav>
    <main class="site-main">
      <header class="page-header"><h1>${title}</h1></header>
      <article class="prose markdown-body">
        ${body}
      </article>
    </main>
    <footer class="site-footer">Static export from pckt.wiki</footer>
  </div>
</body>
</html>`
}

const convert = (body: string) => sitePageToMarkdown(page(body))!.content

describe('parseHtml', () => {
  it('handles void and self-closing tags', () => {
    const nodes = parseHtml('<p>a<br />b<img src="x.png" /></p>')
    expect(nodes).toHaveLength(1)
  })

  it('decodes entities', () => {
    expect(convert('<p>a &amp; b &lt; c &quot;d&quot;</p>')).toBe('a & b < c "d"')
  })
})

describe('sitePageToMarkdown', () => {
  it('returns null for non-page files', () => {
    expect(sitePageToMarkdown('<html><body>no article</body></html>')).toBeNull()
  })

  it('reads the page title from the header, not the nav', () => {
    expect(sitePageToMarkdown(page('<p>x</p>', 'Real Title'))!.title).toBe('Real Title')
  })

  it('ignores chrome outside the article', () => {
    expect(convert('<p>Only this.</p>')).toBe('Only this.')
  })

  it('converts headings', () => {
    expect(convert('<h2>Section</h2><h3>Sub</h3>')).toBe('## Section\n\n### Sub')
  })

  it('converts inline emphasis and code', () => {
    expect(convert('<p><strong>a</strong> <em>b</em> <code>c()</code></p>')).toBe(
      '**a** _b_ `c()`',
    )
  })

  it('recovers wikilinks from generated hrefs', () => {
    expect(convert('<p><a href="places.html" class="wikilink">places</a></p>')).toBe(
      '[[places]]',
    )
  })

  it('keeps a custom wikilink label', () => {
    expect(convert('<p><a href="places.html" class="wikilink">The Map</a></p>')).toBe(
      '[[places|The Map]]',
    )
  })

  it('maps index.html back to the home slug', () => {
    expect(convert('<p><a href="index.html" class="wikilink">Home</a></p>')).toBe(
      '[[home|Home]]',
    )
  })

  it('recovers section anchors', () => {
    expect(convert('<p><a href="places.html#north" class="wikilink">north</a></p>')).toBe(
      '[[places#north|north]]',
    )
  })

  it('recovers category links', () => {
    expect(
      convert('<p><a href="category-lore.html" class="category-link">Lore</a></p>'),
    ).toBe('[[Category:Lore]]')
  })

  it('leaves external links as ordinary markdown links', () => {
    expect(convert('<p><a href="https://example.com">site</a></p>')).toBe(
      '[site](https://example.com)',
    )
  })

  it('converts images', () => {
    expect(convert('<p><img src="media/a.png" alt="A cat" /></p>')).toBe(
      '![A cat](media/a.png)',
    )
  })

  it('converts nested lists', () => {
    const md = convert('<ul><li>one<ul><li>deep</li></ul></li><li>two</li></ul>')
    expect(md).toBe('- one\n  - deep\n- two')
  })

  it('converts ordered lists', () => {
    expect(convert('<ol><li>first</li><li>second</li></ol>')).toBe('1. first\n2. second')
  })

  it('converts blockquotes', () => {
    expect(convert('<blockquote><p>quoted</p></blockquote>')).toBe('> quoted')
  })

  it('converts fenced code with its language', () => {
    expect(convert('<pre><code class="language-ts">const a = 1\n</code></pre>')).toBe(
      '```ts\nconst a = 1\n```',
    )
  })

  it('converts tables to GFM', () => {
    const md = convert(
      '<table><thead><tr><th>Name</th><th>Role</th></tr></thead>' +
        '<tbody><tr><td>Ada</td><td>Lead</td></tr></tbody></table>',
    )
    expect(md).toBe('| Name | Role |\n| --- | --- |\n| Ada | Lead |')
  })

  it('rebuilds an infobox from its rendered aside', () => {
    const html =
      '<aside class="infobox"><div class="infobox-title">Ada</div>' +
      '<table class="infobox-table"><tbody>' +
      '<tr><th>name</th><td>Ada</td></tr>' +
      '<tr><th>role</th><td>Lead</td></tr>' +
      '</tbody></table></aside>'
    expect(convert(html)).toBe('{{infobox name=Ada|role=Lead}}')
  })

  it('separates blocks with blank lines', () => {
    expect(convert('<p>one</p><p>two</p>')).toBe('one\n\ntwo')
  })

  it('converts a horizontal rule', () => {
    expect(convert('<p>a</p><hr /><p>b</p>')).toBe('a\n\n---\n\nb')
  })
})

describe('slugFromSiteFilename', () => {
  it('maps index to home', () => {
    expect(slugFromSiteFilename('site/index.html')).toBe('home')
  })

  it('maps a normal page', () => {
    expect(slugFromSiteFilename('site/places.html')).toBe('places')
  })

  it('skips category pages and non-html files', () => {
    expect(slugFromSiteFilename('site/category-lore.html')).toBeNull()
    expect(slugFromSiteFilename('site/assets/site.css')).toBeNull()
  })
})
