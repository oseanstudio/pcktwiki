/**
 * Keystroke behaviours that make plain-text markdown feel like a real editor:
 * list continuation on Enter and list indentation on Tab.
 */

import { INDENT, lineEndAt, lineSpan, lineStartAt, type EditPatch } from '@/lib/editor/actions'

const LIST_PREFIX_RE =
  /^([ \t]*)(?:([-*+])|(\d+)([.)]))([ \t]+)(\[[ xX]\][ \t]+)?/
const QUOTE_PREFIX_RE = /^([ \t]*>[ \t]?)/

/**
 * Enter inside a list item continues the list. Enter on an empty item ends it,
 * outdenting one level first when the item is nested.
 */
export function continueBlock(doc: string, from: number, to: number): EditPatch | null {
  if (from !== to) return null

  const start = lineStartAt(doc, from)
  const beforeCaret = doc.slice(start, from)

  const list = beforeCaret.match(LIST_PREFIX_RE)
  if (list) {
    const [prefix, indent, bullet, ordinal, delimiter, space, task] = list
    const content = beforeCaret.slice(prefix.length)

    if (!content.trim()) {
      // Empty item: step out one level, or drop the marker entirely.
      const outdented = indent.length >= INDENT.length ? indent.slice(INDENT.length) : ''
      const marker = bullet
        ? `${bullet}${space}`
        : `${Number(ordinal)}${delimiter}${space}`
      const insert = indent.length >= INDENT.length
        ? `${outdented}${marker}${task ? '[ ] ' : ''}`
        : ''
      return {
        from: start,
        to: from,
        insert,
        selectionStart: start + insert.length,
        selectionEnd: start + insert.length,
      }
    }

    const marker = bullet
      ? `${bullet}${space}`
      : `${Number(ordinal) + 1}${delimiter}${space}`
    const insert = `\n${indent}${marker}${task ? '[ ] ' : ''}`
    return {
      from,
      to,
      insert,
      selectionStart: from + insert.length,
      selectionEnd: from + insert.length,
    }
  }

  const quote = beforeCaret.match(QUOTE_PREFIX_RE)
  if (quote) {
    const content = beforeCaret.slice(quote[0].length)
    if (!content.trim()) {
      return { from: start, to: from, insert: '', selectionStart: start, selectionEnd: start }
    }
    const insert = `\n${quote[1]}`
    return {
      from,
      to,
      insert,
      selectionStart: from + insert.length,
      selectionEnd: from + insert.length,
    }
  }

  return null
}

/**
 * Tab indents list items and any multi-line selection. Returns `null` elsewhere
 * so Tab keeps moving focus, which keyboard and screen-reader users rely on.
 */
export function indentLines(
  doc: string,
  from: number,
  to: number,
  outdent: boolean,
): EditPatch | null {
  const multiline = doc.slice(from, to).includes('\n')
  const currentLine = doc.slice(lineStartAt(doc, from), lineEndAt(doc, from))
  const inList = LIST_PREFIX_RE.test(currentLine) || QUOTE_PREFIX_RE.test(currentLine)

  if (!multiline && !inList) return null

  const { start, end } = lineSpan(doc, from, to)
  const lines = doc.slice(start, end).split('\n')

  let firstDelta = 0
  let totalDelta = 0

  const next = lines.map((line, index) => {
    if (outdent) {
      const removed = line.startsWith(INDENT)
        ? INDENT.length
        : line.startsWith('\t')
          ? 1
          : line.startsWith(' ')
            ? 1
            : 0
      if (index === 0) firstDelta = -removed
      totalDelta -= removed
      return line.slice(removed)
    }

    if (!line.trim() && lines.length > 1) return line
    if (index === 0) firstDelta = INDENT.length
    totalDelta += INDENT.length
    return `${INDENT}${line}`
  })

  const insert = next.join('\n')
  if (insert === doc.slice(start, end)) return null

  return {
    from: start,
    to: end,
    insert,
    selectionStart: Math.max(start, from + firstDelta),
    selectionEnd: Math.max(start, to + totalDelta),
  }
}
