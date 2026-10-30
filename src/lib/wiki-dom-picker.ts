import { getMaxDataSe, getMinDataSs, parseEditorBlocks } from '@/lib/editor-blocks'

export type WikiDomPickAction = 'edit' | 'wikilink' | 'source' | 'image' | 'bold'

export interface WikiDomPick {
  element?: Element
  domPath: string
  rect: DOMRect
  tagName: string
  className: string
  textPreview: string
  htmlSnippet: string
  sourceStart: number | null
  sourceEnd: number | null
  blockType: string | null
}

const PICKABLE_SELECTOR = [
  '.wiki-editor-block',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'pre',
  'hr',
  'table',
  'ul',
  'ol',
  '[data-ss]',
].join(', ')

const IGNORED_ROOTS = new Set([
  '.wiki-dom-picker-overlay',
  '.wiki-editor-block-handle',
  '.wiki-dom-picker-panel',
])

function isIgnoredElement(element: Element): boolean {
  for (const selector of IGNORED_ROOTS) {
    if (element.closest(selector)) return true
  }
  return false
}

function meaningfulClasses(element: Element): string[] {
  return [...element.classList].filter(
    (name) => !name.startsWith('data-v-') && !name.startsWith('wiki-dom-picker'),
  )
}

/** Build a Cursor-style DOM path from an element up to the root boundary. */
export function buildDomPath(element: Element, root?: Element | null): string {
  const parts: string[] = []
  let current: Element | null = element

  while (current && current !== root && current !== document.documentElement) {
    let part = current.tagName.toLowerCase()

    if (current.id) {
      part += `#${current.id}`
    } else {
      const classes = meaningfulClasses(current)
      if (classes.length) part += `.${classes.slice(0, 2).join('.')}`
    }

    parts.unshift(part)
    current = current.parentElement
  }

  return parts.join(' > ')
}

function truncateText(value: string, max = 120): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function htmlSnippet(element: Element, max = 180): string {
  const clone = element.cloneNode(true) as Element
  clone.querySelectorAll('.wiki-editor-block-handle, .wiki-dom-picker-overlay').forEach((node) => {
    node.remove()
  })
  const raw = clone.outerHTML.replace(/\s+/g, ' ').trim()
  if (raw.length <= max) return raw
  return `${raw.slice(0, max - 1)}…`
}

function blockTypeForElement(element: Element, source: string): string | null {
  const start = getMinDataSs(element)
  const end = getMaxDataSe(element)
  if (start === null || end === null) return null

  const block = parseEditorBlocks(source).find(
    (candidate) => start >= candidate.start && end <= candidate.end,
  )
  return block?.type ?? null
}

export function resolvePickTarget(element: Element | null, root: HTMLElement): Element | null {
  if (!element || !root.contains(element) || isIgnoredElement(element)) return null

  const block = element.closest('.wiki-editor-block')
  if (block && root.contains(block)) return block

  const pickable = element.closest(PICKABLE_SELECTOR)
  if (pickable && root.contains(pickable)) return pickable

  if (root.contains(element)) return element
  return null
}

export function describeWikiElement(
  element: Element,
  root: HTMLElement,
  source = '',
): WikiDomPick {
  const rect = element.getBoundingClientRect()
  const sourceStart = getMinDataSs(element)
  const sourceEnd = getMaxDataSe(element)

  return {
    element,
    domPath: buildDomPath(element, root),
    rect,
    tagName: element.tagName.toLowerCase(),
    className: meaningfulClasses(element).join(' '),
    textPreview: truncateText(element.textContent ?? ''),
    htmlSnippet: htmlSnippet(element),
    sourceStart,
    sourceEnd,
    blockType: source ? blockTypeForElement(element, source) : null,
  }
}

export function formatPickPosition(rect: DOMRect): string {
  return `top=${Math.round(rect.top)}px, left=${Math.round(rect.left)}px, width=${Math.round(rect.width)}px, height=${Math.round(rect.height)}px`
}
