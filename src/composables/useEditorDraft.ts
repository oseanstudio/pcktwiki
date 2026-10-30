import { onUnmounted, ref, watch, type Ref } from 'vue'

const PREFIX = 'pckt.wiki.draft:'
const SAVE_DELAY = 700
/** Drafts older than this are assumed stale and are discarded on load. */
const MAX_AGE = 1000 * 60 * 60 * 24 * 14

export interface StoredDraft {
  title: string
  content: string
  savedAt: number
}

function read(key: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft
    if (typeof parsed?.content !== 'string') return null
    if (Date.now() - parsed.savedAt > MAX_AGE) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Mirrors in-progress edits to localStorage so a refresh, crash, or accidental
 * navigation does not lose work, and surfaces anything left over from last time.
 */
export function useEditorDraft(
  key: Ref<string | null>,
  title: Ref<string>,
  content: Ref<string>,
) {
  /** A draft found on load that differs from what the server returned. */
  const recovered = ref<StoredDraft | null>(null)

  let baseline = ''
  /** Ignore autosave until {@link sync} runs with the loaded server content. */
  let ready = false
  let timer: ReturnType<typeof setTimeout> | undefined

  function removeStored() {
    if (!key.value) return
    try {
      localStorage.removeItem(PREFIX + key.value)
    } catch {
      // Storage may be unavailable (private mode, quota); drafts are best effort.
    }
  }

  function clear() {
    recovered.value = null
    removeStored()
  }

  function dismiss() {
    clear()
  }

  function flush() {
    if (!ready || !key.value) return
    try {
      if (content.value === baseline) {
        localStorage.removeItem(PREFIX + key.value)
        return
      }
      const payload: StoredDraft = {
        title: title.value,
        content: content.value,
        savedAt: Date.now(),
      }
      localStorage.setItem(PREFIX + key.value, JSON.stringify(payload))
    } catch {
      // Ignore: losing the safety net is better than breaking the editor.
    }
  }

  /** Call once the loaded server content is known so we can detect a stale draft. */
  function sync(loadedContent: string) {
    baseline = loadedContent
    ready = true
    if (!key.value) {
      recovered.value = null
      return
    }
    const stored = read(key.value)
    recovered.value = stored && stored.content !== loadedContent ? stored : null
  }

  /**
   * Apply the recovered draft into the bound title/content refs.
   * Returns the draft so the caller can also patch the live editor surface.
   */
  function restore(): StoredDraft | null {
    const stored = recovered.value
    if (!stored) return null
    // Keep server `baseline` so the page stays dirty until publish.
    title.value = stored.title
    content.value = stored.content
    recovered.value = null
    // Drop the snapshot we just applied; autosave will rewrite if still dirty.
    removeStored()
    return stored
  }

  watch([content, title], () => {
    if (!ready) return
    clearTimeout(timer)
    timer = setTimeout(flush, SAVE_DELAY)
  })

  watch(key, () => {
    clearTimeout(timer)
    ready = false
    recovered.value = null
  })

  onUnmounted(() => {
    clearTimeout(timer)
    if (ready) flush()
  })

  return { recovered, sync, restore, dismiss, clear }
}
