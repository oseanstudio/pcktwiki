import { parseNoteContent } from '@/lib/lichen/content-meta'
import { findMarkdownImages } from '@/lib/editor/image-align'

const HTML_IMAGE_RE = /<img[^>]+src=["']([^"']+)["']/i

/**
 * First image URL suitable for small UI (search thumbs, cards). Prefers a
 * compact `thumb:` companion when the markdown image declares one.
 */
export function extractFirstImageUrl(content: string): string | null {
  const { body } = parseNoteContent(content)

  const markdownImages = findMarkdownImages(body)
  if (markdownImages.length) {
    const first = markdownImages[0]!
    return first.thumbUrl || first.url
  }

  const htmlMatch = body.match(HTML_IMAGE_RE)
  if (htmlMatch?.[1]) return htmlMatch[1]

  return null
}

/** Full-resolution image URL (ignores thumb companions). */
export function extractFirstFullImageUrl(content: string): string | null {
  const { body } = parseNoteContent(content)

  const markdownImages = findMarkdownImages(body)
  if (markdownImages.length) return markdownImages[0]!.url

  const htmlMatch = body.match(HTML_IMAGE_RE)
  if (htmlMatch?.[1]) return htmlMatch[1]

  return null
}
