import { onUnmounted, ref, type Ref } from 'vue'

/** Reactive `matchMedia`, safe to call during SSR/prerender. */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)
  if (typeof window === 'undefined' || !window.matchMedia) return matches

  const list = window.matchMedia(query)
  matches.value = list.matches

  const onChange = (event: MediaQueryListEvent) => {
    matches.value = event.matches
  }
  list.addEventListener('change', onChange)
  onUnmounted(() => list.removeEventListener('change', onChange))

  return matches
}
