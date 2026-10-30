export interface EditorSnapshot {
  text: string
  selectionStart: number
  selectionEnd: number
}

const MAX_UNDO_DEPTH = 200

export function captureEditorSnapshot(el: HTMLTextAreaElement): EditorSnapshot {
  return {
    text: el.value,
    selectionStart: el.selectionStart,
    selectionEnd: el.selectionEnd,
  }
}

function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot) {
  return (
    a.text === b.text &&
    a.selectionStart === b.selectionStart &&
    a.selectionEnd === b.selectionEnd
  )
}

export class EditorUndoStack {
  private undoStack: EditorSnapshot[] = []
  private redoStack: EditorSnapshot[] = []

  capture(snapshot: EditorSnapshot) {
    const top = this.undoStack[this.undoStack.length - 1]
    if (top && snapshotsEqual(top, snapshot)) return

    this.undoStack.push({ ...snapshot })
    if (this.undoStack.length > MAX_UNDO_DEPTH) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo(current: EditorSnapshot): EditorSnapshot | null {
    const previous = this.undoStack.pop()
    if (!previous) return null

    this.redoStack.push({ ...current })
    return previous
  }

  redo(current: EditorSnapshot): EditorSnapshot | null {
    const next = this.redoStack.pop()
    if (!next) return null

    this.undoStack.push({ ...current })
    return next
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }
}
