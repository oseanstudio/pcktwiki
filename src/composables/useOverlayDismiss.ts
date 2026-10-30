import { onMounted, onUnmounted, type Ref, watch } from 'vue'

type RootRef = Ref<HTMLElement | null>

/**
 * Close an overlay on outside pointerdown / Escape.
 * Pass one root or several (e.g. trigger + teleported panel).
 */
export function useOverlayDismiss(
  rootRefs: RootRef | RootRef[],
  open: Ref<boolean>,
  close: () => void,
) {
  const roots = Array.isArray(rootRefs) ? rootRefs : [rootRefs]

  function onPointerDown(event: PointerEvent) {
    if (!open.value) return

    const target = event.target
    if (!(target instanceof Node)) return
    if (roots.some((root) => root.value?.contains(target))) return

    close()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open.value) return
    close()
  }

  watch(open, (isOpen, _wasOpen, onCleanup) => {
    if (!isOpen) return

    document.addEventListener('pointerdown', onPointerDown, true)
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown, true)
    })
  })

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('pointerdown', onPointerDown, true)
  })
}
