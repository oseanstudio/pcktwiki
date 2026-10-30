import { computed, ref } from 'vue'
import type { PcktTheme } from '@/types/lichen'
import { applyWikiTheme, loadLocalTheme, saveLocalTheme } from '@/lib/theme'

export type ThemeMode = NonNullable<PcktTheme['mode']>

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'auto']

const MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  auto: 'Auto',
}

const mode = ref<ThemeMode>(loadLocalTheme().mode ?? 'auto')

function syncFromStorage() {
  mode.value = loadLocalTheme().mode ?? 'auto'
}

export function useThemeMode() {
  const label = computed(() => MODE_LABELS[mode.value])
  const nextMode = computed(() => {
    const index = THEME_MODES.indexOf(mode.value)
    return THEME_MODES[(index + 1) % THEME_MODES.length]!
  })
  const nextLabel = computed(() => MODE_LABELS[nextMode.value])

  function setMode(next: ThemeMode) {
    const theme = { ...loadLocalTheme(), mode: next }
    saveLocalTheme(theme)
    applyWikiTheme(theme)
    mode.value = next
  }

  function cycleMode() {
    setMode(nextMode.value)
  }

  return {
    mode,
    label,
    nextMode,
    nextLabel,
    setMode,
    cycleMode,
    syncFromStorage,
  }
}
