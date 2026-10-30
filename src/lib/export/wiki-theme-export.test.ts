import { describe, expect, it } from 'vitest'
import { buildThemeOverrides } from '@/lib/export/wiki-static-site'
import { buildBundleChrome } from '@/lib/export/wiki-bundle-media'
import type { LichenWikiRecord } from '@/types/lichen'

function wiki(overrides: Partial<LichenWikiRecord> = {}): LichenWikiRecord {
  return {
    uri: 'at://did:plc:x/wiki.lichen.wiki/demo',
    cid: 'cid',
    slug: 'demo',
    ownerDid: 'did:plc:x',
    name: 'Demo',
    visibility: 'public',
    language: 'en',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('static site theme overrides', () => {
  it('emits nothing when the wiki sets no presentation fields', () => {
    expect(buildThemeOverrides(wiki())).toBe('')
  })

  it('emits the accent and its derived hover/soft variants', () => {
    const css = buildThemeOverrides(wiki({ accentColor: '#58a7ff' }))
    expect(css).toContain('--pckt-accent: #58a7ff;')
    expect(css).toContain('--pckt-accent-hover: #67b6ff;')
    expect(css).toContain('--pckt-accent-soft: rgba(88, 167, 255, 0.12);')
    expect(css).toContain('--pckt-link: #58a7ff;')
  })

  it('keeps the hand-picked hover for the brand red', () => {
    expect(buildThemeOverrides(wiki({ accentColor: '#ff5d5b' }))).toContain(
      '--pckt-accent-hover: #f44c4a;',
    )
  })

  it('maps layout width to a pixel column', () => {
    expect(buildThemeOverrides(wiki({ layoutWidth: 'narrow' }))).toContain(
      '--pckt-width-medium: 720px;',
    )
    expect(buildThemeOverrides(wiki({ layoutWidth: 'wide' }))).toContain(
      '--pckt-width-medium: 1120px;',
    )
  })

  it('emits a font stack with fallbacks', () => {
    const css = buildThemeOverrides(wiki({ fontFamily: 'Literata' }))
    expect(css).toContain(`--pckt-font-content: 'Literata', 'Lora', Georgia, serif;`)
  })
})

describe('bundle chrome theme', () => {
  it('carries the full theme into the bundle so it survives a round trip', () => {
    const chrome = buildBundleChrome(
      wiki({
        theme: 'dark',
        accentColor: '#21dc66',
        fontFamily: 'Newsreader',
        layoutWidth: 'wide',
        sidebarOrder: ['home', 'characters'],
      }),
      new Map(),
      new Map(),
    )
    expect(chrome).toMatchObject({
      theme: 'dark',
      accentColor: '#21dc66',
      fontFamily: 'Newsreader',
      layoutWidth: 'wide',
      sidebarOrder: ['home', 'characters'],
    })
  })
})
