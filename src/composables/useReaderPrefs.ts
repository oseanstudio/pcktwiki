import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'pckt.wiki.reader-prefs'

interface ReaderPrefs {
  hideNonMain: boolean
}

function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { hideNonMain: false }
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>
    return { hideNonMain: !!parsed.hideNonMain }
  } catch {
    return { hideNonMain: false }
  }
}

const prefs = ref<ReaderPrefs>(loadPrefs())

watch(
  prefs,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // ignore
    }
  },
  { deep: true },
)

export function useReaderPrefs() {
  const hideNonMain = computed({
    get: () => prefs.value.hideNonMain,
    set: (value: boolean) => {
      prefs.value = { ...prefs.value, hideNonMain: value }
    },
  })

  function toggleHideNonMain() {
    hideNonMain.value = !hideNonMain.value
  }

  return { hideNonMain, toggleHideNonMain }
}
