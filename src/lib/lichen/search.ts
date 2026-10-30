import type { LichenNoteWithContent } from '@/types/lichen'
import { parseNoteContent } from '@/lib/lichen/content-meta'
import { isBranchSlug } from '@/lib/lichen/branches'

export interface SearchResult {
  note: LichenNoteWithContent
  score: number
  snippet: string
}

export function searchWikiNotes(
  notes: LichenNoteWithContent[],
  query: string,
  limit = 20,
): SearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (terms.length === 0) return []

  const results: SearchResult[] = []

  for (const note of notes) {
    const parsed = parseNoteContent(note.content)
    if (parsed.status === 'draft') continue
    if (isBranchSlug(note.slug)) continue

    const titleLower = note.title.toLowerCase()
    const slugLower = note.slug.toLowerCase()
    const bodyLower = parsed.body.toLowerCase()
    const categoriesLower = parsed.categories.join(' ').toLowerCase()

    let score = 0
    for (const term of terms) {
      if (slugLower === term) score += 100
      if (titleLower.includes(term)) score += 50
      if (slugLower.includes(term)) score += 30
      if (categoriesLower.includes(term)) score += 20
      if (bodyLower.includes(term)) score += 10
    }

    if (score > 0) {
      const snippet = extractSnippet(parsed.body, terms[0])
      results.push({ note, score, snippet })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

function extractSnippet(body: string, term: string): string {
  const idx = body.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) {
    return body.slice(0, 120).trim() + (body.length > 120 ? '…' : '')
  }
  const start = Math.max(0, idx - 40)
  const end = Math.min(body.length, idx + term.length + 80)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < body.length ? '…' : ''
  return prefix + body.slice(start, end).replace(/\s+/g, ' ').trim() + suffix
}
