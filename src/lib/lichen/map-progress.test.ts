import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Agent } from '@atproto/api'
import {
  getDiscovered,
  markDiscovered,
  mergeDiscovered,
  resetProgress,
  syncMapProgress,
} from '@/lib/lichen/map-progress'

const WIKI = 'at://did:plc:reader/wiki.lichen.wiki/world'
const DID = 'did:plc:reader'

/**
 * The suite runs in the `node` environment, so stand up just enough of the two
 * browser globals the module touches.
 */
function installBrowserGlobals() {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} },
  })
}

interface FakeRecord {
  uri: string
  value: Record<string, unknown>
}

function fakeAgent(remote: FakeRecord[]) {
  const putRecord = vi.fn(async (_input: Record<string, unknown>) => ({ data: {} }))
  const createRecord = vi.fn(async (_input: Record<string, unknown>) => ({
    data: { uri: `at://${DID}/x/new` },
  }))
  const agent = {
    accountDid: DID,
    com: {
      atproto: {
        repo: {
          listRecords: async () => ({ data: { records: remote, cursor: undefined } }),
          putRecord,
          createRecord,
        },
      },
    },
  }
  return { agent: agent as unknown as Agent, putRecord, createRecord }
}

function progressRecord(discovered: string[], rkey = 'abc'): FakeRecord {
  return {
    uri: `at://${DID}/wiki.pckt.mapProgress/${rkey}`,
    value: { wikiRef: WIKI, discovered, updatedAt: '2026-07-01T00:00:00.000Z' },
  }
}

beforeEach(() => {
  installBrowserGlobals()
})

describe('mergeDiscovered', () => {
  it('unions both sides without duplicates', () => {
    expect(mergeDiscovered(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('never drops a place present on only one side', () => {
    expect(mergeDiscovered(['local'], [])).toEqual(['local'])
    expect(mergeDiscovered([], ['remote'])).toEqual(['remote'])
  })
})

describe('local discovery', () => {
  it('records a place once and reports whether it was new', () => {
    expect(markDiscovered(WIKI, 'harbor')).toBe(true)
    expect(markDiscovered(WIKI, 'harbor')).toBe(false)
    expect([...getDiscovered(WIKI)]).toEqual(['harbor'])
  })

  it('keeps wikis separate', () => {
    markDiscovered(WIKI, 'harbor')
    markDiscovered('at://did:plc:reader/wiki.lichen.wiki/other', 'elsewhere')
    expect([...getDiscovered(WIKI)]).toEqual(['harbor'])
  })

  it('ignores empty input', () => {
    expect(markDiscovered(WIKI, '')).toBe(false)
    expect(markDiscovered('', 'harbor')).toBe(false)
  })

  it('fogs the map again on reset', () => {
    markDiscovered(WIKI, 'harbor')
    resetProgress(WIKI)
    expect(getDiscovered(WIKI).size).toBe(0)
  })
})

describe('syncMapProgress', () => {
  it('pulls places found on another device', async () => {
    markDiscovered(WIKI, 'harbor')
    const { agent } = fakeAgent([progressRecord(['capital'])])

    const result = await syncMapProgress(agent, WIKI)

    expect([...result.discovered]).toEqual(['capital', 'harbor'])
    expect(result.pulled).toBe(1)
    expect([...getDiscovered(WIKI)]).toEqual(['capital', 'harbor'])
  })

  it('pushes local finds up to the existing record rather than making a new one', async () => {
    markDiscovered(WIKI, 'harbor')
    const { agent, putRecord, createRecord } = fakeAgent([progressRecord(['capital'], 'rk1')])

    await syncMapProgress(agent, WIKI)

    expect(createRecord).not.toHaveBeenCalled()
    expect(putRecord).toHaveBeenCalledOnce()
    expect(putRecord.mock.calls[0][0]).toMatchObject({
      rkey: 'rk1',
      record: { wikiRef: WIKI, discovered: ['capital', 'harbor'] },
    })
  })

  it('creates the first record for a reader who has none', async () => {
    markDiscovered(WIKI, 'harbor')
    const { agent, createRecord, putRecord } = fakeAgent([])

    await syncMapProgress(agent, WIKI)

    expect(putRecord).not.toHaveBeenCalled()
    expect(createRecord).toHaveBeenCalledOnce()
  })

  it('writes nothing when both sides already agree', async () => {
    markDiscovered(WIKI, 'harbor')
    const { agent, putRecord, createRecord } = fakeAgent([progressRecord(['harbor'])])

    await syncMapProgress(agent, WIKI)

    expect(putRecord).not.toHaveBeenCalled()
    expect(createRecord).not.toHaveBeenCalled()
  })

  it('writes nothing for a reader who has discovered nothing anywhere', async () => {
    const { agent, putRecord, createRecord } = fakeAgent([])

    const result = await syncMapProgress(agent, WIKI)

    expect(result.discovered.size).toBe(0)
    expect(putRecord).not.toHaveBeenCalled()
    expect(createRecord).not.toHaveBeenCalled()
  })

  it('does not let a device with no local progress erase the account copy', async () => {
    const { agent, putRecord, createRecord } = fakeAgent([progressRecord(['capital', 'harbor'])])

    const result = await syncMapProgress(agent, WIKI)

    expect([...result.discovered]).toEqual(['capital', 'harbor'])
    expect(putRecord).not.toHaveBeenCalled()
    expect(createRecord).not.toHaveBeenCalled()
  })

  it('ignores progress records belonging to a different wiki', async () => {
    const otherWiki: FakeRecord = {
      uri: `at://${DID}/wiki.pckt.mapProgress/other`,
      value: { wikiRef: 'at://did:plc:reader/wiki.lichen.wiki/elsewhere', discovered: ['ghost'] },
    }
    markDiscovered(WIKI, 'harbor')
    const { agent } = fakeAgent([otherWiki])

    const result = await syncMapProgress(agent, WIKI)

    expect([...result.discovered]).toEqual(['harbor'])
  })
})
