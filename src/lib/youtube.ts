/**
 * YouTube video-id extraction and shortcode handling.
 *
 * The shortcode `{{youtube ID}}` (or a full youtube URL) embeds a
 * privacy-friendly (`youtube-nocookie.com`) iframe. Kept here, separate from
 * the markdown and CodeMirror integrations, so the parsing is unit-testable.
 */

/** Bare 11-character video id (YouTube ids are always 11 chars: A-Za-z0-9_-). */
const ID_RE = /^[A-Za-z0-9_-]{11}$/

/**
 * Pull an 11-character video id out of any common YouTube reference, or return
 * `null` when the input is not recognized. Accepts bare ids, `watch?v=`,
 * `youtu.be/`, `/embed/`, `/shorts/`, and `/live/` URLs, with optional extra
 * query params.
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  if (ID_RE.test(value)) return value

  // Try parsing as a URL first; fall back to plain string scanning so we also
  // catch paste slop like "youtu.be/ID?t=10" without a scheme.
  let pathname = ''
  let search = ''
  try {
    const url = new URL(value.match(/^https?:\/\//i) ? value : `https://${value}`)
    pathname = url.pathname
    search = url.search
  } catch {
    // Not a URL — look for an id-shaped run anywhere in the text.
    const match = value.match(/[A-Za-z0-9_-]{11}/)
    return match && ID_RE.test(match[0]) ? match[0] : null
  }

  const host = value.toLowerCase()
  // youtu.be/<id>
  if (host.includes('youtu.be')) {
    const id = pathname.split('/').filter(Boolean)[0]
    return id && ID_RE.test(id) ? id : null
  }

  // youtube.com/watch?v=<id>
  const v = new URLSearchParams(search).get('v')
  if (v && ID_RE.test(v)) return v

  // youtube.com/(embed|shorts|live)/<id>
  const segs = pathname.split('/').filter(Boolean)
  const known = ['embed', 'shorts', 'live', 'v']
  if (segs.length >= 2 && known.includes(segs[0])) {
    return ID_RE.test(segs[1]) ? segs[1] : null
  }

  return null
}

/** Embed URL for the privacy-friendly `youtube-nocookie.com` origin. */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}

/** Thumbnail (16:9 hqdefault) served by YouTube's public CDN. */
export function youTubeThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

/**
 * Build the sanitized inline HTML for a `{{youtube ...}}` shortcode. Returns an
 * empty string when the id cannot be parsed so the caller can leave the raw
 * shortcode in place.
 */
export function buildYouTubeEmbedHtml(raw: string): string {
  const id = parseYouTubeId(raw)
  if (!id) return ''
  return (
    `<span class="yt-embed"><iframe class="yt-iframe" ` +
    `src="${youTubeEmbedUrl(id)}" ` +
    `title="YouTube video" width="560" height="315" loading="lazy" ` +
    `allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
    `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></span>`
  )
}
