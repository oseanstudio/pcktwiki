import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()

export function createDiff(oldText: string, newText: string): string {
  const patches = dmp.patch_make(oldText, newText)
  return dmp.patch_toText(patches)
}

export function applyDiff(text: string, patchText: string): string {
  const result = tryApplyDiff(text, patchText)
  if (result === null) {
    throw new Error('Failed to apply patch')
  }
  return result
}

/** Returns null when a patch cannot be applied (corrupt or out-of-order revision). */
export function tryApplyDiff(text: string, patchText: string): string | null {
  if (!patchText.trim()) return text
  try {
    const patches = dmp.patch_fromText(patchText)
    const [result, applied] = dmp.patch_apply(patches, text)
    const failed = applied.filter((ok) => !ok)
    if (failed.length > 0) return null
    return result
  } catch {
    return null
  }
}

export function normalizeLF(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}
