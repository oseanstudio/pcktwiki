/** Detection and ranking for the `[[wikilink]]` typeahead. */

export type SuggestMode = 'note' | 'category'

export interface WikilinkContext {
  mode: SuggestMode
  /** Offset of the first character after `[[` (or after `[[Category:`). */
  queryStart: number
  /** Offset just past the query, excluding any closing `]]`. */
  queryEnd: number
  /** Offset just past the closing `]]`, when the brackets are already closed. */
  replaceEnd: number
  query: string
}

const CATEGORY_PREFIX = 'category:'

/**
 * Returns the wikilink being typed at `caret`, or `null` when the caret is not
 * inside an open `[[ … ]]`. When `from`/`to` describe a selection that sits
 * entirely inside a `[[ … ]]`, the selected text is used as the query instead.
 */
export function wikilinkContextAt(doc: string, caret: number): WikilinkContext | null {
  return wikilinkContextForRange(doc, caret, caret)
}

/**
 * Like {@link wikilinkContextAt} but accepts a selection range. When a
 * non-empty selection lies entirely inside `[[ … ]]`, the selected text becomes
 * the query and the replace span covers the selection — so the typeahead can
 * confirm-or-replace it. This powers "highlight a word → link it to a page".
 */
export function wikilinkContextForRange(
  doc: string,
  from: number,
  to: number,
): WikilinkContext | null {
  // Normalise so selFrom <= selTo regardless of selection direction.
  const selFrom = Math.min(from, to)
  const selTo = Math.max(from, to)
  const hasSelection = selFrom !== selTo

  const lineStart = doc.lastIndexOf('\n', selFrom - 1) + 1
  const open = doc.lastIndexOf('[[', selFrom)
  if (open < lineStart) return null
  // The selection must lie entirely inside the brackets — a selection that
  // starts at or before `[[` is not an "inner" selection.
  if (hasSelection && selFrom <= open + 1) return null

  const inner = doc.slice(open + 2, selTo)
  if (inner.includes(']]') || inner.includes('[[')) return null
  if (inner.includes('\n')) return null
  if (inner.startsWith('@')) return null

  const closing = doc.slice(selTo, selTo + 2) === ']]' ? selTo + 2 : selTo
  const lower = inner.toLowerCase()

  if (lower.startsWith(CATEGORY_PREFIX)) {
    return {
      mode: 'category',
      queryStart: open + 2 + CATEGORY_PREFIX.length,
      queryEnd: selTo,
      replaceEnd: closing,
      query: inner.slice(CATEGORY_PREFIX.length),
    }
  }

  if (inner.includes('|') || inner.includes('#')) return null

  // For a selection inside the brackets, the query is the selected text and the
  // replace span covers exactly the selection so picking a suggestion swaps it.
  if (hasSelection) {
    const selText = doc.slice(selFrom, selTo)
    if (selText.includes('\n')) return null
    return {
      mode: 'note',
      queryStart: selFrom,
      queryEnd: selTo,
      replaceEnd: closing,
      query: selText,
    }
  }

  return {
    mode: 'note',
    queryStart: open + 2,
    queryEnd: selTo,
    replaceEnd: closing,
    query: inner,
  }
}

export interface SuggestCandidate {
  /** Text inserted between the brackets. */
  value: string
  /** Primary line in the list. */
  label: string
  /** Secondary line, usually the slug. */
  detail?: string
  /** True when picking this creates a page that does not exist yet. */
  isNew?: boolean
}

function score(haystack: string, needle: string): number {
  if (!needle) return 1
  const value = haystack.toLowerCase()
  const index = value.indexOf(needle)
  if (index === 0) return 100 - haystack.length * 0.01
  if (index > 0) {
    const wordStart = index > 0 && /[\s\-/:]/.test(value[index - 1])
    return (wordStart ? 60 : 30) - index * 0.1
  }
  return subsequenceScore(value, needle)
}

/** Loose "fzf-style" fallback so `grdn` still finds `garden`. */
function subsequenceScore(haystack: string, needle: string): number {
  let cursor = 0
  for (const char of needle) {
    cursor = haystack.indexOf(char, cursor)
    if (cursor === -1) return -1
    cursor += 1
  }
  return 10 - haystack.length * 0.01
}

export interface SuggestSource {
  slug: string
  title: string
}

export function rankSuggestions(
  items: SuggestSource[],
  query: string,
  limit = 8,
): SuggestCandidate[] {
  const needle = query.trim().toLowerCase()

  const scored = items
    .map((item) => ({
      item,
      score: Math.max(score(item.slug, needle), score(item.title, needle)),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map<SuggestCandidate>(({ item }) => ({
      value: item.slug,
      label: item.title || item.slug,
      detail: item.title && item.title !== item.slug ? item.slug : undefined,
    }))

  const trimmed = query.trim()
  const exists = items.some(
    (item) => item.slug.toLowerCase() === trimmed.toLowerCase(),
  )
  if (trimmed && !exists) {
    scored.push({ value: trimmed, label: `Create “${trimmed}”`, isNew: true })
  }

  return scored
}
