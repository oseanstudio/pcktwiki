import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { PcktTheme, ThemeRegion } from '@/types/lichen'
import { DEFAULT_PCKT_THEME, THEME_REGION_FIELDS } from '@/types/lichen'
import { applyWikiTheme, loadLocalTheme, saveLocalTheme, themeFromWiki } from '@/lib/theme'
import { exitWikiEditMode, registerThemeModeExiter } from '@/composables/wikiModeBridge'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'

const active = ref(false)
const saving = ref(false)
const selectedRegion = ref<ThemeRegion | null>(null)
const draft = ref<PcktTheme>({})
/** Snapshot applied when entering, restored on cancel. */
const baseline = ref<PcktTheme>({})

function snapshotCurrent(): PcktTheme {
  const lichen = useLichenStore()
  const wiki = lichen.currentWiki
  const local = loadLocalTheme()
  if (!wiki) return { ...local }
  return {
    ...local,
    ...themeFromWiki(wiki),
  }
}

function enter() {
  exitWikiEditMode()
  baseline.value = snapshotCurrent()
  draft.value = { ...baseline.value }
  selectedRegion.value = null
  active.value = true
  applyWikiTheme(draft.value)
}

function exit() {
  selectedRegion.value = null
  active.value = false
}

/** Leave theme mode and restore the theme that was active on enter. */
function discard() {
  applyWikiTheme(baseline.value)
  draft.value = { ...baseline.value }
  exit()
}

function selectRegion(region: ThemeRegion | null) {
  selectedRegion.value = region
}

function setRegionColor(region: ThemeRegion, color: string | undefined) {
  const value = color || undefined
  // Article / sidebar share the page surface — keep them flat with the site bg.
  if (region === 'bg' || region === 'card' || region === 'sidebar') {
    draft.value = {
      ...draft.value,
      bgColor: value,
      cardColor: value,
      sidebarColor: value,
    }
  } else {
    const field = THEME_REGION_FIELDS[region]
    draft.value = { ...draft.value, [field]: value }
  }
  applyWikiTheme(draft.value)
}

function resetRegion(region: ThemeRegion) {
  setRegionColor(region, undefined)
}

/** One-click full palette swap (live preview). */
function applyTheme(next: PcktTheme) {
  draft.value = { ...next }
  applyWikiTheme(draft.value)
}

/** Restore the built-in app default (coral accent, auto mode, no surface overrides). */
function resetToDefault() {
  applyTheme({ ...DEFAULT_PCKT_THEME })
}

async function commit(): Promise<boolean> {
  if (saving.value) return false
  const auth = useAuthStore()
  const lichen = useLichenStore()
  if (!auth.agent || !lichen.currentWiki) return false

  saving.value = true
  try {
    const mode = draft.value.mode
    await lichen.setWikiTheme(auth.agent, {
      theme: mode === 'light' || mode === 'dark' ? mode : undefined,
      accentColor: draft.value.accentColor,
      bgColor: draft.value.bgColor,
      cardColor: draft.value.cardColor,
      sidebarColor: draft.value.sidebarColor,
      headerColor: draft.value.headerColor,
      fontFamily: draft.value.fontFamily,
      layoutWidth: draft.value.layoutWidth,
    })
    saveLocalTheme(draft.value)
    applyWikiTheme(draft.value)
    baseline.value = { ...draft.value }
    exit()
    return true
  } catch {
    return false
  } finally {
    saving.value = false
  }
}

function toggle() {
  if (active.value) discard()
  else enter()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (!active.value) return
  if (selectedRegion.value) {
    selectedRegion.value = null
    return
  }
  discard()
}

let listeners = 0

function useEscapeListener() {
  onMounted(() => {
    if (listeners === 0) {
      document.addEventListener('keydown', onKeyDown)
    }
    listeners += 1
  })
  onUnmounted(() => {
    listeners = Math.max(0, listeners - 1)
    if (listeners === 0) {
      document.removeEventListener('keydown', onKeyDown)
    }
  })
}

/** Called from content edit mode so the two modes never stack. */
export function exitWikiThemeMode() {
  if (!active.value) return
  discard()
}

registerThemeModeExiter(exitWikiThemeMode)

export function useWikiThemeMode() {
  useEscapeListener()

  return {
    active: active as Ref<boolean>,
    saving: saving as Ref<boolean>,
    selectedRegion: selectedRegion as Ref<ThemeRegion | null>,
    draft: draft as Ref<PcktTheme>,
    dirty: computed(() => JSON.stringify(draft.value) !== JSON.stringify(baseline.value)),
    enter,
    exit,
    discard,
    toggle,
    selectRegion,
    setRegionColor,
    resetRegion,
    applyTheme,
    resetToDefault,
    commit,
  }
}
