/**
 * Typed relationship wikilinks.
 * Format: [[rel:<type>:<target-slug>|Optional label]]
 * Example: [[rel:allied_with:house-vale|House Vale]]
 */

export const REL_PREFIX = 'rel:'

export interface RelationEdge {
  type: string
  sourceSlug: string
  targetSlug: string
  label: string
}

export interface ParsedRelationTarget {
  type: string
  targetSlug: string
}

export function parseRelationFromWikilink(noteSlug: string): ParsedRelationTarget | null {
  if (!noteSlug.startsWith(REL_PREFIX)) return null
  const rest = noteSlug.slice(REL_PREFIX.length)
  const colon = rest.indexOf(':')
  if (colon <= 0) return null
  const type = rest.slice(0, colon).trim().toLowerCase().replace(/\s+/g, '_')
  const targetSlug = rest.slice(colon + 1).trim()
  if (!type || !targetSlug) return null
  return { type, targetSlug }
}

export function relationWikilink(type: string, targetSlug: string, label?: string): string {
  const normalizedType = type.trim().toLowerCase().replace(/\s+/g, '_')
  const inner = `${REL_PREFIX}${normalizedType}:${targetSlug}`
  return label ? `[[${inner}|${label}]]` : `[[${inner}]]`
}

export function extractRelations(
  content: string,
  sourceSlug: string,
  wikiSlug?: string,
): RelationEdge[] {
  // Lazy import avoided — callers pass extractWikilinks results or we scan here
  const edges: RelationEdge[] = []
  let pos = 0
  while (pos < content.length) {
    if (content[pos] === '[' && content[pos + 1] === '[') {
      const closeIdx = content.indexOf(']]', pos + 2)
      if (closeIdx === -1) break
      const inner = content.slice(pos + 2, closeIdx)
      const pipeIdx = inner.indexOf('|')
      const beforePipe = (pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner).trim()
      const label = (pipeIdx >= 0 ? inner.slice(pipeIdx + 1) : '').trim()
      const hashIdx = beforePipe.indexOf('#')
      const rawTarget = (hashIdx >= 0 ? beforePipe.slice(0, hashIdx) : beforePipe).trim()
      const parsed = parseRelationFromWikilink(rawTarget)
      if (parsed) {
        edges.push({
          type: parsed.type,
          sourceSlug,
          targetSlug: parsed.targetSlug,
          label: label || parsed.targetSlug,
        })
      }
      pos = closeIdx + 2
    } else {
      pos += 1
    }
  }
  void wikiSlug
  return edges
}

export function collectWikiRelations(
  notes: { slug: string; content: string }[],
): RelationEdge[] {
  const edges: RelationEdge[] = []
  for (const note of notes) {
    edges.push(...extractRelations(note.content, note.slug))
  }
  return edges
}

export function relationsForNote(
  edges: RelationEdge[],
  noteSlug: string,
): { outgoing: RelationEdge[]; incoming: RelationEdge[] } {
  return {
    outgoing: edges.filter((edge) => edge.sourceSlug === noteSlug),
    incoming: edges.filter((edge) => edge.targetSlug === noteSlug),
  }
}

export function formatRelationType(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
