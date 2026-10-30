import { CATEGORY_PREFIX } from '@/lib/lichen/content-meta'
import { parseWikilinkTarget } from '@/lib/lichen/wikilinks'
import type { MarkdownRenderEnv } from '@/lib/markdown'

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

export interface DisplaySourceMap {
  displayToSource: number[]
}

function wikilinkLabel(inner: string, env: MarkdownRenderEnv): string {
  const trimmed = inner.trim()
  if (trimmed.startsWith(CATEGORY_PREFIX)) {
    return trimmed.slice(CATEGORY_PREFIX.length).split('|')[0].trim()
  }
  const target = parseWikilinkTarget(inner, env.wikiSlug, env.ownerHandle)
  return target?.label ?? trimmed
}

function mapLabelToSource(
  source: string,
  inner: string,
  innerStart: number,
  label: string,
  displayToSource: number[],
) {
  if (inner.trim().startsWith(CATEGORY_PREFIX)) {
    const nameStart = source.indexOf(label, innerStart)
    const start = nameStart === -1 ? innerStart : nameStart
    for (let j = 0; j < label.length; j++) {
      displayToSource.push(start + j)
    }
    return
  }

  const pipeIdx = inner.indexOf('|')
  let labelStart = innerStart
  if (pipeIdx >= 0) {
    labelStart = innerStart + pipeIdx + 1
    while (labelStart < innerStart + inner.length && source[labelStart] === ' ') {
      labelStart++
    }
  }

  for (let j = 0; j < label.length; j++) {
    displayToSource.push(labelStart + j)
  }
}

function appendContent(
  source: string,
  content: string,
  contentStart: number,
  displayToSource: number[],
  env: MarkdownRenderEnv,
) {
  let lastIndex = 0
  const re = new RegExp(WIKILINK_RE.source, 'g')
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    for (let i = lastIndex; i < match.index; i++) {
      displayToSource.push(contentStart + i)
    }

    const inner = match[1]
    const label = wikilinkLabel(inner, env)
    const innerStart = contentStart + match.index + 2
    mapLabelToSource(source, inner, innerStart, label, displayToSource)

    lastIndex = match.index + match[0].length
  }

  for (let i = lastIndex; i < content.length; i++) {
    displayToSource.push(contentStart + i)
  }
}

export function buildDisplaySourceMap(
  source: string,
  env: MarkdownRenderEnv = {},
): DisplaySourceMap {
  const displayToSource: number[] = []
  let pos = 0

  while (pos < source.length) {
    const lineEnd = source.indexOf('\n', pos)
    const end = lineEnd === -1 ? source.length : lineEnd
    const line = source.slice(pos, end)

    let content = line
    let contentStart = pos
    const headingMatch = line.match(/^(#{1,6}\s+)(.*)$/)
    if (headingMatch) {
      contentStart = pos + headingMatch[1].length
      content = headingMatch[2]
    }

    appendContent(source, content, contentStart, displayToSource, env)

    if (lineEnd !== -1) {
      displayToSource.push(lineEnd)
      pos = lineEnd + 1
    } else {
      pos = end
    }
  }

  return { displayToSource }
}

export function displayOffsetToSource(map: DisplaySourceMap, displayOffset: number): number {
  const { displayToSource } = map
  if (displayToSource.length === 0) return 0
  if (displayOffset <= 0) return displayToSource[0]
  if (displayOffset >= displayToSource.length) {
    return displayToSource[displayToSource.length - 1] + 1
  }
  return displayToSource[displayOffset]
}

export function sourceOffsetToDisplay(map: DisplaySourceMap, sourceOffset: number): number {
  const { displayToSource } = map
  for (let i = 0; i < displayToSource.length; i++) {
    if (displayToSource[i] >= sourceOffset) return i
  }
  return displayToSource.length
}

export function getTextOffsetInElement(
  root: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number {
  let total = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  let node = walker.nextNode()
  while (node) {
    if (node === targetNode) {
      return total + targetOffset
    }
    total += node.textContent?.length ?? 0
    node = walker.nextNode()
  }

  return total
}

export function getNodeOffsetFromTextOffset(
  root: HTMLElement,
  textOffset: number,
): { node: Text; offset: number } | null {
  let total = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  let node = walker.nextNode() as Text | null
  while (node) {
    const length = node.textContent?.length ?? 0
    if (textOffset <= total + length) {
      return { node, offset: Math.max(0, textOffset - total) }
    }
    total += length
    node = walker.nextNode() as Text | null
  }

  return null
}

export function displayOffsetFromPointer(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
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

  if (!range || !root.contains(range.startContainer)) return null
  return getTextOffsetInElement(root, range.startContainer, range.startOffset)
}
