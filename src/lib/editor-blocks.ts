import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import { parseFrontmatter } from '@/lib/lichen/frontmatter'

export interface EditorBlock {
  index: number
  type: string
  start: number
  end: number
  fixed?: boolean
}

const TOP_LEVEL_BLOCK_TYPES = new Set([
  'paragraph_open',
  'heading_open',
  'bullet_list_open',
  'ordered_list_open',
  'blockquote_open',
  'code_block',
  'fence',
  'hr',
  'html_block',
])

function lineOffsetMap(source: string): number[] {
  const offsets = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') offsets.push(i + 1)
  }
  return offsets
}

function isTopLevelBlock(token: Token): boolean {
  if (token.level !== 0) return false
  return TOP_LEVEL_BLOCK_TYPES.has(token.type)
}

function blockTypeFromToken(type: string): string {
  if (type === 'fence' || type === 'code_block') return 'code'
  if (type.endsWith('_open')) return type.replace(/_open$/, '')
  return type
}

function extractInfoboxBlocks(body: string, bodyOffset: number): EditorBlock[] {
  const blocks: EditorBlock[] = []
  const infoboxRe = /\{\{infobox[\s\S]*?\}\}/gi
  let match: RegExpExecArray | null

  while ((match = infoboxRe.exec(body)) !== null) {
    blocks.push({
      index: 0,
      type: 'infobox',
      start: bodyOffset + match.index,
      end: bodyOffset + match.index + match[0].length,
    })
  }

  return blocks
}

/**
 * `:::` sections are one block: dragging must move the whole band, not the
 * markers and paragraphs inside it. Nesting follows the render rule — a marker
 * line with a name opens, a bare one closes.
 */
function extractSectionBlocks(body: string, bodyOffset: number): EditorBlock[] {
  const blocks: EditorBlock[] = []
  const markerRe = /^ {0,3}:{3,}[ \t]*([a-z][a-z0-9-]*)?/i

  let depth = 0
  let start = 0
  let offset = 0

  for (const line of body.split('\n')) {
    const lineStart = offset
    offset += line.length + 1

    const match = line.match(markerRe)
    if (!match) continue

    if (match[1]) {
      if (depth === 0) start = lineStart
      depth += 1
      continue
    }

    if (depth === 0) continue
    depth -= 1
    if (depth === 0) {
      blocks.push({
        index: 0,
        type: 'section',
        start: bodyOffset + start,
        end: bodyOffset + Math.min(offset, body.length),
      })
    }
  }

  // An unterminated section owns the rest of the document, as it does on render.
  if (depth > 0) {
    blocks.push({ index: 0, type: 'section', start: bodyOffset + start, end: bodyOffset + body.length })
  }

  return blocks
}

function parseMarkdownItBlocks(body: string, bodyOffset: number): EditorBlock[] {
  const md = new MarkdownIt()
  const tokens = md.parse(body, {})
  const lineOffsets = lineOffsetMap(body)
  const blocks: EditorBlock[] = []

  for (const token of tokens) {
    if (!token.map || !isTopLevelBlock(token)) continue

    const [startLine, endLine] = token.map
    const start = bodyOffset + (lineOffsets[startLine] ?? 0)
    const end = bodyOffset + (lineOffsets[endLine] ?? body.length)

    blocks.push({
      index: 0,
      type: blockTypeFromToken(token.type),
      start,
      end,
    })
  }

  return blocks
}

function mergeBlockRanges(blocks: EditorBlock[]): EditorBlock[] {
  if (blocks.length === 0) return []

  const sorted = [...blocks].sort((a, b) => a.start - b.start)
  const merged: EditorBlock[] = []

  for (const block of sorted) {
    const last = merged[merged.length - 1]
    if (last && block.start < last.end) {
      last.end = Math.max(last.end, block.end)
      if (block.type === 'infobox' || block.type === 'section') last.type = block.type
      continue
    }
    merged.push({ ...block })
  }

  return merged
}

function normalizeBlockCoverage(blocks: EditorBlock[], sourceLength: number): EditorBlock[] {
  if (blocks.length === 0) return []

  const normalized = blocks.map((block) => ({ ...block }))
  for (let i = 0; i < normalized.length - 1; i++) {
    normalized[i].end = normalized[i + 1].start
  }
  normalized[normalized.length - 1].end = sourceLength
  return normalized
}

/** Parse markdown source into top-level draggable blocks. */
export function parseEditorBlocks(source: string): EditorBlock[] {
  const { body } = parseFrontmatter(source)
  const frontmatterLen = source.length - body.length
  const blocks: EditorBlock[] = []

  if (frontmatterLen > 0) {
    blocks.push({
      index: 0,
      type: 'frontmatter',
      start: 0,
      end: frontmatterLen,
      fixed: true,
    })
  }

  const infoboxBlocks = extractInfoboxBlocks(body, frontmatterLen)
  const sectionBlocks = extractSectionBlocks(body, frontmatterLen)
  const mdBlocks = parseMarkdownItBlocks(body, frontmatterLen)
  const bodyBlocks = mergeBlockRanges([...mdBlocks, ...infoboxBlocks, ...sectionBlocks])
  blocks.push(...bodyBlocks)

  const normalized = normalizeBlockCoverage(blocks, source.length)
  return normalized.map((block, index) => ({ ...block, index }))
}

export function getMovableBlocks(blocks: EditorBlock[]): EditorBlock[] {
  return blocks.filter((block) => !block.fixed)
}

/** Reorder a movable block by its index in the full blocks array. */
export function reorderEditorBlocks(
  source: string,
  fromIndex: number,
  toIndex: number,
): string {
  const blocks = parseEditorBlocks(source)
  if (fromIndex === toIndex) return source
  if (fromIndex < 0 || toIndex < 0) return source
  if (fromIndex >= blocks.length || toIndex >= blocks.length) return source

  const fromBlock = blocks[fromIndex]
  const toBlock = blocks[toIndex]
  if (fromBlock.fixed || toBlock.fixed) return source

  const reordered = [...blocks]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)

  return reordered.map((block) => source.slice(block.start, block.end)).join('')
}

export function getMinDataSs(element: Element): number | null {
  const spans = element.querySelectorAll('[data-ss]')
  if (spans.length === 0) {
    const own = element.getAttribute('data-ss')
    return own !== null ? Number(own) : null
  }

  let min = Infinity
  for (const span of spans) {
    const value = Number(span.getAttribute('data-ss'))
    if (!Number.isNaN(value)) min = Math.min(min, value)
  }
  return min === Infinity ? null : min
}

export function getMaxDataSe(element: Element): number | null {
  const spans = element.querySelectorAll('[data-se]')
  if (spans.length === 0) {
    const own = element.getAttribute('data-se')
    return own !== null ? Number(own) : null
  }

  let max = -Infinity
  for (const span of spans) {
    const value = Number(span.getAttribute('data-se'))
    if (!Number.isNaN(value)) max = Math.max(max, value)
  }
  return max === -Infinity ? null : max
}

/** Match rendered DOM children to parsed source blocks. */
export function matchDomBlocks(
  root: HTMLElement,
  blocks: EditorBlock[],
): Map<HTMLElement, EditorBlock> {
  const movable = getMovableBlocks(blocks)
  const children = Array.from(root.children) as HTMLElement[]
  const matches = new Map<HTMLElement, EditorBlock>()

  for (const child of children) {
    const ss = getMinDataSs(child)
    const se = getMaxDataSe(child)
    if (ss === null || se === null) continue

    const block =
      movable.find((candidate) => ss >= candidate.start && se <= candidate.end) ??
      movable.find((candidate) => ss >= candidate.start && ss < candidate.end) ??
      movable.find((candidate) => candidate.start <= ss && candidate.end >= se)

    if (block) matches.set(child, block)
  }

  return matches
}
