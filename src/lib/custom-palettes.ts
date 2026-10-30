import { isThemePack, type ThemePack } from '@/types/theme-pack'

export const CUSTOM_PALETTES_KEY = 'pckt.wiki.custom-palettes'

export interface CustomPalette extends ThemePack {
  id: string
}

function isCustomPalette(value: unknown): value is CustomPalette {
  return isThemePack(value) && typeof (value as CustomPalette).id === 'string'
}

export function loadCustomPalettes(): CustomPalette[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PALETTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCustomPalette)
  } catch {
    return []
  }
}

function persist(palettes: CustomPalette[]) {
  localStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(palettes))
}

export function saveCustomPalette(pack: ThemePack): CustomPalette {
  const palettes = loadCustomPalettes()
  const next: CustomPalette = {
    ...pack,
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  }
  palettes.push(next)
  persist(palettes)
  return next
}

export function removeCustomPalette(id: string): CustomPalette[] {
  const next = loadCustomPalettes().filter((pack) => pack.id !== id)
  persist(next)
  return next
}

export function nextCustomPaletteName(existing: { name: string }[] = loadCustomPalettes()): string {
  const used = new Set(existing.map((pack) => pack.name.toLowerCase()))
  let n = 1
  while (used.has(`my palette ${n}`)) n += 1
  return `My palette ${n}`
}
