import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useScrollProgress(targetRef: Ref<HTMLElement | null>): Ref<number> {
  const progress = ref(0)
  let frame = 0

  function update() {
    const element = targetRef.value
    if (!element) return

    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const start = viewportHeight
    const end = -rect.height
    const raw = (start - rect.top) / (start - end)
    progress.value = Math.max(0, Math.min(1, raw))
  }

  function onScroll() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(update)
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    cancelAnimationFrame(frame)
  })

  return progress
}
