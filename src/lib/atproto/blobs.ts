import type { Agent } from '@atproto/api'
import { getCachedPdsUrl } from '@/lib/atproto/handle-cache'
import { resolvePdsUrl } from '@/lib/atproto/pds'

export async function uploadBlob(
  agent: Agent,
  file: File,
): Promise<{ ref: string; url: string; blob: unknown }> {
  const buffer = await file.arrayBuffer()
  const response = await agent.com.atproto.repo.uploadBlob(
    new Uint8Array(buffer) as unknown as Blob,
    { encoding: file.type || 'application/octet-stream' },
  )

  const blobRef = response.data.blob.ref.toString()
  return { ref: blobRef, url: `blob:${blobRef}`, blob: response.data.blob }
}

export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:') || url.includes('/xrpc/com.atproto.sync.getBlob')
}

/**
 * AT Proto markdown refs look like `blob:bafy…`. Browser object URLs look like
 * `blob:https://…` / `blob:null/…` — those must not be rewritten as CIDs.
 */
export function isAtprotoBlobUrl(url: string): boolean {
  if (!url.startsWith('blob:')) return false
  const rest = url.slice('blob:'.length)
  return rest.length > 0 && !rest.includes('://') && !rest.startsWith('null/')
}

/** Extract the CID string from any representation of a blob reference. */
export function blobCid(image: unknown): string | null {
  if (!image) return null
  if (typeof image === 'string') {
    if (!isAtprotoBlobUrl(image) && image.startsWith('blob:')) return null
    return image.startsWith('blob:') ? image.slice('blob:'.length) : null
  }
  if (typeof image !== 'object') return null

  const obj = image as { ref?: unknown; cid?: unknown }
  const ref = obj.ref
  if (typeof ref === 'string') return ref
  if (ref && typeof ref === 'object') {
    const link = (ref as { $link?: unknown }).$link
    if (typeof link === 'string') return link
    const asString = (ref as { toString?: () => string }).toString?.()
    if (asString && asString !== '[object Object]') return asString
  }
  if (typeof obj.cid === 'string') return obj.cid
  return null
}

export function buildBlobUrl(pdsUrl: string, did: string, cid: string): string {
  const base = pdsUrl.replace(/\/+$/, '')
  return `${base}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
}

/**
 * Synchronously rewrite an AT Proto `blob:cid` (or pass through https) for
 * `<img src>` / Silkdown. Returns null when the URL is blocked or the PDS is
 * not cached yet — callers should warm via `resolvePdsUrl` and retry.
 */
export function resolveBlobSrcSync(url: string, did: string | undefined): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (!did || !isAtprotoBlobUrl(trimmed)) return null
  const cid = blobCid(trimmed)
  if (!cid) return null
  const pdsUrl = getCachedPdsUrl(did)
  if (!pdsUrl) return null
  return buildBlobUrl(pdsUrl, did, cid)
}

/**
 * Resolve a stored blob reference (or absolute URL) into a fetchable image URL.
 * Absolute http(s) URLs pass through unchanged.
 */
export async function resolveBlobDisplayUrl(did: string, image: unknown): Promise<string | null> {
  if (typeof image === 'string' && /^https?:\/\//i.test(image)) return image
  const cid = blobCid(image)
  if (!cid) return null
  const pdsUrl = await resolvePdsUrl(did)
  return buildBlobUrl(pdsUrl, did, cid)
}

/**
 * Normalize any blob reference into plain JSON suitable for putRecord.
 * Avoids Vue Proxy / BlobRef class instances that break `instanceof BlobRef`
 * checks inside @atproto/lexicon stringifyLex.
 */
export function blobRefToJson(image: unknown): Record<string, unknown> | null {
  if (!image || typeof image !== 'object') return null

  const withToJson = image as { toJSON?: () => unknown }
  if (typeof withToJson.toJSON === 'function') {
    try {
      const json = withToJson.toJSON()
      if (json && typeof json === 'object') return json as Record<string, unknown>
    } catch {
      // fall through
    }
  }

  const obj = image as {
    $type?: unknown
    ref?: unknown
    mimeType?: unknown
    size?: unknown
    cid?: unknown
    original?: unknown
  }

  if (obj.$type === 'blob' && obj.ref != null && typeof obj.mimeType === 'string') {
    const link =
      typeof obj.ref === 'string'
        ? obj.ref
        : obj.ref && typeof obj.ref === 'object'
          ? String((obj.ref as { $link?: unknown; toString?: () => string }).$link ??
              (obj.ref as { toString?: () => string }).toString?.() ??
              '')
          : ''
    if (!link || link === '[object Object]') return null
    return {
      $type: 'blob',
      ref: { $link: link },
      mimeType: obj.mimeType,
      size: typeof obj.size === 'number' ? obj.size : 0,
    }
  }

  if (obj.original && typeof obj.original === 'object') {
    return blobRefToJson(obj.original)
  }

  const cid = blobCid(image)
  if (cid && typeof obj.mimeType === 'string') {
    return {
      $type: 'blob',
      ref: { $link: cid },
      mimeType: obj.mimeType,
      size: typeof obj.size === 'number' ? obj.size : 0,
    }
  }

  return null
}

/**
 * Freshly uploaded AT Proto blobs are not fetchable via getBlob until a record
 * references them. Subheader links use `URL.createObjectURL` for the same
 * reason — keep a session map so article markdown `blob:cid` refs preview live.
 */
const sessionBlobPreviews = new Map<string, string>()

function previewKey(image: unknown): string | null {
  if (typeof image === 'string' && isAtprotoBlobUrl(image)) return image
  const cid = blobCid(image)
  return cid ? `blob:${cid}` : null
}

/** Register a local object-URL preview for an AT Proto `blob:cid` ref. */
export function setSessionBlobPreview(image: unknown, objectUrl: string): void {
  const key = previewKey(image)
  if (!key) return
  const previous = sessionBlobPreviews.get(key)
  if (previous && previous !== objectUrl) URL.revokeObjectURL(previous)
  sessionBlobPreviews.set(key, objectUrl)
}

export function getSessionBlobPreview(image: unknown): string | null {
  const key = previewKey(image)
  return key ? (sessionBlobPreviews.get(key) ?? null) : null
}

/** Drop one preview, or all when `image` is omitted (e.g. editor unmount). */
export function clearSessionBlobPreviews(image?: unknown): void {
  if (image !== undefined) {
    const key = previewKey(image)
    if (!key) return
    const previous = sessionBlobPreviews.get(key)
    if (previous) URL.revokeObjectURL(previous)
    sessionBlobPreviews.delete(key)
    return
  }
  for (const url of sessionBlobPreviews.values()) URL.revokeObjectURL(url)
  sessionBlobPreviews.clear()
}
