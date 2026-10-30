import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { LichenWikiRecord } from '@/types/lichen'
import type { WikiBundleData } from '@/lib/export/wiki-bundle'

const putWikiAtSlug = vi.fn(async (_agent, _slug, wiki) => wiki)
const saveFork = vi.fn()

vi.mock('@/lib/atproto/lichen', () => ({ putWikiAtSlug }))
vi.mock('@/lib/lichen/fork', () => ({ saveFork }))
vi.mock('@/lib/lichen/fork-discovery', () => ({
  resolveHandle: vi.fn(async () => 'alice.test'),
}))

const { trackImportAsFork, bundleForkSource } = await import('@/lib/export/bundle-fork')

function bundle(overrides: Partial<WikiBundleData['manifest']['wiki']> = {}): WikiBundleData {
  return {
    manifest: {
      version: 3,
      exportedAt: '2026-01-01T00:00:00.000Z',
      wiki: {
        name: 'Notes',
        slug: 'notes',
        language: 'en',
        visibility: 'public',
        uri: 'at://did:plc:alice/wiki.lichen.wiki/notes',
        ownerDid: 'did:plc:alice',
        ...overrides,
      },
      noteCount: 1,
    },
    notes: [{ slug: 'home', title: 'Home', content: 'Original text' }],
  }
}

const wiki: LichenWikiRecord = {
  uri: 'at://did:plc:me/wiki.lichen.wiki/my-notes',
  cid: 'cid',
  slug: 'my-notes',
  ownerDid: 'did:plc:me',
  name: 'My Notes',
  visibility: 'public',
  language: 'en',
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('bundleForkSource', () => {
  it('reads provenance from the manifest', () => {
    expect(bundleForkSource(bundle())).toEqual({
      uri: 'at://did:plc:alice/wiki.lichen.wiki/notes',
      did: 'did:plc:alice',
      slug: 'notes',
    })
  })

  it('is null for a bundle with no provenance', () => {
    expect(bundleForkSource(bundle({ uri: undefined, ownerDid: undefined }))).toBeNull()
  })
})

describe('trackImportAsFork', () => {
  beforeEach(() => {
    putWikiAtSlug.mockClear()
    saveFork.mockClear()
  })

  it('writes provenance onto the new wiki record', async () => {
    await trackImportAsFork({} as never, bundle(), { ...wiki }, { forkHandle: 'me.test' })
    const written = putWikiAtSlug.mock.calls[0][2] as LichenWikiRecord
    expect(written.forkedFrom).toBe('at://did:plc:alice/wiki.lichen.wiki/notes')
    expect(written.forkedAt).toBeTruthy()
  })

  it('uses bundle contents as the merge baseline', async () => {
    const record = await trackImportAsFork(
      {} as never,
      bundle(),
      { ...wiki },
      { forkHandle: 'me.test' },
    )
    expect(record?.baselines.home.sourceContent).toBe('Original text')
    expect(record?.sourceHandle).toBe('alice.test')
    expect(saveFork).toHaveBeenCalledOnce()
  })

  it('does nothing for a bundle with no provenance', async () => {
    const record = await trackImportAsFork(
      {} as never,
      bundle({ uri: undefined, ownerDid: undefined }),
      { ...wiki },
      { forkHandle: 'me.test' },
    )
    expect(record).toBeNull()
    expect(putWikiAtSlug).not.toHaveBeenCalled()
    expect(saveFork).not.toHaveBeenCalled()
  })

  it('refuses to make a wiki its own upstream', async () => {
    const selfBundle = bundle({ uri: wiki.uri, ownerDid: 'did:plc:me' })
    const record = await trackImportAsFork(
      {} as never,
      selfBundle,
      { ...wiki },
      { forkHandle: 'me.test' },
    )
    expect(record).toBeNull()
    expect(saveFork).not.toHaveBeenCalled()
  })
})
