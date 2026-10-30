/**
 * `:::` section containers — page-layout blocks authored inside an article.
 *
 * A section opens with a named marker and closes with a bare one:
 *
 * ```
 * :::grid cols=3 title="Downloads"
 * :::card title="Blender rig" meta="Free for members"
 * ![](rig.png)
 * :::
 * :::
 * ```
 *
 * Nesting works with equal-length markers because a line carrying a name is
 * always an open and a bare line is always a close — authors never have to
 * count colons the way markdown-it-container makes them.
 *
 * Everything inside a section is ordinary markdown, so images, wikilinks and
 * `{{youtube}}` keep working unchanged.
 */

import type MarkdownIt from 'markdown-it'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type Token from 'markdown-it/lib/token.mjs'

const MARKER = 0x3a // ':'
const MIN_MARKER_LEN = 3

/** Attributes an author may set. Anything else on the line is ignored. */
const ATTR_KEYS = [
  'title',
  'eyebrow',
  'subtitle',
  'cols',
  'reverse',
  'date',
  'href',
  'more',
  'badge',
  'meta',
  'label',
  'value',
  'max',
] as const

export type SectionAttrs = Partial<Record<(typeof ATTR_KEYS)[number], string>>

interface SectionSpec {
  /** Outer element. */
  tag: string
  /** Classes on the outer element, before per-attribute modifiers. */
  className: string
  /** Wrapper around the nested markdown, when the layout needs one. */
  bodyTag?: string
  bodyClass?: string
  /** Renders the title / eyebrow / subtitle header. */
  head?: (attrs: SectionAttrs) => string
  /** Markup between the header and the body (progress bars and the like). */
  lead?: (attrs: SectionAttrs) => string
  /** Markup after the body (read-more links and the like). */
  foot?: (attrs: SectionAttrs) => string
  /** Extra classes derived from attributes. */
  modifiers?: (attrs: SectionAttrs) => string[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Only same-origin paths, wiki-ish anchors and http(s)/mailto links. */
function safeHref(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
  if (/^[/#]/.test(trimmed)) return trimmed
  return null
}

/** `cols=3` → `md-cols--3`, clamped to what the grid CSS defines. */
function colsClass(attrs: SectionAttrs): string[] {
  const cols = Number(attrs.cols)
  if (!Number.isInteger(cols) || cols < 1 || cols > 6) return []
  return [`md-cols--${cols}`]
}

function isTruthy(value: string | undefined): boolean {
  if (value === undefined) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '' || normalized === 'true' || normalized === 'yes' || normalized === '1'
}

/** Shared title block: eyebrow above, subtitle below. */
function sectionHead(attrs: SectionAttrs, level: 'h2' | 'h3' = 'h2'): string {
  const parts: string[] = []
  if (attrs.eyebrow) parts.push(`<p class="md-section-eyebrow">${escapeHtml(attrs.eyebrow)}</p>`)
  if (attrs.title) {
    parts.push(`<${level} class="md-section-title">${escapeHtml(attrs.title)}</${level}>`)
  }
  if (attrs.subtitle) {
    parts.push(`<p class="md-section-subtitle">${escapeHtml(attrs.subtitle)}</p>`)
  }
  if (parts.length === 0) return ''
  return `<header class="md-section-head">${parts.join('')}</header>`
}

/** Card-style header: badge, linked title, then a muted meta line. */
function cardHead(attrs: SectionAttrs): string {
  const parts: string[] = []
  if (attrs.badge) parts.push(`<span class="md-card-badge">${escapeHtml(attrs.badge)}</span>`)
  if (attrs.title) {
    const href = safeHref(attrs.href)
    const title = escapeHtml(attrs.title)
    parts.push(
      href
        ? `<h3 class="md-card-title"><a href="${escapeHtml(href)}">${title}</a></h3>`
        : `<h3 class="md-card-title">${title}</h3>`,
    )
  }
  if (attrs.meta) parts.push(`<p class="md-card-meta">${escapeHtml(attrs.meta)}</p>`)
  if (parts.length === 0) return ''
  return `<header class="md-card-head">${parts.join('')}</header>`
}

function postHead(attrs: SectionAttrs): string {
  const parts: string[] = []
  if (attrs.date) parts.push(`<p class="md-post-date">${escapeHtml(attrs.date)}</p>`)
  if (attrs.title) {
    const href = safeHref(attrs.href)
    const title = escapeHtml(attrs.title)
    parts.push(
      href
        ? `<h3 class="md-post-title"><a href="${escapeHtml(href)}">${title}</a></h3>`
        : `<h3 class="md-post-title">${title}</h3>`,
    )
  }
  if (parts.length === 0) return ''
  return `<header class="md-post-head">${parts.join('')}</header>`
}

function postFoot(attrs: SectionAttrs): string {
  const href = safeHref(attrs.href)
  if (!href) return ''
  const label = attrs.more?.trim() || 'Continue reading'
  return `<p class="md-post-more"><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`
}

/**
 * Progress bar for goals ("15 / 100 members"). The fill width is a plain
 * percentage so it survives DOMPurify's style sanitizing.
 */
function meterLead(attrs: SectionAttrs): string {
  const value = Number(attrs.value)
  const max = Number(attrs.max)
  const hasNumbers = Number.isFinite(value) && Number.isFinite(max) && max > 0
  const pct = hasNumbers ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0
  const label = attrs.label?.trim()
  const readout = hasNumbers
    ? `${value} / ${max}${label ? ` ${label}` : ''}`
    : label || ''

  return (
    `<div class="md-meter-row">` +
    (readout ? `<p class="md-meter-readout">${escapeHtml(readout)}</p>` : '') +
    `<p class="md-meter-pct">${pct}%</p>` +
    `</div>` +
    `<div class="md-meter-track" role="img" aria-label="${escapeHtml(readout || `${pct}%`)}">` +
    `<div class="md-meter-fill" style="width:${pct}%"></div>` +
    `</div>`
  )
}

/**
 * The section vocabulary. Names are what an author types after `:::`; every
 * one of them maps to a layout the article CSS knows how to draw.
 */
const SECTION_SPECS: Record<string, SectionSpec> = {
  hero: {
    tag: 'section',
    className: 'md-section md-hero',
    bodyTag: 'div',
    bodyClass: 'md-hero-body',
    head: (attrs) => sectionHead(attrs),
  },
  grid: {
    tag: 'section',
    className: 'md-section md-grid',
    bodyTag: 'div',
    bodyClass: 'md-grid-items',
    head: (attrs) => sectionHead(attrs),
    modifiers: colsClass,
  },
  card: {
    tag: 'article',
    className: 'md-card',
    bodyTag: 'div',
    bodyClass: 'md-card-body',
    head: cardHead,
  },
  split: {
    tag: 'section',
    className: 'md-section md-split',
    bodyTag: 'div',
    bodyClass: 'md-split-body',
    head: (attrs) => sectionHead(attrs),
    modifiers: (attrs) => (isTruthy(attrs.reverse) ? ['md-split--reverse'] : []),
  },
  pane: {
    tag: 'div',
    className: 'md-pane',
    head: (attrs) => sectionHead(attrs, 'h3'),
  },
  posts: {
    tag: 'section',
    className: 'md-section md-posts',
    bodyTag: 'div',
    bodyClass: 'md-posts-list',
    head: (attrs) => sectionHead(attrs),
  },
  post: {
    tag: 'article',
    className: 'md-post',
    bodyTag: 'div',
    bodyClass: 'md-post-body',
    head: postHead,
    foot: postFoot,
  },
  meter: {
    tag: 'section',
    className: 'md-section md-meter',
    bodyTag: 'div',
    bodyClass: 'md-meter-note',
    head: (attrs) => sectionHead(attrs),
    lead: meterLead,
  },
  columns: {
    tag: 'section',
    className: 'md-section md-columns',
    bodyTag: 'div',
    bodyClass: 'md-columns-body',
    head: (attrs) => sectionHead(attrs),
    modifiers: colsClass,
  },
  column: {
    tag: 'div',
    className: 'md-column',
    head: (attrs) => sectionHead(attrs, 'h3'),
  },
  actions: {
    tag: 'div',
    className: 'md-section md-actions',
    head: (attrs) => sectionHead(attrs),
  },
  scroller: {
    tag: 'section',
    className: 'md-section md-scroller',
    bodyTag: 'div',
    bodyClass: 'md-scroller-strip',
    head: (attrs) => sectionHead(attrs),
  },
}

export const SECTION_NAMES = Object.keys(SECTION_SPECS)

/** Unknown names still render as a plain band rather than leaking `:::` text. */
const FALLBACK_SPEC: SectionSpec = {
  tag: 'section',
  className: 'md-section',
  head: (attrs) => sectionHead(attrs),
}

function specFor(name: string): SectionSpec {
  return SECTION_SPECS[name] ?? FALLBACK_SPEC
}

/**
 * Parse `title="Recent updates" cols=3 reverse` into an attribute bag.
 * Bare flags become `''`, which {@link isTruthy} reads as on.
 */
export function parseSectionAttrs(input: string): SectionAttrs {
  const attrs: SectionAttrs = {}
  const re = /([a-z]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(input)) !== null) {
    const key = match[1].toLowerCase() as (typeof ATTR_KEYS)[number]
    if (!ATTR_KEYS.includes(key)) continue
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attrs
}

interface MarkerLine {
  /** Section name for an opening line; `null` for a bare closing line. */
  name: string | null
  attrs: SectionAttrs
}

/** Read a `:::name attrs` / `:::` line, or `null` when it is not a marker. */
function readMarkerLine(state: StateBlock, line: number): MarkerLine | null {
  const start = state.bMarks[line] + state.tShift[line]
  const max = state.eMarks[line]

  // More than three leading spaces means an indented code block.
  if (state.sCount[line] - state.blkIndent > 3) return null
  if (state.src.charCodeAt(start) !== MARKER) return null

  let pos = start
  while (pos < max && state.src.charCodeAt(pos) === MARKER) pos += 1
  if (pos - start < MIN_MARKER_LEN) return null

  const rest = state.src.slice(pos, max).trim()
  const nameMatch = rest.match(/^([a-z][a-z0-9-]*)\b/i)
  if (!nameMatch) return { name: null, attrs: {} }

  return {
    name: nameMatch[1].toLowerCase(),
    attrs: parseSectionAttrs(rest.slice(nameMatch[1].length)),
  }
}

function sectionRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const opening = readMarkerLine(state, startLine)
  if (!opening?.name) return false
  // Validation-only pass: the paragraph rule just needs to know we'd take it.
  if (silent) return true

  // Walk to the matching close, counting nested opens on the way.
  let depth = 1
  let closeLine = endLine
  let closed = false

  for (let line = startLine + 1; line < endLine; line += 1) {
    const marker = readMarkerLine(state, line)
    if (!marker) continue
    if (marker.name) {
      depth += 1
      continue
    }
    depth -= 1
    if (depth === 0) {
      closeLine = line
      closed = true
      break
    }
  }

  const spec = specFor(opening.name)
  const oldParent = state.parentType
  const oldLineMax = state.lineMax

  // `parentType` is a union of markdown-it's built-in block names; sections are
  // an extension, so the cast is how a container plugin marks its own frame.
  state.parentType = 'section' as StateBlock['parentType']
  state.lineMax = closeLine

  const open = state.push('wiki_section_open', spec.tag, 1)
  open.markup = ':::'
  open.block = true
  open.map = [startLine, closeLine]
  open.meta = { name: opening.name, attrs: opening.attrs }

  state.md.block.tokenize(state, startLine + 1, closeLine)

  const close = state.push('wiki_section_close', spec.tag, -1)
  close.markup = ':::'
  close.block = true
  close.meta = { name: opening.name, attrs: opening.attrs }

  state.parentType = oldParent
  state.lineMax = oldLineMax
  // An unterminated section runs to the end of the document rather than
  // dumping raw `:::` markers into a half-typed draft.
  state.line = closed ? closeLine + 1 : closeLine

  return true
}

function renderOpen(token: Token): string {
  const { name, attrs } = token.meta as { name: string; attrs: SectionAttrs }
  const spec = specFor(name)
  const classes = [spec.className, ...(spec.modifiers?.(attrs) ?? [])]
  if (!SECTION_SPECS[name]) classes.push(`md-section--${name}`)

  const head = spec.head?.(attrs) ?? ''
  const lead = spec.lead?.(attrs) ?? ''
  const body = spec.bodyTag ? `<${spec.bodyTag} class="${spec.bodyClass}">` : ''

  return `<${spec.tag} class="${classes.join(' ')}">${head}${lead}${body}`
}

function renderClose(token: Token): string {
  const { name, attrs } = token.meta as { name: string; attrs: SectionAttrs }
  const spec = specFor(name)
  const body = spec.bodyTag ? `</${spec.bodyTag}>` : ''
  const foot = spec.foot?.(attrs) ?? ''

  return `${body}${foot}</${spec.tag}>\n`
}

/** Register the `:::section` container with a markdown-it instance. */
export function sectionPlugin(md: MarkdownIt): void {
  md.block.ruler.before('fence', 'wiki_section', sectionRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })
  md.renderer.rules.wiki_section_open = (tokens, idx) => renderOpen(tokens[idx])
  md.renderer.rules.wiki_section_close = (tokens, idx) => renderClose(tokens[idx])
}
