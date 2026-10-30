import { describe, expect, it, afterEach } from 'vitest'
import {
  blobCid,
  clearSessionBlobPreviews,
  getSessionBlobPreview,
  isAtprotoBlobUrl,
  resolveBlobSrcSync,
  setSessionBlobPreview,
} from '@/lib/atproto/blobs'
import { setCachedPdsUrl } from '@/lib/atproto/handle-cache'

describe('atproto blob urls', () => {
  afterEach(() => {
    clearSessionBlobPreviews()
  })

  it('distinguishes AT Proto blob refs from browser object URLs', () => {
    expect(isAtprotoBlobUrl('blob:bafyreiaaa')).toBe(true)
    expect(isAtprotoBlobUrl('blob:https://example.com/uuid')).toBe(false)
    expect(isAtprotoBlobUrl('blob:null/uuid')).toBe(false)
    expect(isAtprotoBlobUrl('https://example.com/x.png')).toBe(false)
  })

  it('extracts CIDs from AT Proto blob refs only', () => {
    expect(blobCid('blob:bafyreiaaa')).toBe('bafyreiaaa')
    expect(blobCid('blob:https://example.com/uuid')).toBeNull()
  })

  it('rewrites blob:cid to getBlob when the PDS is cached', () => {
    setCachedPdsUrl('did:plc:owner', 'https://pds.example')
    expect(resolveBlobSrcSync('blob:bafyreiaaa', 'did:plc:owner')).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aowner&cid=bafyreiaaa',
    )
    expect(resolveBlobSrcSync('https://cdn.example/a.png', 'did:plc:owner')).toBe(
      'https://cdn.example/a.png',
    )
    expect(resolveBlobSrcSync('blob:bafyreiaaa', undefined)).toBeNull()
  })

  it('stores session object-URL previews for freshly uploaded blobs', () => {
    setSessionBlobPreview('blob:bafyreiaaa', 'blob:https://local/preview')
    expect(getSessionBlobPreview('blob:bafyreiaaa')).toBe('blob:https://local/preview')
    expect(getSessionBlobPreview({ ref: { $link: 'bafyreiaaa' } })).toBe(
      'blob:https://local/preview',
    )

    clearSessionBlobPreviews('blob:bafyreiaaa')
    expect(getSessionBlobPreview('blob:bafyreiaaa')).toBeNull()
  })
})
