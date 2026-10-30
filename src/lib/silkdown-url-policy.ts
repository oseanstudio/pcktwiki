import { defaultUrlPolicy, type UrlPolicy } from '@silkdown/core'
import {
  getSessionBlobPreview,
  isAtprotoBlobUrl,
  resolveBlobSrcSync,
} from '@/lib/atproto/blobs'

/**
 * Silkdown blocks unknown URL schemes (including AT Proto `blob:cid`), so
 * uploaded images would otherwise stay as raw markdown.
 *
 * Prefer a session object-URL preview (same approach as subheader link uploads)
 * so images show before the blob is attached to a record. Fall back to getBlob
 * once the wiki owner's PDS is known.
 */
export function createWikiUrlPolicy(ownerDid: string | undefined): UrlPolicy {
  return (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return null

    if (isAtprotoBlobUrl(trimmed)) {
      return getSessionBlobPreview(trimmed) ?? resolveBlobSrcSync(trimmed, ownerDid)
    }

    // getBlob URLs are already https — default policy accepts them.
    // Browser object URLs (blob:https://…) are allowed as policy return values
    // from session previews above; do not accept them as stored markdown srcs.
    return defaultUrlPolicy(trimmed)
  }
}
