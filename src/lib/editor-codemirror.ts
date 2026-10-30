import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import {
  applyAction,
  type ActionContext,
  type EditorActionId,
  type EditPatch,
} from '@/lib/editor/actions'
import {
  applyEditorInsert,
  type EditorInsertAction,
  type EditorInsertResult,
} from '@/lib/editor-insert'
import type { EditorTarget } from '@/lib/editor-target'

export function getEditorSelection(view: EditorView) {
  const main = view.state.selection.main
  return { start: main.from, end: main.to }
}

/** Apply a contiguous patch without rewriting the whole document. */
export function applyEditPatchToView(view: EditorView, patch: EditPatch): EditPatch {
  view.dispatch({
    changes: { from: patch.from, to: patch.to, insert: patch.insert },
    selection: { anchor: patch.selectionStart, head: patch.selectionEnd },
    scrollIntoView: true,
  })
  view.focus()
  return patch
}

export function applyEditorActionToView(
  view: EditorView,
  id: EditorActionId,
  context: ActionContext = {},
): EditPatch {
  const { start, end } = getEditorSelection(view)
  const doc = view.state.doc.toString()
  return applyEditPatchToView(view, applyAction(doc, start, end, id, context))
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a[i] === b[i]) i += 1
  return i
}

function commonSuffixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1
  return i
}

/**
 * Apply a legacy insert action with a minimal document change so CodeMirror
 * history stays usable on large notes.
 */
export function applyEditorInsertToView(
  view: EditorView,
  action: EditorInsertAction,
): EditorInsertResult {
  const { start, end } = getEditorSelection(view)
  const current = view.state.doc.toString()
  const result = applyEditorInsert(current, start, end, action)

  const prefixLen = commonPrefixLength(current, result.text)
  const suffixLen = commonSuffixLength(current.slice(prefixLen), result.text.slice(prefixLen))
  const changeFrom = prefixLen
  const changeTo = current.length - suffixLen
  const insert = result.text.slice(prefixLen, result.text.length - suffixLen)

  view.dispatch({
    changes: { from: changeFrom, to: changeTo, insert },
    selection: { anchor: result.selectionStart, head: result.selectionEnd },
    scrollIntoView: true,
  })
  view.focus()
  return result
}

export function createCodemirrorTarget(view: EditorView): EditorTarget {
  return {
    get value() {
      return view.state.doc.toString()
    },
    get selectionStart() {
      return view.state.selection.main.from
    },
    get selectionEnd() {
      return view.state.selection.main.to
    },
    focus() {
      view.focus()
    },
    applyInsert(action) {
      return applyEditorInsertToView(view, action)
    },
    canUndo() {
      return undoDepth(view.state) > 0
    },
    canRedo() {
      return redoDepth(view.state) > 0
    },
    undo() {
      undo(view)
    },
    redo() {
      redo(view)
    },
  }
}
