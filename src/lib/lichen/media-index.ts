import type { LichenNoteWithContent } from '@/types/lichen'
import { isBlobUrl } from '@/lib/atproto/blobs'
import { findMarkdownImages } from '@/lib/editor/image-align'

export interface MediaAsset {
  /** Preferred display URL (thumb when available). */
  url: string
  /** Full-resolution blob/https URL. */
  fullUrl: string
  /** Original markdown title meta (thumb / dims / align) when present. */
  title: string | null
  noteSlug: string
  noteTitle: string
}

const HTML_IMAGE_RE = /<img[^>]+src=["']([^"']+)["']/gi

export function scanWikiMedia(notes: LichenNoteWithContent[]): MediaAsset[] {
  const assets: MediaAsset[] = []
  const seen = new Set<string>()

  for (const note of notes) {
    for (const image of findMarkdownImages(note.content)) {
      const display = image.thumbUrl || image.url
      if (!display || seen.has(image.url)) continue
      seen.add(image.url)
      assets.push({
        url: display,
        fullUrl: image.url,
        title: image.title,
        noteSlug: note.slug,
        noteTitle: note.title,
      })
    }

    HTML_IMAGE_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = HTML_IMAGE_RE.exec(note.content)) !== null) {
      const url = match[1]
      if (!url || seen.has(url)) continue
      seen.add(url)
      assets.push({
        url,
        fullUrl: url,
        title: null,
        noteSlug: note.slug,
        noteTitle: note.title,
      })
    }
  }

  return assets
}

export function orphanMediaAssets(
  assets: MediaAsset[],
  notes: LichenNoteWithContent[],
): MediaAsset[] {
  const allContent = notes.map((n) => n.content).join('\n')
  return assets.filter(
    (asset) => !allContent.includes(asset.fullUrl) && !allContent.includes(asset.url),
  )
}

export function isUploadableUrl(url: string): boolean {
  return isBlobUrl(url) || url.startsWith('https://')
}
