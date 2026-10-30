import { describe, expect, it } from 'vitest'
import { contentFontStack, safeHexColor } from '@/lib/theme-colors'

describe('safeHexColor', () => {
  it('accepts 3- and 6-digit hex', () => {
    expect(safeHexColor('#ff5d5b')).toBe('#ff5d5b')
    expect(safeHexColor('#F5D')).toBe('#f5d')
    expect(safeHexColor('  #21dc66  ')).toBe('#21dc66')
  })

  it('rejects CSS injection attempts', () => {
    expect(safeHexColor('red;} body{background:url(//evil)')).toBeNull()
    expect(safeHexColor('#ff5d5b; --pckt-bg: black')).toBeNull()
    expect(safeHexColor('url(//evil.com/x.png)')).toBeNull()
    expect(safeHexColor('')).toBeNull()
    expect(safeHexColor(undefined)).toBeNull()
  })
})

describe('contentFontStack', () => {
  it('keeps ordinary font names', () => {
    expect(contentFontStack('iA Writer Mono S')).toBe(`'iA Writer Mono S', 'Lora', Georgia, serif`)
  })

  it('strips characters that could break out of the CSS quoted string', () => {
    expect(contentFontStack("Lora'; } body { background: url(//evil) } '")).toBe(
      `'Lora  body  background urlevil', 'Lora', Georgia, serif`,
    )
  })

  it('falls back to Lora for empty input', () => {
    expect(contentFontStack(undefined)).toBe(`'Lora', 'Lora', Georgia, serif`)
  })
})
