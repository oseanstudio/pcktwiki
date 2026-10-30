/**
 * Colour maths shared by the live app and the static-site exporter, so an
 * exported wiki derives the same hover/soft accents the app renders.
 */

export const LAYOUT_WIDTHS = {
  narrow: '720px',
  medium: '960px',
  wide: '1120px',
} as const

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Wiki theme colors end up in exported raw-CSS text, so only strict hex
 * values may pass; anything else falls back to null and the default. */
export function safeHexColor(value: string | undefined | null): string | null {
  if (!value) return null
  return HEX_COLOR_RE.test(value.trim()) ? value.trim().toLowerCase() : null
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized
  const num = Number.parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function adjustColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized
  const num = Number.parseInt(full, 16)
  let r = ((num >> 16) & 255) + amount
  let g = ((num >> 8) & 255) + amount
  let b = (num & 255) + amount
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/** The brand red has a hand-picked hover; everything else is derived. */
export function accentHover(accent: string): string {
  return accent === '#ff5d5b' ? '#f44c4a' : adjustColor(accent, 15)
}

/** Font names go into CSS text (exported sites) and custom properties, so
 * strip anything that could leave the quoted string — quotes included. */
export function contentFontStack(fontFamily: string | undefined): string {
  const name = (fontFamily ?? '').replace(/[^\w\s-]/g, '').trim()
  return `'${name || 'Lora'}', 'Lora', Georgia, serif`
}
