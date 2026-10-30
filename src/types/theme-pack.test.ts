import { describe, expect, it } from 'vitest'
import {
  exportThemeMarkdown,
  importThemePack,
  packToTheme,
  parseThemeMarkdown,
  themeToPack,
} from '@/types/theme-pack'

describe('theme markdown packs', () => {
  it('round-trips a full theme through markdown', () => {
    const pack = themeToPack(
      {
        accentColor: '#58a7ff',
        bgColor: '#0f172a',
        cardColor: '#1e293b',
        sidebarColor: '#1e293b',
        headerColor: '#0f172a',
        fontFamily: 'Lora',
        layoutWidth: 'narrow',
        mode: 'dark',
      },
      'Ocean night',
    )
    const md = exportThemeMarkdown(pack)
    expect(md).toContain('```pckt-theme')
    expect(md).toContain('accent: #58a7ff')
    expect(md).toContain('bg: #0f172a')

    const parsed = parseThemeMarkdown(md)
    expect(parsed.name).toBe('Ocean night')
    expect(parsed.accent).toBe('#58a7ff')
    expect(parsed.bg).toBe('#0f172a')
    expect(parsed.layoutWidth).toBe('narrow')
    expect(parsed.wikiLightDark).toBe('dark')

    const theme = packToTheme(parsed, { layoutWidth: 'wide' })
    expect(theme.accentColor).toBe('#58a7ff')
    expect(theme.bgColor).toBe('#0f172a')
    // Themes never resize the layout — width stays on the base theme.
    expect(theme.layoutWidth).toBe('wide')
    expect(theme.mode).toBe('dark')
  })

  it('does not apply pack layout width', () => {
    const theme = packToTheme(
      {
        name: 'Wide pack',
        accent: '#000',
        font: 'Lora',
        layoutWidth: 'wide',
      },
      { layoutWidth: 'narrow' },
    )
    expect(theme.layoutWidth).toBe('narrow')
  })

  it('colorsOnly preserves font and width', () => {
    const theme = packToTheme(
      {
        name: 'Palette',
        accent: '#21dc66',
        font: 'Newsreader',
        layoutWidth: 'wide',
        wikiLightDark: 'dark',
      },
      { fontFamily: 'Lora', layoutWidth: 'narrow', mode: 'light' },
      { colorsOnly: true },
    )
    expect(theme.accentColor).toBe('#21dc66')
    expect(theme.fontFamily).toBe('Lora')
    expect(theme.layoutWidth).toBe('narrow')
    expect(theme.mode).toBe('dark')
  })

  it('imports legacy JSON packs', () => {
    const json = JSON.stringify({
      name: 'Classic',
      accent: '#ff5d5b',
      font: 'Literata',
      layoutWidth: 'default',
    })
    const pack = importThemePack(json)
    expect(pack.name).toBe('Classic')
    expect(pack.accent).toBe('#ff5d5b')
  })

  it('imports a pasted fence alone', () => {
    const fence = [
      '```pckt-theme',
      'name: Paste me',
      'accent: #21dc66',
      'font: Georgia',
      'width: wide',
      'mode: light',
      '```',
    ].join('\n')
    const pack = importThemePack(fence)
    expect(pack.name).toBe('Paste me')
    expect(pack.layoutWidth).toBe('wide')
    expect(pack.wikiLightDark).toBe('light')
  })

  it('maps legible/serif font aliases', () => {
    expect(packToTheme({ name: 'a', accent: '#000', font: 'legible', layoutWidth: 'default' }).fontFamily).toBe(
      'Atkinson Hyperlegible',
    )
    expect(packToTheme({ name: 'a', accent: '#000', font: 'serif', layoutWidth: 'default' }).fontFamily).toBe(
      'Literata',
    )
  })
})
