import type { EditorView } from '@codemirror/view'
import { parseEditorBlocks, type EditorBlock } from '@/lib/editor-blocks'
import type { WikiDomPick } from '@/lib/wiki-dom-picker'
import { formatPickPosition } from '@/lib/wiki-dom-picker'

const BLOCK_TAG_NAMES: Record<string, string> = {
  frontmatter: 'frontmatter',
  heading: 'h2',
  paragraph: 'p',
  bullet_list: 'ul',
  ordered_list: 'ol',
  blockquote: 'blockquote',
  code: 'pre',
  fence: 'pre',
  hr: 'hr',
  html_block: 'div',
  infobox: 'aside',
}

function truncateText(value: string, max = 120): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function blockTagName(type: string): string {
  return BLOCK_TAG_NAMES[type] ?? 'section'
}

function blockDomPath(block: EditorBlock): string {
  return `cm-block[data-index="${block.index}"] > ${blockTagName(block.type)}`
}

export function blockRangeRect(view: EditorView, from: number, to: number): DOMRect | null {
  const doc = view.state.doc
  if (doc.length === 0) return null

  const safeTo = Math.max(from, Math.min(to, doc.length))
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(Math.max(from, safeTo - 1)).number

  const contentRect = view.contentDOM.getBoundingClientRect()
  let top = Infinity
  let bottom = -Infinity

  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
    const line = doc.line(lineNumber)
    const block = view.lineBlockAt(line.from)
    top = Math.min(top, block.top)
    bottom = Math.max(bottom, block.top + block.height)
  }

  if (!Number.isFinite(top)) return null
  return new DOMRect(contentRect.left, top, contentRect.width, bottom - top)
}

function blockAtPos(blocks: EditorBlock[], pos: number): EditorBlock | null {
  return blocks.find((block) => pos >= block.start && pos < block.end) ?? null
}

export function describeBlockPick(view: EditorView, block: EditorBlock): WikiDomPick {
  const source = view.state.doc.toString()
  const text = source.slice(block.start, block.end)
  const rect = blockRangeRect(view, block.start, block.end) ?? new DOMRect()

  return {
    domPath: blockDomPath(block),
    rect,
    tagName: blockTagName(block.type),
    className: `cm-block-${block.type}`,
    textPreview: truncateText(text),
    htmlSnippet: truncateText(text, 180),
    sourceStart: block.start,
    sourceEnd: block.end,
    blockType: block.type,
  }
}

export function refreshBlockPick(view: EditorView, pick: WikiDomPick): WikiDomPick {
  if (pick.sourceStart == null || pick.sourceEnd == null) return pick
  const rect = blockRangeRect(view, pick.sourceStart, pick.sourceEnd)
  if (!rect) return pick
  return { ...pick, rect }
}

export function resolvePickAtCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): WikiDomPick | null {
  const editorRect = view.dom.getBoundingClientRect()
  if (
    clientX < editorRect.left ||
    clientX > editorRect.right ||
    clientY < editorRect.top ||
    clientY > editorRect.bottom
  ) {
    return null
  }

  const pos = view.posAtCoords({ x: clientX, y: clientY })
  if (pos == null) return null

  const blocks = parseEditorBlocks(view.state.doc.toString())
  const block = blockAtPos(blocks, pos)
  if (!block || block.fixed) return null

  return describeBlockPick(view, block)
}

export function pickPositionLabel(pick: WikiDomPick): string {
  return formatPickPosition(pick.rect)
}
