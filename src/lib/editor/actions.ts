/**
 * Pure markdown text transformations.
 *
 * Every action returns a {@link EditPatch} describing a single contiguous
 * replacement so the surface can apply it through `insertText`, which keeps the
 * browser's native undo stack intact.
 */

import { setImageAlignAt, setImageSizeAt, setImageCropAt, setImageMasonryAt, setImageGapAt, moveBlockContaining, findImageAt, effectiveImageGap, type ImageAlign, type ImageCrop, type ImageGap, type ImageSize } from '@/lib/editor/image-align'
import { parseYouTubeId } from '@/lib/youtube'

export interface EditPatch {
  /** Start of the range to replace. */
  from: number
  /** End of the range to replace. */
  to: number
  insert: string
  /** Caret/anchor positions in the resulting document. */
  selectionStart: number
  selectionEnd: number
}

export type InlineActionId = 'bold' | 'italic' | 'strike' | 'code'
export type HeadingActionId = 'h1' | 'h2' | 'h3'
export type ListActionId = 'bullet' | 'numbered' | 'task' | 'quote'
export type InsertActionId =
  | 'link'
  | 'image'
  | 'imageAlignLeft'
  | 'imageAlignCenter'
  | 'imageAlignRight'
  | 'imageSizeSm'
  | 'imageSizeMd'
  | 'imageSizeLg'
  | 'imageSizeFull'
  | 'imageCropRounded'
  | 'imageCropCircle'
  | 'imageCropSquare'
  | 'imageCropWide'
  | 'imageCropTall'
  | 'imageMasonry'
  | 'imageGapFlush'
  | 'imageGapSm'
  | 'imageGapMd'
  | 'imageGapLg'
  | 'imageMoveUp'
  | 'imageMoveDown'
  | 'wikilink'
  | 'crosslink'
  | 'category'
  | 'infobox'
  | 'youtube'
  | 'codeblock'
  | 'table'
  | 'divider'
  | 'sectionHero'
  | 'sectionGrid'
  | 'sectionCard'
  | 'sectionSplit'
  | 'sectionPosts'
  | 'sectionPost'
  | 'sectionMeter'
  | 'sectionColumns'
  | 'sectionActions'
  | 'sectionScroller'

export type EditorActionId =
  | InlineActionId
  | HeadingActionId
  | ListActionId
  | InsertActionId

const INLINE_MARKS: Record<InlineActionId, { marker: string; placeholder: string }> = {
  bold: { marker: '**', placeholder: 'bold text' },
  italic: { marker: '_', placeholder: 'italic text' },
  strike: { marker: '~~', placeholder: 'struck text' },
  code: { marker: '`', placeholder: 'code' },
}

const HEADING_LEVEL: Record<HeadingActionId, number> = { h1: 1, h2: 2, h3: 3 }

const HEADING_RE = /^([ \t]*)(#{1,6})[ \t]+/
const BULLET_RE = /^([ \t]*)([-*+])[ \t]+/
const TASK_RE = /^([ \t]*)([-*+])[ \t]+\[[ xX]\][ \t]+/
const ORDERED_RE = /^([ \t]*)(\d+)([.)])[ \t]+/
const QUOTE_RE = /^([ \t]*)(>[ \t]?)/

export const INDENT = '  '

/* ------------------------------------------------------------------ */
/* Line helpers                                                        */
/* ------------------------------------------------------------------ */

export function lineStartAt(doc: string, pos: number): number {
  return doc.lastIndexOf('\n', pos - 1) + 1
}

export function lineEndAt(doc: string, pos: number): number {
  const next = doc.indexOf('\n', pos)
  return next === -1 ? doc.length : next
}

/** Expand a range so it covers every line it touches. */
export function lineSpan(doc: string, from: number, to: number) {
  const start = lineStartAt(doc, from)
  // A selection ending exactly at a line start should not swallow the next line.
  const endAnchor = to > from && doc[to - 1] === '\n' ? to - 1 : to
  return { start, end: lineEndAt(doc, endAnchor) }
}

/** Strip list/quote/heading markers, returning the indent and bare text. */
function stripBlockMarkers(line: string): { indent: string; body: string } {
  let rest = line
  let indent = ''

  const quote = rest.match(QUOTE_RE)
  if (quote) {
    indent = quote[1]
    rest = rest.slice(quote[0].length)
  }

  const task = rest.match(TASK_RE)
  if (task) {
    if (!indent) indent = task[1]
    return { indent, body: rest.slice(task[0].length) }
  }

  const bullet = rest.match(BULLET_RE)
  if (bullet) {
    if (!indent) indent = bullet[1]
    return { indent, body: rest.slice(bullet[0].length) }
  }

  const ordered = rest.match(ORDERED_RE)
  if (ordered) {
    if (!indent) indent = ordered[1]
    return { indent, body: rest.slice(ordered[0].length) }
  }

  const heading = rest.match(HEADING_RE)
  if (heading) {
    if (!indent) indent = heading[1]
    return { indent, body: rest.slice(heading[0].length) }
  }

  if (!indent) {
    const leading = rest.match(/^[ \t]*/)
    indent = leading ? leading[0] : ''
    rest = rest.slice(indent.length)
  }

  return { indent, body: rest }
}

/**
 * Arm a block marker on a blank line, leaving the caret after it so the next
 * keystroke lands inside the block. `replaceLines` selects what it rewrites,
 * which would make typing overwrite the marker instead of extending it.
 */
function armBlankLine(doc: string, from: number, marker: string): EditPatch {
  const start = lineStartAt(doc, from)
  const end = lineEndAt(doc, from)
  const indent = doc.slice(start, end).match(/^[ \t]*/)?.[0] ?? ''
  const insert = `${indent}${marker}`
  const caret = start + insert.length
  return { from: start, to: end, insert, selectionStart: caret, selectionEnd: caret }
}

/** True when the span is a single line holding nothing but whitespace. */
function isBlankSpan(lines: string[]): boolean {
  return lines.length === 1 && !lines[0].trim()
}

function replaceLines(
  doc: string,
  from: number,
  to: number,
  transform: (line: string, index: number) => string,
): EditPatch {
  const { start, end } = lineSpan(doc, from, to)
  const lines = doc.slice(start, end).split('\n')
  const insert = lines.map(transform).join('\n')
  return {
    from: start,
    to: end,
    insert,
    selectionStart: start,
    selectionEnd: start + insert.length,
  }
}

/* ------------------------------------------------------------------ */
/* Inline marks                                                        */
/* ------------------------------------------------------------------ */

const WORD_CHAR = /[\p{L}\p{N}_'-]/u

function expandToWord(doc: string, pos: number) {
  let from = pos
  let to = pos
  while (from > 0 && WORD_CHAR.test(doc[from - 1])) from -= 1
  while (to < doc.length && WORD_CHAR.test(doc[to])) to += 1
  return { from, to }
}

function toggleInline(doc: string, from: number, to: number, id: InlineActionId): EditPatch {
  const { marker, placeholder } = INLINE_MARKS[id]
  const len = marker.length

  let start = from
  let end = to
  if (start === end) {
    const word = expandToWord(doc, start)
    start = word.from
    end = word.to
  }

  const selected = doc.slice(start, end)

  if (
    selected.length >= len * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const inner = selected.slice(len, selected.length - len)
    return {
      from: start,
      to: end,
      insert: inner,
      selectionStart: start,
      selectionEnd: start + inner.length,
    }
  }

  if (doc.slice(start - len, start) === marker && doc.slice(end, end + len) === marker) {
    return {
      from: start - len,
      to: end + len,
      insert: selected,
      selectionStart: start - len,
      selectionEnd: start - len + selected.length,
    }
  }

  const body = selected || placeholder
  const selectionStart = start + len
  return {
    from: start,
    to: end,
    insert: `${marker}${body}${marker}`,
    selectionStart,
    selectionEnd: selectionStart + body.length,
  }
}

function isInlineActive(doc: string, from: number, to: number, id: InlineActionId): boolean {
  const { marker } = INLINE_MARKS[id]
  const len = marker.length

  let start = from
  let end = to
  if (start === end) {
    const word = expandToWord(doc, start)
    start = word.from
    end = word.to
  }

  const selected = doc.slice(start, end)
  if (selected.length >= len * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    return true
  }
  return doc.slice(start - len, start) === marker && doc.slice(end, end + len) === marker
}

/* ------------------------------------------------------------------ */
/* Headings                                                            */
/* ------------------------------------------------------------------ */

function headingLevelOf(line: string): number {
  const match = line.match(HEADING_RE)
  return match ? match[2].length : 0
}

function toggleHeading(doc: string, from: number, to: number, id: HeadingActionId): EditPatch {
  const level = HEADING_LEVEL[id]
  const { start, end } = lineSpan(doc, from, to)
  const lines = doc.slice(start, end).split('\n')

  if (isBlankSpan(lines)) return armBlankLine(doc, from, `${'#'.repeat(level)} `)

  const meaningful = lines.filter((line) => line.trim())
  const allAtLevel = meaningful.every((line) => headingLevelOf(line) === level)

  return replaceLines(doc, from, to, (line) => {
    if (!line.trim()) return line
    const { indent, body } = stripBlockMarkers(line)
    return allAtLevel ? `${indent}${body}` : `${indent}${'#'.repeat(level)} ${body}`
  })
}

/* ------------------------------------------------------------------ */
/* Lists and quotes                                                    */
/* ------------------------------------------------------------------ */

function hasListMarker(line: string, id: ListActionId): boolean {
  switch (id) {
    case 'bullet':
      return BULLET_RE.test(line) && !TASK_RE.test(line)
    case 'task':
      return TASK_RE.test(line)
    case 'numbered':
      return ORDERED_RE.test(line)
    case 'quote':
      return QUOTE_RE.test(line)
  }
}

const BLANK_LIST_MARKER: Record<ListActionId, string> = {
  bullet: '- ',
  numbered: '1. ',
  task: '- [ ] ',
  quote: '> ',
}

function toggleList(doc: string, from: number, to: number, id: ListActionId): EditPatch {
  const { start, end } = lineSpan(doc, from, to)
  const lines = doc.slice(start, end).split('\n')

  if (isBlankSpan(lines)) return armBlankLine(doc, from, BLANK_LIST_MARKER[id])

  const meaningful = lines.filter((line) => line.trim())
  const allMarked =
    meaningful.length > 0 && meaningful.every((line) => hasListMarker(line, id))

  let ordinal = 0
  return replaceLines(doc, from, to, (line) => {
    if (!line.trim()) return line

    if (id === 'quote') {
      if (allMarked) {
        const match = line.match(QUOTE_RE)
        return match ? line.slice(0, match[1].length) + line.slice(match[0].length) : line
      }
      const leading = line.match(/^[ \t]*/)?.[0] ?? ''
      return `${leading}> ${line.slice(leading.length)}`
    }

    const { indent, body } = stripBlockMarkers(line)
    if (allMarked) return `${indent}${body}`

    ordinal += 1
    if (id === 'task') return `${indent}- [ ] ${body}`
    if (id === 'numbered') return `${indent}${ordinal}. ${body}`
    return `${indent}- ${body}`
  })
}

/* ------------------------------------------------------------------ */
/* Block and inline insertions                                         */
/* ------------------------------------------------------------------ */

/** Insert a standalone block, padding with blank lines so it parses cleanly. */
function insertBlock(
  doc: string,
  from: number,
  to: number,
  block: string,
  selectOffset: number,
  selectLength: number,
): EditPatch {
  const lineStart = lineStartAt(doc, from)
  const lineEnd = lineEndAt(doc, to)
  const onEmptyLine = !doc.slice(lineStart, lineEnd).trim()

  // Replace the current line when it is blank, otherwise open a new one below.
  const anchor = onEmptyLine ? lineStart : lineEnd
  const leading = onEmptyLine ? '' : '\n\n'
  const after = doc.slice(lineEnd)
  const trailing = after === '' || after.startsWith('\n\n') ? '' : '\n'

  const selectionStart = anchor + leading.length + selectOffset
  return {
    from: anchor,
    to: lineEnd,
    insert: `${leading}${block}${trailing}`,
    selectionStart,
    selectionEnd: selectionStart + selectLength,
  }
}

function wrapOrInsert(
  doc: string,
  from: number,
  to: number,
  before: string,
  after: string,
  placeholder: string,
): EditPatch {
  const selected = doc.slice(from, to)
  const body = selected || placeholder
  const selectionStart = from + before.length
  return {
    from,
    to,
    insert: `${before}${body}${after}`,
    selectionStart,
    selectionEnd: selectionStart + body.length,
  }
}

const URL_RE = /^(?:https?:\/\/|mailto:|\/)\S+$/i

function insertLink(doc: string, from: number, to: number, url?: string): EditPatch {
  const selected = doc.slice(from, to).trim()

  if (url) {
    const label = selected || 'link text'
    const insert = `[${label}](${url})`
    const selectionStart = from + 1
    return { from, to, insert, selectionStart, selectionEnd: selectionStart + label.length }
  }

  // A selected URL becomes the destination; the label is what needs typing.
  if (URL_RE.test(selected)) {
    const insert = `[link text](${selected})`
    return { from, to, insert, selectionStart: from + 1, selectionEnd: from + 1 + 'link text'.length }
  }

  const label = selected || 'link text'
  const insert = `[${label}](https://)`
  const urlStart = from + label.length + 3
  return { from, to, insert, selectionStart: urlStart, selectionEnd: urlStart + 'https://'.length }
}

const TABLE_BLOCK = ['| Column | Column |', '| --- | --- |', '|  |  |'].join('\n')

/**
 * `:::` section scaffolds. Each one is a complete, renderable block: the author
 * types over the highlighted placeholder and fills in the rest in place.
 */
export type SectionActionId = Extract<InsertActionId, `section${string}`>

const SECTION_BLOCKS: Record<SectionActionId, { block: string; placeholder: string }> = {
  sectionHero: {
    placeholder: 'Hero title',
    block: [
      ':::hero eyebrow="Featured" title="Hero title"',
      'Drop an image or a {{youtube VIDEO_ID}} embed here.',
      ':::',
    ].join('\n'),
  },
  sectionGrid: {
    placeholder: 'Grid title',
    block: [
      ':::grid cols=3 title="Grid title"',
      ':::card title="First card" meta="Caption"',
      '![](https://)',
      ':::',
      ':::card title="Second card" meta="Caption"',
      '![](https://)',
      ':::',
      ':::',
    ].join('\n'),
  },
  sectionCard: {
    placeholder: 'Card title',
    block: [':::card title="Card title" meta="Caption"', '![](https://)', ':::'].join('\n'),
  },
  sectionSplit: {
    placeholder: 'Split title',
    block: [
      ':::split title="Split title"',
      ':::pane',
      '![](https://)',
      ':::',
      ':::pane',
      'What this side says.',
      '',
      ':::actions',
      '[Read it](https://) [Buy it](https://)',
      ':::',
      ':::',
      ':::',
    ].join('\n'),
  },
  sectionPosts: {
    placeholder: 'Recent updates',
    block: [
      ':::posts title="Recent updates"',
      ':::post date="Jan 1, 2026" title="First update" href="/"',
      'A sentence or two of summary.',
      ':::',
      ':::',
    ].join('\n'),
  },
  sectionPost: {
    placeholder: 'Update title',
    block: [
      ':::post date="Jan 1, 2026" title="Update title" href="/"',
      'A sentence or two of summary.',
      ':::',
    ].join('\n'),
  },
  sectionMeter: {
    placeholder: 'Goal title',
    block: [
      ':::meter title="Goal title" value=15 max=100 label=members',
      'What happens when the goal is reached.',
      ':::',
    ].join('\n'),
  },
  sectionColumns: {
    placeholder: 'Credits',
    block: [
      ':::columns cols=3 title="Credits"',
      ':::column title="First group"',
      '- Name',
      ':::',
      ':::column title="Second group"',
      '- Name',
      ':::',
      ':::',
    ].join('\n'),
  },
  sectionActions: {
    placeholder: 'First button',
    block: [':::actions', '[First button](https://) [Second button](https://)', ':::'].join('\n'),
  },
  sectionScroller: {
    placeholder: 'You may also like',
    block: [
      ':::scroller title="You may also like"',
      ':::card title="First card"',
      '![](https://)',
      ':::',
      ':::card title="Second card"',
      '![](https://)',
      ':::',
      ':::',
    ].join('\n'),
  },
}

export const SECTION_ACTION_IDS = Object.keys(SECTION_BLOCKS) as SectionActionId[]

function insertSection(doc: string, from: number, to: number, id: SectionActionId): EditPatch {
  const { block, placeholder } = SECTION_BLOCKS[id]
  return insertBlock(doc, from, to, block, block.indexOf(placeholder), placeholder.length)
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface ActionContext {
  /** Destination for `link`, or resolved image URL for `image`. */
  url?: string
  /** Label used for `image` alt text. */
  alt?: string
  /** Optional CommonMark title (align / thumb meta) for `image`. */
  title?: string
}

function noopPatch(doc: string, from: number, to: number): EditPatch {
  return { from, to, insert: doc.slice(from, to), selectionStart: from, selectionEnd: to }
}

function applyImageAlign(
  doc: string,
  from: number,
  to: number,
  align: ImageAlign,
): EditPatch {
  return setImageAlignAt(doc, from, to, align) ?? noopPatch(doc, from, to)
}

function applyImageSize(
  doc: string,
  from: number,
  to: number,
  size: ImageSize,
): EditPatch {
  return setImageSizeAt(doc, from, to, size) ?? noopPatch(doc, from, to)
}

function applyImageCrop(
  doc: string,
  from: number,
  to: number,
  crop: ImageCrop,
): EditPatch {
  return setImageCropAt(doc, from, to, crop) ?? noopPatch(doc, from, to)
}

function applyImageGap(
  doc: string,
  from: number,
  to: number,
  gap: ImageGap,
): EditPatch {
  return setImageGapAt(doc, from, to, gap) ?? noopPatch(doc, from, to)
}

function applyImageMove(
  doc: string,
  from: number,
  to: number,
  direction: -1 | 1,
): EditPatch {
  const pos = findImageAt(doc, from)?.from ?? findImageAt(doc, to)?.from ?? from
  return moveBlockContaining(doc, pos, direction) ?? noopPatch(doc, from, to)
}

export function applyAction(
  doc: string,
  from: number,
  to: number,
  id: EditorActionId,
  context: ActionContext = {},
): EditPatch {
  switch (id) {
    case 'bold':
    case 'italic':
    case 'strike':
    case 'code':
      return toggleInline(doc, from, to, id)

    case 'h1':
    case 'h2':
    case 'h3':
      return toggleHeading(doc, from, to, id)

    case 'bullet':
    case 'numbered':
    case 'task':
    case 'quote':
      return toggleList(doc, from, to, id)

    case 'link':
      return insertLink(doc, from, to, context.url)

    case 'image': {
      if (context.url) {
        const alt = context.alt ?? doc.slice(from, to) ?? ''
        const title = context.title?.trim()
        const markdown = title
          ? `![${alt}](${context.url} "${title}")`
          : `![${alt}](${context.url})`
        return insertBlock(doc, from, to, markdown, 2, alt.length)
      }
      return wrapOrInsert(doc, from, to, '![', '](https://)', 'alt text')
    }

    case 'imageAlignLeft':
      return applyImageAlign(doc, from, to, 'left')
    case 'imageAlignCenter':
      return applyImageAlign(doc, from, to, 'center')
    case 'imageAlignRight':
      return applyImageAlign(doc, from, to, 'right')

    case 'imageSizeSm':
      return applyImageSize(doc, from, to, 'sm')
    case 'imageSizeMd':
      return applyImageSize(doc, from, to, 'md')
    case 'imageSizeLg':
      return applyImageSize(doc, from, to, 'lg')
    case 'imageSizeFull':
      return applyImageSize(doc, from, to, 'full')

    case 'imageCropRounded':
      return applyImageCrop(doc, from, to, 'rounded')
    case 'imageCropCircle':
      return applyImageCrop(doc, from, to, 'circle')
    case 'imageCropSquare':
      return applyImageCrop(doc, from, to, 'square')
    case 'imageCropWide':
      return applyImageCrop(doc, from, to, 'wide')
    case 'imageCropTall':
      return applyImageCrop(doc, from, to, 'tall')

    case 'imageMasonry':
      return setImageMasonryAt(doc, from, to) ?? noopPatch(doc, from, to)

    case 'imageGapFlush':
      return applyImageGap(doc, from, to, 'flush')
    case 'imageGapSm':
      return applyImageGap(doc, from, to, 'sm')
    case 'imageGapMd':
      return applyImageGap(doc, from, to, 'md')
    case 'imageGapLg':
      return applyImageGap(doc, from, to, 'lg')

    case 'imageMoveUp':
      return applyImageMove(doc, from, to, -1)
    case 'imageMoveDown':
      return applyImageMove(doc, from, to, 1)

    case 'wikilink':
      return wrapOrInsert(doc, from, to, '[[', ']]', '')

    case 'crosslink':
      return wrapOrInsert(doc, from, to, '[[@', ']]', 'handle/wiki/note')

    case 'category':
      return wrapOrInsert(doc, from, to, '[[Category:', ']]', 'Topic')

    case 'infobox':
      return insertBlock(doc, from, to, '{{infobox name=Title|type=Topic}}', 15, 5)

    case 'youtube': {
      // A selected YouTube URL/id replaces the selection with a shortcode;
      // a bare caret drops a template block with the placeholder selected so
      // the author can paste over it.
      const selected = doc.slice(from, to).trim()
      const id = parseYouTubeId(selected)
      if (id) {
        const insert = `{{youtube ${id}}}`
        return { from, to, insert, selectionStart: from, selectionEnd: from + insert.length }
      }
      const placeholder = 'VIDEO_ID'
      // `{{youtube ` is 10 characters; the placeholder follows it.
      return insertBlock(doc, from, to, `{{youtube ${placeholder}}}`, 10, placeholder.length)
    }

    case 'codeblock': {
      const selected = doc.slice(from, to)
      const body = selected || 'code'
      return insertBlock(doc, from, to, `\`\`\`\n${body}\n\`\`\``, 4, body.length)
    }

    case 'table':
      return insertBlock(doc, from, to, TABLE_BLOCK, 2, 'Column'.length)

    case 'divider':
      return insertBlock(doc, from, to, '---', 3, 0)

    case 'sectionHero':
    case 'sectionGrid':
    case 'sectionCard':
    case 'sectionSplit':
    case 'sectionPosts':
    case 'sectionPost':
    case 'sectionMeter':
    case 'sectionColumns':
    case 'sectionActions':
    case 'sectionScroller':
      return insertSection(doc, from, to, id)
  }
}

/** Toolbar highlight state for the current selection. */
export function activeActions(doc: string, from: number, to: number): Set<EditorActionId> {
  const active = new Set<EditorActionId>()

  for (const id of ['bold', 'italic', 'strike', 'code'] as InlineActionId[]) {
    if (isInlineActive(doc, from, to, id)) active.add(id)
  }

  const line = doc.slice(lineStartAt(doc, from), lineEndAt(doc, from))
  const level = headingLevelOf(line)
  if (level === 1) active.add('h1')
  if (level === 2) active.add('h2')
  if (level === 3) active.add('h3')

  if (TASK_RE.test(line)) active.add('task')
  else if (BULLET_RE.test(line)) active.add('bullet')
  if (ORDERED_RE.test(line)) active.add('numbered')
  if (QUOTE_RE.test(line)) active.add('quote')

  const image = findImageAt(doc, from)
  if (image?.align === 'left') active.add('imageAlignLeft')
  if (image?.align === 'center') active.add('imageAlignCenter')
  if (image?.align === 'right') active.add('imageAlignRight')
  if (image) {
    const size = image.size ?? 'full'
    if (size === 'sm') active.add('imageSizeSm')
    if (size === 'md') active.add('imageSizeMd')
    if (size === 'lg') active.add('imageSizeLg')
    if (size === 'full') active.add('imageSizeFull')
    if (image.crop === 'rounded') active.add('imageCropRounded')
    if (image.crop === 'circle') active.add('imageCropCircle')
    if (image.crop === 'square') active.add('imageCropSquare')
    if (image.crop === 'wide') active.add('imageCropWide')
    if (image.crop === 'tall') active.add('imageCropTall')
    if (image.masonry) {
      active.add('imageMasonry')
      const gap = effectiveImageGap(image.gap)
      if (gap === 'flush') active.add('imageGapFlush')
      if (gap === 'sm') active.add('imageGapSm')
      if (gap === 'md') active.add('imageGapMd')
      if (gap === 'lg') active.add('imageGapLg')
    }
  }

  return active
}
