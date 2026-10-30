/**
 * Convert the HTML written by {@link buildStaticWikiSite} back into wiki
 * markdown.
 *
 * This deliberately targets only our own generated markup rather than arbitrary
 * HTML: because we know exactly which elements and class names the renderer
 * emits, wikilinks, categories and infoboxes can be recovered instead of being
 * flattened into plain links and tables. Hand-edits to an exported `site/` are
 * therefore re-importable.
 *
 * Parsing is done with a small tokenizer rather than DOMParser so the same code
 * runs in the browser and under vitest's node environment.
 */

const VOID_TAGS = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'source'])
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' ',
}

interface ElementNode {
  type: 'element'
  tag: string
  attrs: Record<string, string>
  children: Node[]
}

interface TextNode {
  type: 'text'
  value: string
}

type Node = ElementNode | TextNode

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase()
    if (ENTITIES[key]) return ENTITIES[key]
    if (key.startsWith('#x')) {
      const code = Number.parseInt(key.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    if (key.startsWith('#')) {
      const code = Number.parseInt(key.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return match
  })
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw))) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')
  }
  return attrs
}

/** Parse a well-formed HTML fragment into a node tree. */
export function parseHtml(html: string): Node[] {
  const root: ElementNode = { type: 'element', tag: '#root', attrs: {}, children: [] }
  const stack: ElementNode[] = [root]
  const tagRe = /<(\/)?([a-zA-Z][-a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/)?>|<!--[\s\S]*?-->/g

  let cursor = 0
  let match: RegExpExecArray | null

  const pushText = (text: string) => {
    if (!text) return
    stack[stack.length - 1].children.push({ type: 'text', value: decodeEntities(text) })
  }

  while ((match = tagRe.exec(html))) {
    pushText(html.slice(cursor, match.index))
    cursor = match.index + match[0].length

    if (match[0].startsWith('<!--')) continue

    const [, closing, rawTag, rawAttrs, selfClosing] = match
    const tag = rawTag.toLowerCase()

    if (closing) {
      // Unwind to the matching open tag; ignore strays.
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tag === tag) {
          stack.length = i
          break
        }
      }
      continue
    }

    const node: ElementNode = { type: 'element', tag, attrs: parseAttrs(rawAttrs), children: [] }
    stack[stack.length - 1].children.push(node)

    if (tag === 'script' || tag === 'style') {
      const closeIdx = html.toLowerCase().indexOf(`</${tag}>`, cursor)
      const end = closeIdx === -1 ? html.length : closeIdx
      cursor = closeIdx === -1 ? html.length : closeIdx + tag.length + 3
      tagRe.lastIndex = cursor
      node.children.push({ type: 'text', value: html.slice(match.index + match[0].length, end) })
      continue
    }

    if (!selfClosing && !VOID_TAGS.has(tag)) stack.push(node)
  }

  pushText(html.slice(cursor))
  return root.children
}

function findElement(
  nodes: Node[],
  predicate: (node: ElementNode) => boolean,
): ElementNode | null {
  for (const node of nodes) {
    if (node.type !== 'element') continue
    if (predicate(node)) return node
    const found = findElement(node.children, predicate)
    if (found) return found
  }
  return null
}

function hasClass(node: ElementNode, className: string): boolean {
  return (node.attrs.class ?? '').split(/\s+/).includes(className)
}

function textOf(node: Node): string {
  if (node.type === 'text') return node.value
  return node.children.map(textOf).join('')
}

export interface HtmlToMarkdownOptions {
  /**
   * Slugs that exist in the export, used to tell a wikilink pointing at a real
   * page from an ordinary relative link.
   */
  knownSlugs?: Set<string>
}

/** `foo.html#bar` / `index.html` → the wikilink target they came from. */
function hrefToWikilink(href: string, label: string): string | null {
  if (/^[a-z]+:/i.test(href)) return null

  const [path, anchor] = href.split('#')
  if (!path && anchor) {
    return label === anchor ? `[[#${anchor}]]` : `[[#${anchor}|${label}]]`
  }
  if (!path.endsWith('.html')) return null

  const base = path.slice(0, -'.html'.length)
  if (base.startsWith('category-')) return null

  const slug = base === 'index' ? 'home' : base
  const target = anchor ? `${slug}#${anchor}` : slug
  return label === slug ? `[[${target}]]` : `[[${target}|${label}]]`
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]])/g, '\\$1')
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ')
}

/** Rebuild `{{infobox key=value|…}}` from the rendered aside. */
function infoboxToMarkdown(node: ElementNode): string {
  const rows: string[] = []
  const table = findElement([node], (n) => n.tag === 'table')
  if (!table) return ''

  for (const tr of collectAll(table, 'tr')) {
    const key = collectAll(tr, 'th').map(textOf)[0]?.trim()
    const value = collectAll(tr, 'td').map(textOf)[0]?.trim()
    if (key && value) rows.push(`${key}=${value}`)
  }

  return rows.length ? `{{infobox ${rows.join('|')}}}` : ''
}

function collectAll(node: ElementNode, tag: string): ElementNode[] {
  const out: ElementNode[] = []
  const walk = (current: Node) => {
    if (current.type !== 'element') return
    if (current.tag === tag) out.push(current)
    current.children.forEach(walk)
  }
  node.children.forEach(walk)
  return out
}

function inlineToMarkdown(nodes: Node[], options: HtmlToMarkdownOptions): string {
  let out = ''

  for (const node of nodes) {
    if (node.type === 'text') {
      out += escapeMarkdown(collapseWhitespace(node.value))
      continue
    }

    const inner = () => inlineToMarkdown(node.children, options)

    switch (node.tag) {
      case 'strong':
      case 'b':
        out += `**${inner()}**`
        break
      case 'em':
      case 'i':
        out += `_${inner()}_`
        break
      case 'del':
      case 's':
        out += `~~${inner()}~~`
        break
      case 'code':
        out += `\`${textOf(node)}\``
        break
      case 'br':
        out += '  \n'
        break
      case 'img': {
        const alt = node.attrs.alt ?? ''
        out += `![${alt}](${node.attrs.src ?? ''})`
        break
      }
      case 'a': {
        const href = node.attrs.href ?? ''
        const label = collapseWhitespace(textOf(node)).trim()
        if (hasClass(node, 'category-link')) {
          out += `[[Category:${label}]]`
          break
        }
        if (hasClass(node, 'wikilink')) {
          out += hrefToWikilink(href, label) ?? `[${label}](${href})`
          break
        }
        out += `[${inner()}](${href})`
        break
      }
      default:
        out += inner()
    }
  }

  return out
}

function listToMarkdown(
  node: ElementNode,
  options: HtmlToMarkdownOptions,
  depth: number,
): string {
  const ordered = node.tag === 'ol'
  const items = node.children.filter(
    (child): child is ElementNode => child.type === 'element' && child.tag === 'li',
  )

  return items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}.` : '-'
      const nested = item.children.filter(
        (child): child is ElementNode =>
          child.type === 'element' && (child.tag === 'ul' || child.tag === 'ol'),
      )
      const own = item.children.filter((child) => !nested.includes(child as ElementNode))
      const text = inlineToMarkdown(own, options).trim()
      const indent = '  '.repeat(depth)
      const sub = nested.map((list) => listToMarkdown(list, options, depth + 1)).join('')
      return `${indent}${marker} ${text}\n${sub}`
    })
    .join('')
}

function tableToMarkdown(node: ElementNode, options: HtmlToMarkdownOptions): string {
  const rows = collectAll(node, 'tr')
  if (!rows.length) return ''

  const cellsOf = (row: ElementNode) =>
    row.children
      .filter(
        (child): child is ElementNode =>
          child.type === 'element' && (child.tag === 'th' || child.tag === 'td'),
      )
      .map((cell) => inlineToMarkdown(cell.children, options).trim())

  const header = cellsOf(rows[0])
  const body = rows.slice(1).map(cellsOf)
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((cells) => `| ${cells.join(' | ')} |`),
  ]
  return lines.join('\n')
}

function blockToMarkdown(node: Node, options: HtmlToMarkdownOptions): string {
  if (node.type === 'text') {
    const text = collapseWhitespace(node.value).trim()
    return text ? escapeMarkdown(text) : ''
  }

  switch (node.tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(node.tag[1])
      return `${'#'.repeat(level)} ${inlineToMarkdown(node.children, options).trim()}`
    }
    case 'p':
      return inlineToMarkdown(node.children, options).trim()
    case 'hr':
      return '---'
    case 'ul':
    case 'ol':
      return listToMarkdown(node, options, 0).trimEnd()
    case 'blockquote':
      return blocksToMarkdown(node.children, options)
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n')
    case 'pre': {
      const code = findElement([node], (n) => n.tag === 'code')
      const language =
        (code?.attrs.class ?? '').match(/language-([\w-]+)/)?.[1] ?? ''
      const body = textOf(code ?? node).replace(/\n$/, '')
      return `\`\`\`${language}\n${body}\n\`\`\``
    }
    case 'table':
      return tableToMarkdown(node, options)
    case 'aside':
      if (hasClass(node, 'infobox')) return infoboxToMarkdown(node)
      return blocksToMarkdown(node.children, options)
    case 'div':
    case 'section':
    case 'article':
      return blocksToMarkdown(node.children, options)
    default:
      return inlineToMarkdown([node], options).trim()
  }
}

function blocksToMarkdown(nodes: Node[], options: HtmlToMarkdownOptions): string {
  const blocks: string[] = []
  for (const node of nodes) {
    const block = blockToMarkdown(node, options)
    if (block.trim()) blocks.push(block)
  }
  return blocks.join('\n\n')
}

export interface ParsedSitePage {
  title?: string
  content: string
}

/**
 * Pull a page's title and markdown body out of one exported `site/*.html` file.
 * Returns null when the file is not a wiki page (the README, an asset, …).
 */
export function sitePageToMarkdown(
  html: string,
  options: HtmlToMarkdownOptions = {},
): ParsedSitePage | null {
  const tree = parseHtml(html)

  const article = findElement(
    tree,
    (node) => node.tag === 'article' && hasClass(node, 'markdown-body'),
  )
  if (!article) return null

  const header = findElement(tree, (node) => hasClass(node, 'page-header'))
  const titleEl = header ? findElement([header], (node) => node.tag === 'h1') : null
  const title = titleEl ? collapseWhitespace(textOf(titleEl)).trim() : undefined

  const content = blocksToMarkdown(article.children, options)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { title, content }
}

/** `index.html` → `home`; `about.html` → `about`. */
export function slugFromSiteFilename(path: string): string | null {
  const name = path.split('/').pop() ?? ''
  if (!name.endsWith('.html')) return null
  const base = name.slice(0, -'.html'.length)
  if (base.startsWith('category-')) return null
  return base === 'index' ? 'home' : base
}
