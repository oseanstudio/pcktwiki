import { parseNoteContent } from '@/lib/lichen/content-meta'
import type { LichenNoteWithContent } from '@/types/lichen'

export interface NotePreview {
  slug: string
  title: string
  /** Plain-text lead, already truncated for the card. */
  text: string
  /** First body image or infobox image, unresolved (may be a `blob:cid` ref). */
  imageSrc?: string
  isStub: boolean
}

const IMAGE_RE = /!\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+[^)]*)?\)/
const INFOBOX_BLOCK_RE = /\{\{infobox[\s\S]*?\}\}/gi
const EMBED_RE = /\{\{embed:[^}]*\}\}/gi
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/** Wikipedia-style lead: prose only, no markup, no headings, no boilerplate. */
export function plainTextFromMarkdown(body: string): string {
  let text = body
    .replace(HTML_COMMENT_RE, '')
    .replace(INFOBOX_BLOCK_RE, '')
    .replace(EMBED_RE, '')
    // Fenced and inline code keep their text but lose their fences.
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    // Images drop out entirely; the thumbnail carries them instead.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[Category:[^\]]*\]\]/gi, '')
    // Wikilinks and markdown links collapse to their label.
    .replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
      const pipe = inner.indexOf('|')
      const label = pipe >= 0 ? inner.slice(pipe + 1) : inner
      return label.split('#')[0].trim() || label.trim()
    })
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    // Emphasis, strikethrough, quotes, list bullets, rules.
    .replace(/(\*\*\*|\*\*|\*|___|__|_|~~)/g, '')
    // Headings go entirely — a lead extract is prose, not section titles.
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s{0,3}([-*_]\s*){3,}$/gm, '')

  text = text.replace(/\r\n?/g, '\n')
  return text
}

/**
 * First real paragraph(s) of prose, joined until `maxChars` is reached and cut
 * on a word boundary. Tables and stray single-word lines are skipped so a card
 * never leads with markup leftovers.
 */
export function leadTextFromMarkdown(body: string, maxChars = 260): string {
  const paragraphs = plainTextFromMarkdown(body)
    .split(/\n\s*\n/)
    .map((para) => para.replace(/\s+/g, ' ').trim())
    .filter((para) => para.length > 0 && !para.startsWith('|'))

  let out = ''
  for (const para of paragraphs) {
    if (!out) out = para
    else if (out.length < maxChars * 0.6) out = `${out} ${para}`
    else break
    if (out.length >= maxChars) break
  }

  if (!out) return ''
  if (out.length <= maxChars) return out

  const cut = out.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '')}…`
}

/** Lead image: infobox `image=` wins, else the first image in the body. */
export function leadImageFromNote(body: string, infoboxImage?: string): string | undefined {
  if (infoboxImage) return infoboxImage
  const match = body.match(IMAGE_RE)
  return match ? match[1] : undefined
}

export function buildNotePreview(note: LichenNoteWithContent): NotePreview {
  const parsed = parseNoteContent(note.content)
  const infoboxImage = parsed.infoboxes.find(
    (field) => field.key === 'image' || field.key === 'img',
  )?.value
  const text = leadTextFromMarkdown(parsed.body)

  return {
    slug: note.slug,
    title: note.title,
    text,
    imageSrc: leadImageFromNote(parsed.body, infoboxImage),
    isStub: parsed.status === 'stub' || !text,
  }
}
