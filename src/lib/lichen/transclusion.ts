import { stripFrontmatter } from '@/lib/lichen/frontmatter'
import { slugifyHeading } from '@/lib/lichen/wikilinks'
import type { LichenNoteWithContent } from '@/types/lichen'

const EMBED_RE = /\{\{embed:([^}#]+)(?:#([^}]+))?\}\}/gi

/**
 * Expand {{embed:slug}} / {{embed:slug#Heading}} shortcodes using wiki notes.
 * Pulls the full body (minus frontmatter) or a matching ## section.
 */
export function expandEmbeds(
  source: string,
  notes: LichenNoteWithContent[],
  depth = 0,
): string {
  if (depth > 3) return source
  return source.replace(EMBED_RE, (_match, rawSlug: string, heading?: string) => {
    const slug = String(rawSlug).trim()
    const note = notes.find((item) => item.slug === slug)
    if (!note) return `<!-- missing embed: ${slug} -->`
    const body = stripFrontmatter(note.content).trim()
    if (!heading) {
      return expandEmbeds(body, notes, depth + 1)
    }
    const section = extractMarkdownSection(body, heading.trim())
    return expandEmbeds(section ?? `<!-- missing section ${heading} in ${slug} -->`, notes, depth + 1)
  })
}

function extractMarkdownSection(body: string, heading: string): string | null {
  const target = slugifyHeading(heading)
  const lines = body.split('\n')
  let start = -1
  let level = 0
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/)
    if (!match) continue
    if (slugifyHeading(match[2]) === target) {
      start = i + 1
      level = match[1].length
      break
    }
  }
  if (start < 0) return null
  const out: string[] = []
  for (let i = start; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+/)
    if (match && match[1].length <= level) break
    out.push(lines[i])
  }
  return out.join('\n').trim()
}
