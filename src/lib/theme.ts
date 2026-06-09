import type { WikiTheme } from '@/types/wiki'
import { DEFAULT_THEME } from '@/types/wiki'

export function applyWikiTheme(theme?: WikiTheme): void {
  const merged = { ...DEFAULT_THEME, ...theme }
  const root = document.documentElement

  root.style.setProperty('--pckt-accent', merged.accentColor ?? DEFAULT_THEME.accentColor!)
  root.style.setProperty('--pckt-accent-hover', adjustColor(merged.accentColor ?? DEFAULT_THEME.accentColor!, 15))
  root.style.setProperty('--pckt-accent-soft', hexToRgba(merged.accentColor ?? DEFAULT_THEME.accentColor!, 0.12))
  root.style.setProperty('--pckt-font-content', `'${merged.fontFamily}', 'Lora', Georgia, serif`)

  const mode = merged.mode ?? 'light'
  if (mode === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', 'light')
  }

  root.classList.remove('layout-width-narrow', 'layout-width-medium', 'layout-width-wide')
  root.classList.add(`layout-width-${merged.layoutWidth ?? 'medium'}`)
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const num = Number.parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function adjustColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const num = Number.parseInt(full, 16)
  let r = ((num >> 16) & 255) + amount
  let g = ((num >> 8) & 255) + amount
  let b = (num & 255) + amount
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function resetAppTheme(): void {
  applyWikiTheme(DEFAULT_THEME)
}
