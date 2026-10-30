import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { LichenRevisionRecord } from '@/types/lichen'

const putRecord = vi.fn()

vi.mock('@/lib/atproto/lichen', async () => {
  const actual = await vi.importActual<typeof import('@/lib/atproto/lichen')>(
    '@/lib/atproto/lichen',
  )
  return {
    ...actual,
    writeNoteRecord: vi.fn(async (_agent, slug, title, wikiRef, _rkey, _repo, createdAt) => ({
      uri: `at://did:plc:me/wiki.lichen.note/${slug}`,
      cid: 'cid',
      slug,
      title,
      wikiRef,
      createdAt: createdAt ?? 'NOW',
    })),
    writeVerbatimRevision: vi.fn(async (_agent, revision) => {
      const uri = `at://did:plc:me/wiki.lichen.noteRevision/new-${putRecord.mock.calls.length}`
      putRecord(revision)
      return { ...revision, uri, cid: 'cid' }
    }),
  }
})

const { restoreNoteWithHistory, hasRestorableHistory } = await import(
  '@/lib/export/wiki-restore'
)

function revision(overrides: Partial<LichenRevisionRecord>): LichenRevisionRecord {
  return {
    uri: 'at://old/1',
    cid: 'cid',
    noteRef: 'at://old-note',
    diff: '',
    diffFormat: 'diff-match-patch',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('restoreNoteWithHistory', () => {
  beforeEach(() => putRecord.mockClear())

  it('preserves the original note creation time', async () => {
    const result = await restoreNoteWithHistory(
      {} as never,
      'at://wiki',
      'a-page',
      { slug: 'a-page', title: 'A Page', content: 'x', createdAt: '2020-05-05T00:00:00.000Z' },
      undefined,
    )
    expect(result.note.createdAt).toBe('2020-05-05T00:00:00.000Z')
    expect(result.revisionsReplayed).toBe(0)
  })

  it('replays revisions oldest first and rewrites the parent chain', async () => {
    const revisions = [
      revision({ uri: 'at://old/3', parentRevision: 'at://old/2', createdAt: '2024-03-01T00:00:00.000Z' }),
      revision({ uri: 'at://old/1', createdAt: '2024-01-01T00:00:00.000Z' }),
      revision({ uri: 'at://old/2', parentRevision: 'at://old/1', createdAt: '2024-02-01T00:00:00.000Z' }),
    ]

    const result = await restoreNoteWithHistory(
      {} as never,
      'at://wiki',
      'a-page',
      { slug: 'a-page', title: 'A Page', content: 'x' },
      revisions,
    )

    expect(result.revisionsReplayed).toBe(3)
    const written = putRecord.mock.calls.map((c) => c[0])

    // Chronological order, not the order they appeared in the file.
    expect(written.map((r) => r.createdAt)).toEqual([
      '2024-01-01T00:00:00.000Z',
      '2024-02-01T00:00:00.000Z',
      '2024-03-01T00:00:00.000Z',
    ])

    // Parents point at the newly minted URIs, never the stale ones.
    expect(written[0].parentRevision).toBeUndefined()
    expect(written[1].parentRevision).toBe(written[0].uri ?? 'at://did:plc:me/wiki.lichen.noteRevision/new-0')
    for (const r of written) {
      expect(r.parentRevision?.startsWith('at://old/')).toBeFalsy()
      expect(r.noteRef).toBe('at://did:plc:me/wiki.lichen.note/a-page')
    }
  })

  it('carries snapshots and messages through unchanged', async () => {
    await restoreNoteWithHistory(
      {} as never,
      'at://wiki',
      'p',
      { slug: 'p', title: 'P', content: 'x' },
      [revision({ snapshot: 'full text', message: 'Fixed a typo' })],
    )
    const written = putRecord.mock.calls[0][0]
    expect(written.snapshot).toBe('full text')
    expect(written.message).toBe('Fixed a typo')
  })
})

describe('hasRestorableHistory', () => {
  it('is false for absent or empty history', () => {
    expect(hasRestorableHistory(undefined)).toBe(false)
    expect(hasRestorableHistory({})).toBe(false)
    expect(hasRestorableHistory({ home: [] })).toBe(false)
  })

  it('is true when any note has revisions', () => {
    expect(hasRestorableHistory({ home: [revision({})] })).toBe(true)
  })
})
