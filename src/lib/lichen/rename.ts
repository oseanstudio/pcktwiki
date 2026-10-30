import type { LichenNoteWithContent } from '@/types/lichen'
import { parseRelationFromWikilink } from '@/lib/lichen/relations'
import { setFrontmatterField } from '@/lib/lichen/frontmatter'

/**
 * Rewrite inbound wikilinks pointing at oldSlug to newSlug across notes.
 */
export function rewriteWikilinkSlug(content: string, oldSlug: string, newSlug: string): string {
  let result = ''
  let pos = 0
  while (pos < content.length) {
    if (content[pos] === '[' && content[pos + 1] === '[') {
      const closeIdx = content.indexOf(']]', pos + 2)
      if (closeIdx === -1) {
        result += content.slice(pos)
        break
      }
      const inner = content.slice(pos + 2, closeIdx)
      const pipeIdx = inner.indexOf('|')
      const beforePipe = (pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner).trim()
      const label = pipeIdx >= 0 ? inner.slice(pipeIdx + 1) : null
      const hashIdx = beforePipe.indexOf('#')
      const rawTarget = (hashIdx >= 0 ? beforePipe.slice(0, hashIdx) : beforePipe).trim()
      const section = hashIdx >= 0 ? beforePipe.slice(hashIdx) : ''

      const relation = parseRelationFromWikilink(rawTarget)
      let nextTarget = rawTarget
      if (relation && relation.targetSlug === oldSlug) {
        nextTarget = `rel:${relation.type}:${newSlug}`
      } else if (rawTarget === oldSlug) {
        nextTarget = newSlug
      }

      const rebuilt =
        label != null
          ? `[[${nextTarget}${section}|${label}]]`
          : `[[${nextTarget}${section}]]`
      result += rebuilt
      pos = closeIdx + 2
    } else {
      result += content[pos]
      pos += 1
    }
  }
  return result
}

export function buildRedirectContent(oldTitle: string, newSlug: string): string {
  return setFrontmatterField(
    `# Moved\n\nThis page moved to [[${newSlug}|${oldTitle}]].\n`,
    'redirect',
    newSlug,
  )
}

function contentReferencesSlug(content: string, slug: string): boolean {
  let pos = 0
  while (pos < content.length) {
    if (content[pos] === '[' && content[pos + 1] === '[') {
      const closeIdx = content.indexOf(']]', pos + 2)
      if (closeIdx === -1) break
      const inner = content.slice(pos + 2, closeIdx)
      const pipeIdx = inner.indexOf('|')
      const beforePipe = (pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner).trim()
      const hashIdx = beforePipe.indexOf('#')
      const rawTarget = (hashIdx >= 0 ? beforePipe.slice(0, hashIdx) : beforePipe).trim()
      const relation = parseRelationFromWikilink(rawTarget)
      if (relation?.targetSlug === slug || rawTarget === slug) return true
      pos = closeIdx + 2
    } else {
      pos += 1
    }
  }
  return false
}

export function collectRenameUpdates(
  notes: LichenNoteWithContent[],
  oldSlug: string,
  newSlug: string,
): Array<{ note: LichenNoteWithContent; nextContent: string }> {
  const updates: Array<{ note: LichenNoteWithContent; nextContent: string }> = []
  for (const note of notes) {
    if (note.slug === oldSlug) continue
    if (!contentReferencesSlug(note.content, oldSlug)) continue
    const nextContent = rewriteWikilinkSlug(note.content, oldSlug, newSlug)
    if (nextContent !== note.content) {
      updates.push({ note, nextContent })
    }
  }
  return updates
}
