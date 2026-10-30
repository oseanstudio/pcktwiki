import { onMounted, onUnmounted, ref } from 'vue'
import { markMotionEnterPlayed } from '@/composables/useMotionEnter'

/** Bumps when the page is restored from the back-forward cache so children can remount. */
export function usePageRestoreKey() {
  const restoreKey = ref(0)

  function onPageShow(event: Event) {
    if ((event as PageTransitionEvent).persisted) {
      markMotionEnterPlayed()
      restoreKey.value += 1
    }
  }

  onMounted(() => {
    window.addEventListener('pageshow', onPageShow)
  })

  onUnmounted(() => {
    window.removeEventListener('pageshow', onPageShow)
  })

  return restoreKey
}
