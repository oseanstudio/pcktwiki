import { describe, expect, it } from 'vitest'
import { createDiff } from '@/lib/lichen/diff'
import {
  SNAPSHOT_INTERVAL,
  attachContentToNotes,
  buildNoteContents,
  reconstructAtRevision,
  replayNote,
  shouldSnapshot,
} from '@/lib/lichen/revisions'
import type { LichenNoteRecord, LichenRevisionRecord } from '@/types/lichen'

const NOTE = 'at://did:plc:test/wiki.lichen.note/note1'

/**
 * Unparseable patch text, standing in for a corrupt or truncated revision.
 * A merely mismatched diff is not reliable here: diff-match-patch applies
 * fuzzily and will often succeed anyway.
 */
const CORRUPT_DIFF = 'this is not a patch'

/** Build a real chain, so tests exercise diff-match-patch rather than stubs. */
function chain(texts: string[], opts: { snapshotAt?: number[] } = {}): LichenRevisionRecord[] {
  const revisions: LichenRevisionRecord[] = []
  let previous = ''
  texts.forEach((text, index) => {
    revisions.push({
      uri: `at://did:plc:test/wiki.lichen.noteRevision/r${index}`,
      cid: `cid${index}`,
      noteRef: NOTE,
      parentRevision: index === 0 ? undefined : revisions[index - 1].uri,
      diff: createDiff(previous, text),
      diffFormat: 'diff-match-patch',
      createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
      ...(opts.snapshotAt?.includes(index) ? { snapshot: text } : {}),
    })
    previous = text
  })
  return revisions
}

describe('replayNote', () => {
  it('reconstructs content from a clean chain', () => {
    const revisions = chain(['first', 'first and second', 'first and second and third'])
    const result = replayNote(NOTE, revisions)
    expect(result.content).toBe('first and second and third')
    expect(result.damaged).toEqual([])
    expect(result.states).toHaveLength(3)
    expect(result.latestRevisionUri).toBe(revisions[2].uri)
  })

  it('exposes content after each revision in order', () => {
    const revisions = chain(['a', 'ab', 'abc'])
    expect(replayNote(NOTE, revisions).states.map((s) => s.content)).toEqual(['a', 'ab', 'abc'])
  })

  it('ignores revisions belonging to other notes', () => {
    const revisions = chain(['mine'])
    const foreign: LichenRevisionRecord = {
      ...revisions[0],
      uri: 'at://did:plc:test/wiki.lichen.noteRevision/other',
      noteRef: 'at://did:plc:test/wiki.lichen.note/note2',
      diff: createDiff('', 'theirs'),
      parentRevision: undefined,
    }
    expect(replayNote(NOTE, [...revisions, foreign]).content).toBe('mine')
  })

  it('reports an unappliable diff instead of dropping it in silence', () => {
    const revisions = chain(['hello', 'hello world'])
    // A diff whose context no longer matches the document it is applied to.
    revisions[1] = { ...revisions[1], diff: CORRUPT_DIFF }

    const result = replayNote(NOTE, revisions)
    expect(result.damaged).toHaveLength(1)
    expect(result.damaged[0].uri).toBe(revisions[1].uri)
  })

  it('reports an unknown diff format rather than treating it as content', () => {
    const revisions = chain(['ok'])
    revisions[0] = { ...revisions[0], diffFormat: 'some-future-format' }
    const result = replayNote(NOTE, revisions)
    expect(result.damaged).toHaveLength(1)
    expect(result.content).toBe('')
  })

  it('keeps going after a bad diff instead of blanking the page', () => {
    const revisions = chain(['one', 'one two', 'one two three'])
    revisions[1] = { ...revisions[1], diff: CORRUPT_DIFF }

    const result = replayNote(NOTE, revisions)
    expect(result.damaged).toHaveLength(1)
    // The surviving text is still real content, not empty.
    expect(result.content).not.toBe('')
  })

  it('re-anchors to a snapshot and clears damage healed by it', () => {
    const revisions = chain(['v1', 'v2', 'v3'], { snapshotAt: [2] })
    // Break an early diff; the later snapshot must still restore exact content
    // and stop treating the page as incomplete.
    revisions[1] = { ...revisions[1], diff: CORRUPT_DIFF }

    const result = replayNote(NOTE, revisions)
    expect(result.damaged).toEqual([])
    expect(result.content).toBe('v3')
  })

  it('still reports damage that happens after the latest snapshot', () => {
    const revisions = chain(['v1', 'v2', 'v3'], { snapshotAt: [0] })
    revisions[2] = { ...revisions[2], diff: CORRUPT_DIFF }

    const result = replayNote(NOTE, revisions)
    expect(result.damaged).toHaveLength(1)
    expect(result.damaged[0].uri).toBe(revisions[2].uri)
    expect(result.content).toBe('v2')
  })

  it('prefers the snapshot over whatever the diffs produced', () => {
    const revisions = chain(['a', 'ab'], { snapshotAt: [1] })
    revisions[1] = { ...revisions[1], snapshot: 'authoritative text' }
    expect(replayNote(NOTE, revisions).content).toBe('authoritative text')
  })

  it('treats Keep-this-version style snapshots as accepting current text', () => {
    const revisions = chain(['a', 'ab', 'ab'])
    revisions[1] = { ...revisions[1], diff: CORRUPT_DIFF }
    revisions[2] = { ...revisions[2], snapshot: 'ab', message: 'Kept current page text' }

    const attached = attachContentToNotes(
      [
        {
          uri: NOTE,
          cid: 'c',
          slug: 'note',
          title: 'Note',
          wikiRef: 'at://did:plc:test/wiki.lichen.wiki/w',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      buildNoteContents(revisions),
    )
    expect(attached[0].content).toBe('ab')
    expect(attached[0].damagedRevisions).toBeUndefined()
  })

  it('applies a snapshot even when the parent chain is broken', () => {
    const revisions = chain(['a', 'ab', 'kept'])
    revisions[1] = {
      ...revisions[1],
      parentRevision: 'at://did:plc:test/wiki.lichen.noteRevision/ghost',
    }
    revisions[2] = {
      ...revisions[2],
      parentRevision: 'at://did:plc:test/wiki.lichen.noteRevision/ghost-2',
      snapshot: 'kept',
      message: 'Kept current page text',
    }

    const state = buildNoteContents(revisions).get(NOTE)
    expect(state?.content).toBe('kept')
    expect(state?.damaged).toEqual([])
  })

  it('normalizes CRLF in snapshots', () => {
    const revisions = chain(['x'], { snapshotAt: [0] })
    revisions[0] = { ...revisions[0], snapshot: 'line1\r\nline2' }
    expect(replayNote(NOTE, revisions).content).toBe('line1\nline2')
  })
})

describe('reconstructAtRevision', () => {
  it('stops at the requested revision', () => {
    const revisions = chain(['a', 'ab', 'abc'])
    expect(reconstructAtRevision(NOTE, revisions[1].uri, revisions)).toBe('ab')
  })

  it('returns the full content for the newest revision', () => {
    const revisions = chain(['a', 'ab', 'abc'])
    expect(reconstructAtRevision(NOTE, revisions[2].uri, revisions)).toBe('abc')
  })

  it('replays everything when the target is unknown', () => {
    const revisions = chain(['a', 'ab'])
    expect(reconstructAtRevision(NOTE, 'at://missing', revisions)).toBe('ab')
  })
})

describe('buildNoteContents', () => {
  it('keys content by note and carries damage through', () => {
    const revisions = chain(['a', 'ab'])
    revisions[1] = { ...revisions[1], diff: CORRUPT_DIFF }

    const state = buildNoteContents(revisions).get(NOTE)
    expect(state?.damaged).toHaveLength(1)
  })

  it('skips a revision that does not chain onto the last applied one', () => {
    const revisions = chain(['a', 'ab'])
    revisions[1] = { ...revisions[1], parentRevision: 'at://did:plc:test/wiki.lichen.noteRevision/ghost' }

    const state = buildNoteContents(revisions).get(NOTE)
    expect(state?.content).toBe('a')
    expect(state?.damaged.map((r) => r.uri)).toEqual([revisions[1].uri])
  })
})

describe('attachContentToNotes', () => {
  const note: LichenNoteRecord = {
    uri: NOTE,
    cid: 'c',
    slug: 'note',
    title: 'Note',
    wikiRef: 'at://did:plc:test/wiki.lichen.wiki/w',
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  it('leaves damagedRevisions unset when the chain is clean', () => {
    const attached = attachContentToNotes([note], buildNoteContents(chain(['hi'])))
    expect(attached[0].content).toBe('hi')
    expect(attached[0].damagedRevisions).toBeUndefined()
    expect(attached[0].damagedRevisionUris).toBeUndefined()
  })

  it('counts damaged revisions so the UI can warn', () => {
    const revisions = chain(['a', 'ab'])
    revisions[1] = { ...revisions[1], diff: CORRUPT_DIFF }
    const attached = attachContentToNotes([note], buildNoteContents(revisions))
    expect(attached[0].damagedRevisions).toBe(1)
    expect(attached[0].damagedRevisionUris).toEqual([revisions[1].uri])
  })

  it('defaults content for a note with no revisions', () => {
    const attached = attachContentToNotes([note], new Map())
    expect(attached[0].content).toBe('')
    expect(attached[0].latestRevisionUri).toBeNull()
  })
})

describe('shouldSnapshot', () => {
  it('snapshots once per interval', () => {
    expect(shouldSnapshot(SNAPSHOT_INTERVAL - 1)).toBe(true)
    expect(shouldSnapshot(SNAPSHOT_INTERVAL * 2 - 1)).toBe(true)
  })

  it('does not snapshot every revision', () => {
    expect(shouldSnapshot(0)).toBe(false)
    expect(shouldSnapshot(1)).toBe(false)
  })
})
