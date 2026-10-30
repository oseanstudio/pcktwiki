import { joinFrontmatter, splitFrontmatter } from '@/lib/lichen/frontmatter'
import type { BundleHeaderLink } from '@/lib/export/wiki-bundle-media'

/**
 * Frontmatter keys the bundle owns. Everything else in a note's frontmatter is
 * the author's and is carried through verbatim, so an export/import round trip
 * cannot silently drop or rewrite keys we do not model.
 */
const RESERVED_KEYS = new Set(['slug', 'title', 'nav-title', 'created', 'subheader-links'])

export interface BundleNoteMeta {
  slug: string
  title: string
  createdAt?: string
  navTitle?: string
  subheaderLinks?: BundleHeaderLink[]
}

function needsQuoting(value: string): boolean {
  return (
    value === '' ||
    value !== value.trim() ||
    /[:#"'\n]/.test(value) ||
    /^[-?[\]{}&*!|>%@`]/.test(value)
  )
}

function emitScalar(value: string): string {
  if (!needsQuoting(value)) return value
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

function parseScalar(raw: string): string {
  const value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1)
  }
  return value
}

function emitSubheaderLinks(links: BundleHeaderLink[]): string[] {
  const lines = ['subheader-links:']
  for (const link of links) {
    lines.push(`  - label: ${emitScalar(link.label)}`)
    lines.push(`    url: ${emitScalar(link.url)}`)
    if (link.image?.path) {
      lines.push(`    image: ${emitScalar(link.image.path)}`)
    }
  }
  return lines
}

/**
 * Pull the `subheader-links:` block sequence out of raw frontmatter lines.
 * Returns the links plus the lines that did not belong to the block.
 */
function extractSubheaderLinks(lines: string[]): {
  links?: BundleHeaderLink[]
  rest: string[]
} {
  const startIdx = lines.findIndex((line) => /^subheader-links:\s*$/i.test(line.trim()))
  if (startIdx === -1) return { rest: lines }

  const links: BundleHeaderLink[] = []
  let i = startIdx + 1
  for (; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.startsWith(' ') && line.trim()) break

    const itemMatch = line.match(/^\s*-\s*label:\s*(.*)$/)
    if (itemMatch) {
      links.push({ label: parseScalar(itemMatch[1]), url: '' })
      continue
    }
    const fieldMatch = line.match(/^\s+(url|image|label):\s*(.*)$/)
    if (fieldMatch && links.length) {
      const current = links[links.length - 1]
      const value = parseScalar(fieldMatch[2])
      if (fieldMatch[1] === 'url') current.url = value
      else if (fieldMatch[1] === 'label') current.label = value
      else if (value) current.image = { path: value }
      continue
    }
    if (!line.trim()) continue
    break
  }

  return {
    links: links.length ? links : undefined,
    rest: [...lines.slice(0, startIdx), ...lines.slice(i)],
  }
}

/**
 * Serialize a note to a standalone markdown document.
 *
 * Bundle metadata and the author's own frontmatter share a single leading `---`
 * block, so the file stays valid frontmatter — the previous format prepended an
 * `# Title` heading, which pushed any author frontmatter out of first position
 * and left it inert.
 */
export function noteToMarkdown(meta: BundleNoteMeta, content: string): string {
  const { raw, body } = splitFrontmatter(content)

  const head = [`slug: ${emitScalar(meta.slug)}`, `title: ${emitScalar(meta.title)}`]
  if (meta.navTitle?.trim()) head.push(`nav-title: ${emitScalar(meta.navTitle.trim())}`)
  if (meta.createdAt) head.push(`created: ${emitScalar(meta.createdAt)}`)
  if (meta.subheaderLinks?.length) head.push(...emitSubheaderLinks(meta.subheaderLinks))

  const authorLines = (raw ?? '')
    .split('\n')
    .filter((line) => line.trim())
    .filter((line) => {
      const key = line.slice(0, line.indexOf(':')).trim().toLowerCase()
      return !RESERVED_KEYS.has(key)
    })

  return `---\n${[...head, ...authorLines].join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`
}

export interface ParsedBundleNote {
  slug?: string
  title?: string
  createdAt?: string
  navTitle?: string
  subheaderLinks?: BundleHeaderLink[]
  /** Note content with bundle-owned keys removed and author keys preserved. */
  content: string
}

/**
 * Read a note back out of a bundle markdown file. Falls back to the legacy
 * `# Title` header format written by v2 bundles.
 */
export function parseNoteMarkdown(source: string): ParsedBundleNote {
  const { raw, body } = splitFrontmatter(source)

  if (raw == null) {
    const titleMatch = source.match(/^#\s+(.+)\n/)
    if (titleMatch) {
      return {
        title: titleMatch[1].trim(),
        content: source.slice(titleMatch[0].length).trimStart(),
      }
    }
    return { content: source }
  }

  const allLines = raw.split('\n')
  const { links, rest } = extractSubheaderLinks(allLines)

  const meta: ParsedBundleNote = { content: '', subheaderLinks: links }
  const authorLines: string[] = []

  for (const line of rest) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1 || !line.trim()) {
      if (line.trim()) authorLines.push(line)
      continue
    }
    const key = line.slice(0, colonIdx).trim().toLowerCase()
    const value = parseScalar(line.slice(colonIdx + 1))
    if (key === 'slug') meta.slug = value
    else if (key === 'title') meta.title = value
    else if (key === 'nav-title') meta.navTitle = value
    else if (key === 'created') meta.createdAt = value
    else authorLines.push(line)
  }

  meta.content = joinFrontmatter(authorLines.join('\n'), body).replace(/^\n+/, '')
  return meta
}
