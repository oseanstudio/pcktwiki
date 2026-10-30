import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { PublicWikiCacheEntry } from '@/lib/lichen/wiki-cache'
import type { LichenWikiRecord } from '@/types/lichen'

const writeWikiRecord = vi.fn(
  async (
    _agent: unknown,
    slug: string,
    name: string,
    visibility: string,
    language: string,
    _description?: string,
    _forkedFrom?: string,
    _forkedAt?: string,
  ) => ({
    uri: `at://did:plc:me/wiki.lichen.wiki/${slug}`,
    cid: 'cid',
    slug,
    ownerDid: 'did:plc:me',
    name,
    visibility,
    language,
    createdAt: '2026-01-01T00:00:00.000Z',
  }),
)

vi.mock('@/lib/atproto/lichen', () => ({
  writeWikiRecord,
  updateWikiTheme: vi.fn(async () => {}),
  writeMembershipRecord: vi.fn(async () => ({ uri: 'at://membership' })),
  writeNoteRecord: vi.fn(async (_a: unknown, slug: string) => ({
    uri: `at://note/${slug}`,
    slug,
  })),
  writeRevisionRecord: vi.fn(async () => ({ uri: 'at://rev' })),
  deleteWikiRecord: vi.fn(async () => {}),
}))

const { forkWiki } = await import('@/lib/lichen/fork-wiki')

function source(visibility: LichenWikiRecord['visibility']): PublicWikiCacheEntry {
  return {
    handle: 'alice.test',
    slug: 'notes',
    did: 'did:plc:alice',
    wiki: {
      uri: 'at://did:plc:alice/wiki.lichen.wiki/notes',
      cid: 'cid',
      slug: 'notes',
      ownerDid: 'did:plc:alice',
      name: 'Notes',
      visibility,
      language: 'en',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    noteRecords: [],
    revisionRecords: [],
    notesWithContent: [],
    fetchedAt: Date.now(),
  }
}

describe('forkWiki visibility', () => {
  beforeEach(() => writeWikiRecord.mockClear())

  const visibilityOf = () => writeWikiRecord.mock.calls[0][3]

  it('keeps a private source private', async () => {
    await forkWiki({} as never, source('private'), { slug: 'my-notes' })
    expect(visibilityOf()).toBe('private')
  })

  it('keeps a public source public', async () => {
    await forkWiki({} as never, source('public'), { slug: 'my-notes' })
    expect(visibilityOf()).toBe('public')
  })

  it('honours an explicit visibility override', async () => {
    await forkWiki({} as never, source('private'), {
      slug: 'my-notes',
      visibility: 'public',
    })
    expect(visibilityOf()).toBe('public')
  })

  it('records the source wiki as the fork parent', async () => {
    await forkWiki({} as never, source('public'), { slug: 'my-notes' })
    expect(writeWikiRecord.mock.calls[0][6]).toBe(
      'at://did:plc:alice/wiki.lichen.wiki/notes',
    )
  })
})
