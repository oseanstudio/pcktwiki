import { ref } from 'vue'

/** pckt wordmark letter colors — red, blue, green, yellow */
export const PCKT_WORDMARK_COLORS = [
  '#FF5D5B',
  '#58A7FF',
  '#21DC66',
  '#FFCA46',
] as const

const SUFFIX_COLOR_INDEX_KEY = 'pckt.wiki.suffix-color-index'
const LEGACY_SUFFIX_COLOR_KEY = 'pckt.wiki.suffix-color'

function readStoredColorIndex(): number {
  try {
    const raw = sessionStorage.getItem(SUFFIX_COLOR_INDEX_KEY)
    if (raw !== null) {
      const index = Number(raw)
      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index < PCKT_WORDMARK_COLORS.length
      ) {
        return index
      }
    }

    const legacyColor = sessionStorage.getItem(LEGACY_SUFFIX_COLOR_KEY)
    if (legacyColor) {
      const index = (PCKT_WORDMARK_COLORS as readonly string[]).indexOf(
        legacyColor,
      )
      if (index >= 0) return index
    }
  } catch {
    // sessionStorage unavailable (e.g. private mode restrictions)
  }

  return 0
}

function writeStoredColorIndex(index: number): void {
  try {
    sessionStorage.setItem(SUFFIX_COLOR_INDEX_KEY, String(index))
    sessionStorage.removeItem(LEGACY_SUFFIX_COLOR_KEY)
  } catch {
    // ignore
  }
}

export function suffixColorAt(index: number): string {
  return PCKT_WORDMARK_COLORS[index % PCKT_WORDMARK_COLORS.length]!
}

/** Shared .wiki suffix color; refreshed when any logomark is clicked. */
export const suffixColor = ref(suffixColorAt(readStoredColorIndex()))

export function refreshSuffixColor(): void {
  const nextIndex =
    (readStoredColorIndex() + 1) % PCKT_WORDMARK_COLORS.length
  writeStoredColorIndex(nextIndex)
  suffixColor.value = suffixColorAt(nextIndex)
}
