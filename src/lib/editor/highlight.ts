/**
 * Lightweight markdown highlighter for the editor's overlay layer.
 *
 * The output must contain exactly the same characters as the input (only
 * wrapped in spans), otherwise the overlay drifts out of alignment with the
 * textarea it sits behind.
 */

const FENCE_RE = /^([ \t]*)(```|~~~)(.*)$/
const HEADING_RE = /^([ \t]*)(#{1,6})([ \t]+)(.*)$/
const RULE_RE = /^([ \t]*)([-*_])(?:[ \t]*\2){2,}[ \t]*$/
const QUOTE_RE = /^([ \t]*>[ \t]?)(.*)$/
const LIST_RE = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)(\[[ xX]\][ \t]+)?(.*)$/
const SECTION_RE = /^([ \t]*)(:{3,})([ \t]*)(.*)$/

const INLINE_RE = new RegExp(
  [
    /(?<code>`[^`\n]*`)/,
    /(?<wikilink>\[\[[^\]\n]*\]\])/,
    /(?<link>!?\[[^\]\n]*\]\([^)\n]*\))/,
    /(?<strong>\*\*[^\n]+?\*\*|__[^\n]+?__)/,
    /(?<em>\*[^*\n]+\*|_[^_\n]+_)/,
    /(?<strike>~~[^\n]+?~~)/,
    /(?<template>\{\{[^}\n]*\}\})/,
    /(?<url>\bhttps?:\/\/[^\s<>()]+)/,
  ]
    .map((part) => part.source)
    .join('|'),
  'g',
)

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function span(className: string, text: string): string {
  if (!text) return ''
  return `<span class="${className}">${escapeHtml(text)}</span>`
}

function mark(text: string): string {
  return span('hl-mark', text)
}

/** Split `[text](url)` / `![alt](url)` so the destination can be dimmed. */
function renderLink(raw: string): string {
  const match = raw.match(/^(!?)\[([^\]]*)\]\(([^)]*)\)$/)
  if (!match) return span('hl-link', raw)
  const [, bang, label, url] = match
  return (
    mark(`${bang}[`) +
    span('hl-link', label) +
    mark('](') +
    span('hl-url', url) +
    mark(')')
  )
}

function renderWrapped(raw: string, markerLength: number, className: string): string {
  const open = raw.slice(0, markerLength)
  const body = raw.slice(markerLength, raw.length - markerLength)
  const close = raw.slice(raw.length - markerLength)
  return mark(open) + span(className, body) + mark(close)
}

function renderInline(text: string): string {
  let out = ''
  let last = 0

  INLINE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = INLINE_RE.exec(text)) !== null) {
    const groups = match.groups ?? {}
    out += escapeHtml(text.slice(last, match.index))
    const raw = match[0]

    if (groups.code) out += renderWrapped(raw, 1, 'hl-code-inline')
    else if (groups.wikilink) out += renderWrapped(raw, 2, 'hl-wikilink')
    else if (groups.link) out += renderLink(raw)
    else if (groups.strong) out += renderWrapped(raw, 2, 'hl-strong')
    else if (groups.em) out += renderWrapped(raw, 1, 'hl-em')
    else if (groups.strike) out += renderWrapped(raw, 2, 'hl-strike')
    else if (groups.template) out += renderWrapped(raw, 2, 'hl-template')
    else out += span('hl-url', raw)

    last = match.index + raw.length
  }

  return out + escapeHtml(text.slice(last))
}

function renderTableRow(line: string): string {
  return line
    .split('|')
    .map((cell) => renderInline(cell))
    .join(mark('|'))
}

function renderLine(line: string): string {
  const heading = line.match(HEADING_RE)
  if (heading) {
    const [, indent, hashes, gap, rest] = heading
    const level = Math.min(hashes.length, 3)
    return (
      escapeHtml(indent) +
      mark(hashes + gap) +
      span(`hl-heading hl-h${level}`, rest)
    )
  }

  if (RULE_RE.test(line)) return span('hl-rule', line)

  const section = line.match(SECTION_RE)
  if (section) {
    const [, indent, marker, gap, rest] = section
    return escapeHtml(indent) + mark(marker) + escapeHtml(gap) + span('hl-section', rest)
  }

  const quote = line.match(QUOTE_RE)
  if (quote) return mark(quote[1]) + span('hl-quote', quote[2])

  const list = line.match(LIST_RE)
  if (list) {
    const [, indent, bullet, gap, task, rest] = list
    return (
      escapeHtml(indent) +
      span('hl-bullet', bullet) +
      escapeHtml(gap) +
      (task ? span('hl-task', task) : '') +
      renderInline(rest)
    )
  }

  if (line.trimStart().startsWith('|') && line.includes('|', line.indexOf('|') + 1)) {
    return renderTableRow(line)
  }

  return renderInline(line)
}

export function highlightMarkdown(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []

  let inFence = false
  let inFrontmatter = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true
      out.push(span('hl-meta', line))
      continue
    }

    if (inFrontmatter) {
      out.push(span('hl-meta', line))
      if (line.trim() === '---') inFrontmatter = false
      continue
    }

    const fence = line.match(FENCE_RE)
    if (fence) {
      inFence = !inFence
      out.push(escapeHtml(fence[1]) + mark(fence[2]) + span('hl-code-lang', fence[3]))
      continue
    }

    out.push(inFence ? span('hl-code-block', line) : renderLine(line))
  }

  // Trailing newline keeps the final (possibly empty) line rendered in the <pre>.
  return `${out.join('\n')}\n`
}
