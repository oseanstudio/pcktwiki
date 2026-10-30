import { onUnmounted, ref, type Ref } from 'vue'

/**
 * Height of the on-screen keyboard, in CSS pixels.
 *
 * Mobile browsers shrink the *visual* viewport when the keyboard opens but
 * leave the layout viewport alone, so anything pinned with `position: fixed`
 * ends up hidden behind the keyboard. Translating by this value lifts it back
 * into view.
 */
export function useKeyboardInset(): Ref<number> {
  const inset = ref(0)

  const viewport = typeof window !== 'undefined' ? window.visualViewport : null
  if (!viewport) return inset

  let frame = 0
  const update = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const overlap = window.innerHeight - (viewport.height + viewport.offsetTop)
      // Ignore sub-pixel rounding and browser chrome that collapses on scroll.
      inset.value = overlap > 80 ? Math.round(overlap) : 0
    })
  }

  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
  update()

  onUnmounted(() => {
    cancelAnimationFrame(frame)
    viewport.removeEventListener('resize', update)
    viewport.removeEventListener('scroll', update)
  })

  return inset
}
