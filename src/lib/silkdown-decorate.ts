import { RangeSetBuilder, type Text } from '@codemirror/state'
import { Decoration, type DecorationSet } from '@codemirror/view'
import type { EditorSelection } from '@codemirror/state'

export const HIDE = Decoration.replace({})
export const MUTED_MARK = Decoration.mark({ class: 'sd-mark' })

export function selectionTouchesRange(
  doc: Text,
  sel: EditorSelection,
  from: number,
  to: number,
): boolean {
  const cursorLine = doc.lineAt(sel.main.head).number
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(to).number
  return cursorLine >= startLine && cursorLine <= endLine
}

export function addBracketDecoration(
  builder: RangeSetBuilder<Decoration>,
  from: number,
  to: number,
  revealed: boolean,
  mark: Decoration,
) {
  const openEnd = from + 2
  const closeStart = to - 2
  // RangeSetBuilder requires ascending `from` (then startSide).
  if (revealed) {
    builder.add(from, openEnd, MUTED_MARK)
    builder.add(openEnd, closeStart, mark)
    builder.add(closeStart, to, MUTED_MARK)
  } else {
    builder.add(from, openEnd, HIDE)
    builder.add(openEnd, closeStart, mark)
    builder.add(closeStart, to, HIDE)
  }
}

export function finishDecorationSet(builder: RangeSetBuilder<Decoration>): DecorationSet {
  return builder.finish()
}
