import MarkdownIt from 'markdown-it'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import DOMPurify from 'dompurify'
import { CATEGORY_PREFIX } from '@/lib/lichen/content-meta'
import {
  parseWikilinkTarget,
  slugifyHeading,
  wikilinkHref,
} from '@/lib/lichen/wikilinks'
import type { MarkdownRenderEnv } from '@/lib/markdown'
import { routeHref } from '@/lib/base-url'

interface ProcessedSource {
  text: string
  toSource: number[]
}

interface EditorRenderEnv extends MarkdownRenderEnv {
  processed: string
  toSource: number[]
  scanPos: number
  lineStarts: number[]
  lineEnds: number[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sourceSpan(
  sourceStart: number,
  sourceEnd: number,
  innerHtml: string,
): string {
  return `<span data-ss="${sourceStart}" data-se="${sourceEnd}">${innerHtml}</span>`
}

function annotateText(env: EditorRenderEnv, text: string): string {
  if (!text) return ''
  const idx = env.processed.indexOf(text, env.scanPos)
  const processedStart = idx === -1 ? env.scanPos : idx
  const processedEnd = processedStart + text.length
  env.scanPos = processedEnd
  const sourceStart = env.toSource[processedStart] ?? processedStart
  const sourceEnd =
    processedEnd < env.toSource.length
      ? env.toSource[processedEnd]
      : (env.toSource[env.toSource.length - 1] ?? sourceStart) + 1
  return sourceSpan(sourceStart, sourceEnd, escapeHtml(text))
}

function annotateNewline(_env: EditorRenderEnv, sourceOffset: number): string {
  return `<span class="wiki-editor-eol" data-ss="${sourceOffset}" data-se="${sourceOffset + 1}" aria-hidden="true">\n</span>`
}

function infoboxPlainText(raw: string): string {
  const inner = raw.replace(/^\{\{infobox\s*/i, '').replace(/\}\}$/, '')
  const lines: string[] = []
  let title = 'Info'

  for (const part of inner.split(/[|\n]/)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!key || !value) continue
    if (key === 'title' || key === 'name') title = value
    lines.push(`${key}: ${value}`)
  }

  return [title, ...lines.filter((line) => !line.startsWith('title:') && !line.startsWith('name:'))].join(
    '\n',
  )
}

function preprocessWithOffsets(source: string): ProcessedSource {
  const toSource: number[] = []
  let text = ''

  function appendLiteral(slice: string, absoluteStart: number) {
    for (let i = 0; i < slice.length; i++) {
      text += slice[i]
      toSource.push(absoluteStart + i)
    }
  }

  function appendMapped(display: string, sourceStart: number, sourceEnd: number) {
    const span = Math.max(sourceEnd - sourceStart, 1)
    for (let i = 0; i < display.length; i++) {
      text += display[i]
      toSource.push(sourceStart + Math.min(span - 1, Math.floor((i / display.length) * span)))
    }
  }

  const fmMatch = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  const bodyStart = fmMatch ? fmMatch[0].length : 0
  let body = source.slice(bodyStart)

  body = body.replace(/^(?:#\s*)?redirect:\s*[a-z0-9-]+\s*$/im, '')

  const infoboxRe = /\{\{infobox[\s\S]*?\}\}/gi
  let last = 0
  let match: RegExpExecArray | null
  while ((match = infoboxRe.exec(body)) !== null) {
    appendLiteral(body.slice(last, match.index), bodyStart + last)
    appendMapped(
      infoboxPlainText(match[0]),
      bodyStart + match.index,
      bodyStart + match.index + match[0].length,
    )
    last = match.index + match[0].length
  }
  appendLiteral(body.slice(last), bodyStart + last)

  const trimOffset = text.length - text.trimStart().length
  text = text.trimStart()
  return { text, toSource: toSource.slice(trimOffset) }
}

function lineSourceOffset(env: EditorRenderEnv, line: number): number {
  const processedOffset = env.lineStarts[line] ?? 0
  return env.toSource[processedOffset] ?? processedOffset
}

/** Mirror markdown-it block state's bMarks/eMarks for the processed source text. */
function buildProcessedLineOffsets(src: string): { lineStarts: number[]; lineEnds: number[] } {
  const lineStarts: number[] = []
  const lineEnds: number[] = []
  const len = src.length

  for (let start = 0, pos = 0; pos < len; pos++) {
    const ch = src.charCodeAt(pos)
    if (ch === 0x0a || pos === len - 1) {
      let end = pos
      if (ch !== 0x0a) end = pos + 1
      lineStarts.push(start)
      lineEnds.push(end)
      start = end + (ch === 0x0a ? 1 : 0)
    }
  }

  lineStarts.push(src.length)
  lineEnds.push(src.length)

  return { lineStarts, lineEnds }
}

function buildEditorMarkdownIt() {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
  })

  md.inline.ruler.before('link', 'wikilink', (state: StateInline, silent: boolean) => {
    const src = state.src
    const pos = state.pos

    if (src[pos] !== '[' || src[pos + 1] !== '[') return false

    const closeIdx = src.indexOf(']]', pos + 2)
    if (closeIdx === -1) return false

    if (!silent) {
      const env = state.env as EditorRenderEnv
      const inner = src.slice(pos + 2, closeIdx)
      const target = parseWikilinkTarget(inner, env.wikiSlug, env.ownerHandle)
      const sourceStart = env.toSource[pos] ?? pos
      const sourceEnd = (env.toSource[closeIdx + 1] ?? closeIdx) + 1

      if (inner.trim().startsWith(CATEGORY_PREFIX)) {
        const categoryName = inner.trim().slice(CATEGORY_PREFIX.length).split('|')[0].trim()
        const categorySlug = slugifyHeading(categoryName)
        if (env.ownerHandle && env.wikiSlug) {
          const href = routeHref(
            `/@${encodeURIComponent(env.ownerHandle)}/${encodeURIComponent(env.wikiSlug)}/category/${encodeURIComponent(categorySlug)}`,
          )
          const token = state.push('html_inline', '', 0)
          token.content = sourceSpan(
            sourceStart,
            sourceEnd,
            `<a href="${escapeHtml(href)}" class="category-link">${escapeHtml(categoryName)}</a>`,
          )
        }
      } else if (target && env.ownerHandle && env.wikiSlug) {
        const href = wikilinkHref(target, env.ownerHandle, env.wikiSlug)
        const token = state.push('html_inline', '', 0)
        token.content = sourceSpan(
          sourceStart,
          sourceEnd,
          `<a href="${escapeHtml(href)}" class="wikilink">${escapeHtml(target.label)}</a>`,
        )
      } else {
        return false
      }

      env.scanPos = closeIdx + 2
    }

    state.pos = closeIdx + 2
    return true
  })

  md.renderer.rules.text = (tokens, idx, _options, env) => {
    const editorEnv = env as EditorRenderEnv
    return annotateText(editorEnv, tokens[idx].content)
  }

  md.renderer.rules.softbreak = (tokens, idx, _options, env) => {
    const editorEnv = env as EditorRenderEnv
    const line = tokens[idx].map?.[0] ?? 0
    const processedOffset = editorEnv.lineEnds[line] ?? editorEnv.scanPos
    editorEnv.scanPos = processedOffset + 1
    const sourceOffset = editorEnv.toSource[processedOffset] ?? processedOffset
    return annotateNewline(editorEnv, sourceOffset)
  }

  md.renderer.rules.hardbreak = (tokens, idx, _options, env) => {
    const editorEnv = env as EditorRenderEnv
    const line = tokens[idx].map?.[0] ?? 0
    const processedOffset = editorEnv.lineEnds[line] ?? editorEnv.scanPos
    editorEnv.scanPos = processedOffset + 1
    const sourceOffset = editorEnv.toSource[processedOffset] ?? processedOffset
    return `<br>${annotateNewline(editorEnv, sourceOffset)}`
  }

  md.renderer.rules.html_inline = (_tokens, idx) => _tokens[idx].content

  function blockCloseWithGap(tokens: Token[], idx: number, env: EditorRenderEnv, closeTag: string) {
    const next = findNextBlockToken(tokens, idx)
    let extra = ''
    if (next?.map) {
      extra = blockGapNewlines(tokens[idx], next, env)
        .map((offset) => annotateNewline(env, offset))
        .join('')
    }
    return `${closeTag}${extra}`
  }

  md.renderer.rules.paragraph_close = (tokens, idx, _options, env) =>
    blockCloseWithGap(tokens, idx, env as EditorRenderEnv, '</p>')

  md.renderer.rules.heading_close = (tokens, idx, _options, env) => {
    const level = tokens[idx].tag
    return blockCloseWithGap(tokens, idx, env as EditorRenderEnv, `</${level}>`)
  }

  md.renderer.rules.strong_open = () => '<strong>'
  md.renderer.rules.strong_close = () => '</strong>'
  md.renderer.rules.em_open = () => '<em>'
  md.renderer.rules.em_close = () => '</em>'

  return md
}

function findNextBlockToken(tokens: Token[], idx: number): Token | null {
  for (let i = idx + 1; i < tokens.length; i++) {
    const type = tokens[i].type
    if (
      type === 'paragraph_open' ||
      type === 'heading_open' ||
      type === 'bullet_list_open' ||
      type === 'ordered_list_open' ||
      type === 'blockquote_open'
    ) {
      return tokens[i]
    }
  }
  return null
}

function blockGapNewlines(closeToken: Token, nextToken: Token, env: EditorRenderEnv): number[] {
  const closeLine = closeToken.map?.[1] ?? 0
  const nextLine = nextToken.map?.[0] ?? closeLine + 1
  const offsets: number[] = []

  for (let line = closeLine + 1; line < nextLine; line++) {
    offsets.push(lineSourceOffset(env, line))
  }

  if (offsets.length === 0 && nextLine > closeLine + 1) {
    offsets.push(lineSourceOffset(env, closeLine + 1))
  }

  return offsets
}

const editorMd = buildEditorMarkdownIt()

export function renderEditorMarkdown(source: string, env: MarkdownRenderEnv = {}): string {
  const { text, toSource } = preprocessWithOffsets(source)
  const { lineStarts, lineEnds } = buildProcessedLineOffsets(text)
  const renderEnv: EditorRenderEnv = {
    ...env,
    processed: text,
    toSource,
    scanPos: 0,
    lineStarts,
    lineEnds,
  }

  const html = editorMd.render(text, renderEnv)
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'class', 'id', 'data-ss', 'data-se'],
    ADD_TAGS: ['iframe', 'aside', 'table', 'tbody', 'tr', 'th', 'td', 'span'],
  })
}

export function sourceOffsetFromPointer(root: HTMLElement, clientX: number, clientY: number): number {
  const doc = root.ownerDocument
  let range: Range | null = null

  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(clientX, clientY)
  } else {
    const position = (
      doc as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
      }
    ).caretPositionFromPoint?.(clientX, clientY)
    if (position) {
      range = doc.createRange()
      range.setStart(position.offsetNode, position.offset)
      range.collapse(true)
    }
  }

  if (!range || !root.contains(range.startContainer)) {
    return sourceOffsetFromEnd(root)
  }

  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = range.startContainer as Text
    const span = textNode.parentElement?.closest('[data-ss]')
    if (span) {
      const sourceStart = Number(span.getAttribute('data-ss'))
      const sourceEnd = Number(span.getAttribute('data-se') ?? sourceStart + 1)
      const spanText = span.textContent ?? ''
      let textOffset = 0
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT)
      let current = walker.nextNode()
      while (current) {
        if (current === textNode) {
          textOffset += range.startOffset
          break
        }
        textOffset += current.textContent?.length ?? 0
        current = walker.nextNode()
      }
      const spanLength = Math.max(sourceEnd - sourceStart, 1)
      const textLength = spanText.length
      if (textLength <= 0) return sourceStart
      const ratio = textOffset / textLength
      return sourceStart + Math.min(spanLength, Math.round(ratio * spanLength))
    }
  }

  const element =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
  const span = element?.closest('[data-ss]')
  if (span) return Number(span.getAttribute('data-ss'))

  return sourceOffsetFromEnd(root)
}

export function sourceOffsetFromEnd(root: HTMLElement): number {
  const spans = root.querySelectorAll('[data-se]')
  if (spans.length === 0) return 0
  const last = spans[spans.length - 1]
  return Number(last.getAttribute('data-se') ?? 0)
}

export function getRangeForSourceOffset(
  root: HTMLElement,
  sourceOffset: number,
): { node: Text; offset: number } | null {
  const spans = root.querySelectorAll<HTMLElement>('[data-ss][data-se]')

  for (const span of spans) {
    const start = Number(span.getAttribute('data-ss'))
    const end = Number(span.getAttribute('data-se'))
    if (sourceOffset < start || sourceOffset > end) continue

    const textNodes: Text[] = []
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode() as Text | null
    while (node) {
      textNodes.push(node)
      node = walker.nextNode() as Text | null
    }

    if (textNodes.length === 0) continue

    const fullText = span.textContent ?? ''
    const spanSourceLength = Math.max(end - start, 1)
    const ratio = (sourceOffset - start) / spanSourceLength
    const displayOffset = Math.min(fullText.length, Math.round(ratio * fullText.length))

    let remaining = displayOffset
    for (const textNode of textNodes) {
      const len = textNode.textContent?.length ?? 0
      if (remaining <= len) {
        return { node: textNode, offset: remaining }
      }
      remaining -= len
    }

    const last = textNodes[textNodes.length - 1]
    return { node: last, offset: last.textContent?.length ?? 0 }
  }

  return null
}
