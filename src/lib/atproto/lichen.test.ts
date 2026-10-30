import { describe, expect, it } from 'vitest'
import type { Agent } from '@atproto/api'
import { listNotes, listWikis } from '@/lib/atproto/lichen'

const DID = 'did:plc:test'

/** Minimal stand-in for the parts of Agent these readers touch. */
function stubAgent(records: { uri: string; cid: string; value: unknown }[]): Agent {
  return {
    accountDid: DID,
    com: {
      atproto: {
        repo: {
          listRecords: async () => ({ data: { records, cursor: undefined } }),
        },
      },
    },
  } as unknown as Agent
}

function noteRecord(subheaderLinks: unknown[]) {
  return [
    {
      uri: `at://${DID}/wiki.lichen.note/n1`,
      cid: 'cid1',
      value: {
        slug: 'characters',
        title: 'Characters',
        wikiRef: `at://${DID}/wiki.lichen.wiki/w`,
        createdAt: '2026-01-01T00:00:00.000Z',
        subheaderLinks,
      },
    },
  ]
}

describe('note subheader links', () => {
  it('keeps a link that has no url yet', async () => {
    // Previously filtered out on read, so a link saved without a destination
    // silently disappeared and looked like the save had failed.
    const notes = await listNotes(stubAgent(noteRecord([{ label: 'Kami' }])), DID)

    expect(notes[0].subheaderLinks).toHaveLength(1)
    expect(notes[0].subheaderLinks?.[0].label).toBe('Kami')
    expect(notes[0].subheaderLinks?.[0].url).toBe('')
  })

  it('keeps an image-only link with no url', async () => {
    const image = { $type: 'blob', ref: { $link: 'bafy' }, mimeType: 'image/png', size: 1 }
    const notes = await listNotes(stubAgent(noteRecord([{ label: 'Kid', image }])), DID)

    expect(notes[0].subheaderLinks).toHaveLength(1)
    expect(notes[0].subheaderLinks?.[0].image).toBeTruthy()
  })

  it('still drops a link with no label, which has nothing to show', async () => {
    const notes = await listNotes(stubAgent(noteRecord([{ url: 'somewhere' }])), DID)
    expect(notes[0].subheaderLinks).toBeUndefined()
  })

  it('keeps ordinary links with urls', async () => {
    const notes = await listNotes(
      stubAgent(noteRecord([{ label: 'Yameii', url: 'yameii' }, { label: 'Kami' }])),
      DID,
    )
    expect(notes[0].subheaderLinks?.map((l) => [l.label, l.url])).toEqual([
      ['Yameii', 'yameii'],
      ['Kami', ''],
    ])
  })
})

describe('wiki header links', () => {
  function wikiRecord(headerLinks: unknown[]) {
    return [
      {
        uri: `at://${DID}/wiki.lichen.wiki/oseanworld`,
        cid: 'cid1',
        value: {
          name: 'Osean World',
          visibility: 'public',
          language: 'en',
          createdAt: '2026-01-01T00:00:00.000Z',
          headerLinks,
        },
      },
    ]
  }

  it('keeps a header link with no url yet', async () => {
    const wikis = await listWikis(stubAgent(wikiRecord([{ label: 'Objects' }])), DID)

    expect(wikis[0].headerLinks).toHaveLength(1)
    expect(wikis[0].headerLinks?.[0].label).toBe('Objects')
  })

  it('keeps a navbar link with no url yet', async () => {
    const wikis = await listWikis(
      stubAgent([
        {
          uri: `at://${DID}/wiki.lichen.wiki/w`,
          cid: 'c',
          value: {
            name: 'W',
            createdAt: '2026-01-01T00:00:00.000Z',
            navbarLinks: [{ label: 'Shop' }],
          },
        },
      ]),
      DID,
    )
    expect(wikis[0].navbarLinks).toEqual([{ label: 'Shop', url: '' }])
  })
})
