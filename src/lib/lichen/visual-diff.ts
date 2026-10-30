import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  text: string
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)

  const lines: DiffLine[] = []

  for (const [op, text] of diffs) {
    const parts = text.split('\n')
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (op === 0) {
        if (part || !isLast) lines.push({ type: 'context', text: part })
      } else if (op === -1) {
        if (part || !isLast) lines.push({ type: 'remove', text: part })
      } else {
        if (part || !isLast) lines.push({ type: 'add', text: part })
      }
    }
  }

  return lines
}

export function escapeDiffHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/ /g, '\u00a0')
}
