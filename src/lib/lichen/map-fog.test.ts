import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REVEAL_RADIUS,
  buildMapPins,
  findMapImage,
  fogGeometry,
  isCanonUnlocked,
  pinToFogPoint,
  resolveFogColor,
  resolveMapImageSrc,
  revealedPins,
  summarizeProgress,
} from '@/lib/lichen/map-fog'
import type { LichenNoteWithContent } from '@/types/lichen'

function note(slug: string, frontmatter: string, title = slug): LichenNoteWithContent {
  return {
    uri: `at://did:plc:test/wiki.lichen.note/${slug}`,
    cid: 'cid',
    slug,
    title,
    wikiRef: 'at://did:plc:test/wiki.lichen.wiki/world',
    createdAt: '2026-01-01T00:00:00.000Z',
    content: `---\n${frontmatter}\n---\n\nBody text.`,
    latestRevisionUri: null,
  }
}

const NOW = new Date('2026-07-29T00:00:00.000Z')

describe('isCanonUnlocked', () => {
  it('treats a plain place as released', () => {
    expect(isCanonUnlocked({}, NOW)).toBe(true)
  })

  it('keeps an explicitly locked place shut', () => {
    expect(isCanonUnlocked({ mapLocked: true }, NOW)).toBe(false)
  })

  it('opens once the unlock date has passed', () => {
    expect(isCanonUnlocked({ mapUnlockAt: '2026-07-01' }, NOW)).toBe(true)
  })

  it('stays shut before the unlock date', () => {
    expect(isCanonUnlocked({ mapUnlockAt: '2026-12-25' }, NOW)).toBe(false)
  })

  it('does not release a place on an unparseable date', () => {
    expect(isCanonUnlocked({ mapUnlockAt: 'next arc' }, NOW)).toBe(false)
  })

  it('lets an explicit lock win over a past unlock date', () => {
    expect(isCanonUnlocked({ mapLocked: true, mapUnlockAt: '2020-01-01' }, NOW)).toBe(false)
  })
})

describe('buildMapPins', () => {
  const notes = [
    note('harbor', 'map-x: 20\nmap-y: 30\nmap-reveal: 8'),
    note('capital', 'map-x: 50\nmap-y: 40'),
    note('void', 'map-x: 80\nmap-y: 70\nmap-locked: true'),
    note('future', 'map-x: 10\nmap-y: 90\nmap-unlock: 2026-12-01'),
    note('not-a-place', 'status: stub'),
  ]

  it('only maps notes that carry both coordinates', () => {
    const pins = buildMapPins(notes, { discovered: new Set(), now: NOW })
    expect(pins.map((p) => p.slug)).toEqual(['harbor', 'capital', 'void', 'future'])
  })

  it('separates the canon gate from the discovery gate', () => {
    const pins = buildMapPins(notes, { discovered: new Set(['harbor', 'void']), now: NOW })
    const bySlug = Object.fromEntries(pins.map((p) => [p.slug, p.state]))

    expect(bySlug.harbor).toBe('discovered')
    expect(bySlug.capital).toBe('undiscovered')
    // Visited, but unreleased — the canon gate still wins.
    expect(bySlug.void).toBe('locked')
    expect(bySlug.future).toBe('locked')
  })

  it('honours a custom reveal radius and falls back to the default', () => {
    const pins = buildMapPins(notes, { discovered: new Set(), now: NOW })
    expect(pins.find((p) => p.slug === 'harbor')?.radius).toBe(8)
    expect(pins.find((p) => p.slug === 'capital')?.radius).toBe(DEFAULT_REVEAL_RADIUS)
  })

  it('clamps coordinates to the map', () => {
    const pins = buildMapPins([note('edge', 'map-x: 140\nmap-y: -20')], {
      discovered: new Set(),
      now: NOW,
    })
    expect(pins[0]).toMatchObject({ x: 100, y: 0 })
  })

  it('skips discussion pages so they do not double up on their article', () => {
    const pins = buildMapPins([note('talk:harbor', 'map-x: 20\nmap-y: 30')], {
      discovered: new Set(),
      now: NOW,
    })
    expect(pins).toHaveLength(0)
  })

  it('lets an editor preview unreleased places without touching discovery', () => {
    const pins = buildMapPins(notes, {
      discovered: new Set(['harbor']),
      now: NOW,
      revealLocked: true,
    })
    const bySlug = Object.fromEntries(pins.map((p) => [p.slug, p.state]))
    expect(bySlug.void).toBe('undiscovered')
    expect(bySlug.harbor).toBe('discovered')
  })

  it('carries the teaser used in place of the name while unfound', () => {
    const pins = buildMapPins([note('ruin', 'map-x: 5\nmap-y: 5\nmap-teaser: A broken spire')], {
      discovered: new Set(),
      now: NOW,
    })
    expect(pins[0].teaser).toBe('A broken spire')
  })
})

describe('summarizeProgress', () => {
  it('counts unreleased places out of the goal', () => {
    const pins = buildMapPins(
      [
        note('a', 'map-x: 1\nmap-y: 1'),
        note('b', 'map-x: 2\nmap-y: 2'),
        note('c', 'map-x: 3\nmap-y: 3\nmap-locked: true'),
      ],
      { discovered: new Set(['a']), now: NOW },
    )

    expect(summarizeProgress(pins)).toEqual({
      discovered: 1,
      total: 2,
      locked: 1,
      percent: 50,
    })
  })

  it('reads as complete when nothing released is left to find', () => {
    expect(summarizeProgress([])).toMatchObject({ percent: 100, total: 0 })
  })
})

describe('fog geometry', () => {
  it('keeps reveals circular on a wide map', () => {
    const geometry = fogGeometry(2)
    expect(geometry).toEqual({ width: 100, height: 50 })
  })

  it('falls back to a square before the image measures', () => {
    expect(fogGeometry(0)).toEqual({ width: 100, height: 100 })
    expect(fogGeometry(Number.NaN)).toEqual({ width: 100, height: 100 })
  })

  it('scales a pin down the viewBox height', () => {
    const geometry = fogGeometry(2)
    expect(pinToFogPoint({ x: 25, y: 50 }, geometry)).toEqual({ cx: 25, cy: 25 })
  })
})

describe('revealedPins', () => {
  it('punches holes only for discovered places', () => {
    const pins = buildMapPins(
      [
        note('found', 'map-x: 1\nmap-y: 1'),
        note('unfound', 'map-x: 2\nmap-y: 2'),
        note('locked', 'map-x: 3\nmap-y: 3\nmap-locked: true'),
      ],
      { discovered: new Set(['found']), now: NOW },
    )
    expect(revealedPins(pins).map((p) => p.slug)).toEqual(['found'])
  })
})

describe('resolveMapImageSrc', () => {
  it('uses an absolute URL as-is', () => {
    expect(resolveMapImageSrc('https://example.com/world.png')).toEqual({
      kind: 'direct',
      url: 'https://example.com/world.png',
    })
  })

  it('uses a root-relative site asset as-is', () => {
    expect(resolveMapImageSrc('/ow-map.webp')).toEqual({ kind: 'direct', url: '/ow-map.webp' })
  })

  it('does not treat a protocol-relative URL as a local path', () => {
    // `//host/x.png` starts with a slash but would load from another origin.
    expect(resolveMapImageSrc('//evil.example/x.png')).toEqual({
      kind: 'blob',
      ref: 'blob://evil.example/x.png',
    })
  })

  it('treats a bare CID as a blob reference', () => {
    expect(resolveMapImageSrc('bafyreiabc123')).toEqual({ kind: 'blob', ref: 'blob:bafyreiabc123' })
    expect(resolveMapImageSrc('blob:bafyreiabc123')).toEqual({
      kind: 'blob',
      ref: 'blob:bafyreiabc123',
    })
  })

  it('returns nothing for an absent or blank value', () => {
    expect(resolveMapImageSrc(null)).toBeNull()
    expect(resolveMapImageSrc('   ')).toBeNull()
  })
})

describe('resolveFogColor', () => {
  it('defaults to the theme when no place sets one', () => {
    expect(resolveFogColor([note('a', 'map-x: 1\nmap-y: 1')])).toBeNull()
  })

  it('resolves presets so a dark map need not name a hex code', () => {
    expect(resolveFogColor([note('a', 'map-x: 1\nmap-y: 1\nmap-fog: dark')])).toBe('#05060a')
    expect(resolveFogColor([note('a', 'map-x: 1\nmap-y: 1\nmap-fog: BLACK')])).toBe('#000000')
  })

  it('accepts hex and functional colours', () => {
    expect(resolveFogColor([note('a', 'map-x: 1\nmap-y: 1\nmap-fog: #0b0d16')])).toBe('#0b0d16')
    expect(
      resolveFogColor([note('a', 'map-x: 1\nmap-y: 1\nmap-fog: rgba(0, 0, 0, 0.9)')]),
    ).toBe('rgba(0, 0, 0, 0.9)')
  })

  it('falls back to the theme rather than painting an unparseable colour', () => {
    expect(
      resolveFogColor([note('a', 'map-x: 1\nmap-y: 1\nmap-fog: red; position: fixed')]),
    ).toBeNull()
    expect(resolveFogColor([note('a', 'map-x: 1\nmap-y: 1\nmap-fog: url(evil.png)')])).toBeNull()
  })
})

describe('findMapImage', () => {
  it('takes the image from whichever place declares one', () => {
    const notes = [
      note('a', 'map-x: 1\nmap-y: 1'),
      note('b', 'map-x: 2\nmap-y: 2\nmap-image: https://example.com/world.png'),
    ]
    expect(findMapImage(notes)).toBe('https://example.com/world.png')
  })

  it('returns null when no place has one', () => {
    expect(findMapImage([note('a', 'map-x: 1\nmap-y: 1')])).toBeNull()
  })
})
