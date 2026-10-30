import {
  applyEditorInsert,
  type EditorInsertAction,
  type EditorInsertResult,
} from '@/lib/editor-insert'

export interface EditorTarget {
  readonly value: string
  readonly selectionStart: number
  readonly selectionEnd: number
  focus(): void
  applyInsert(action: EditorInsertAction): EditorInsertResult
  canUndo(): boolean
  canRedo(): boolean
  undo(): void
  redo(): void
}

export function createTextareaTarget(textarea: HTMLTextAreaElement): EditorTarget {
  return {
    get value() {
      return textarea.value
    },
    get selectionStart() {
      return textarea.selectionStart
    },
    get selectionEnd() {
      return textarea.selectionEnd
    },
    focus() {
      textarea.focus()
    },
    applyInsert(action) {
      const result = applyEditorInsert(
        textarea.value,
        textarea.selectionStart,
        textarea.selectionEnd,
        action,
      )
      textarea.value = result.text
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
      textarea.focus()
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      return result
    },
    canUndo() {
      return false
    },
    canRedo() {
      return false
    },
    undo() {},
    redo() {},
  }
}
