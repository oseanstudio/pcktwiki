import { describe, expect, it } from 'vitest'
import { sizedAvatarUrl } from '@/lib/media/avatar-cdn'

describe('sizedAvatarUrl', () => {
  const full =
    'https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafyxxx@jpeg'

  it('rewrites small avatars to the thumbnail variant', () => {
    expect(sizedAvatarUrl(full, 40)).toBe(
      'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:x/bafyxxx@jpeg',
    )
    expect(sizedAvatarUrl(full, 128)).toBe(
      'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:x/bafyxxx@jpeg',
    )
  })

  it('keeps full avatar for larger displays', () => {
    expect(sizedAvatarUrl(full, 129)).toBe(full)
    expect(sizedAvatarUrl(full, 200)).toBe(full)
  })

  it('passes through non-CDN and empty URLs', () => {
    expect(sizedAvatarUrl(null, 40)).toBeNull()
    expect(sizedAvatarUrl('https://example.com/a.png', 40)).toBe('https://example.com/a.png')
  })
})
