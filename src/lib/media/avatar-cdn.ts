/**
 * Bluesky CDN serves full avatars at `/img/avatar/` (~1000²) and a small
 * variant at `/img/avatar_thumbnail/` (128²). Prefer the thumbnail whenever
 * the UI size is at or below that.
 */
const AVATAR_THUMB_MAX_PX = 128

export function sizedAvatarUrl(url: string | null | undefined, displaySizePx: number): string | null {
  if (!url) return null
  if (displaySizePx > AVATAR_THUMB_MAX_PX) return url
  if (!url.includes('cdn.bsky.app/img/avatar/')) return url
  return url.replace('/img/avatar/', '/img/avatar_thumbnail/')
}
