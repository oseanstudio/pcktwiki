import type { Ref } from 'vue'
import { ref } from 'vue'

const DEFAULT_DELAY_MS = 280

export interface DoubleActivationHandlers {
  onClick: (event: MouseEvent) => void
  onDblclick: (event: MouseEvent) => void
  onTouchEnd: (event: TouchEvent) => void
}

/**
 * Delay single activation so double-click (desktop) and double-tap (touch)
 * can fire without triggering navigation first.
 */
export function useDoubleActivation(options: {
  onSingle: (event: Event) => void
  onDouble: (event: Event) => void
  delay?: number
}): DoubleActivationHandlers {
  const delay = options.delay ?? DEFAULT_DELAY_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastTouchEnd = 0

  function clearPendingSingle() {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function scheduleSingle(event: Event) {
    clearPendingSingle()
    timer = setTimeout(() => {
      timer = undefined
      options.onSingle(event)
    }, delay)
  }

  function triggerDouble(event: Event) {
    event.preventDefault()
    event.stopPropagation()
    clearPendingSingle()
    options.onDouble(event)
  }

  function onClick(event: MouseEvent) {
    if (event.button !== 0) return
    if (event.detail > 1) return

    event.preventDefault()
    scheduleSingle(event)
  }

  function onDblclick(event: MouseEvent) {
    if (event.button !== 0) return
    triggerDouble(event)
  }

  function onTouchEnd(event: TouchEvent) {
    if (event.touches.length > 0) return

    const now = Date.now()
    if (now - lastTouchEnd <= delay) {
      triggerDouble(event)
      lastTouchEnd = 0
      return
    }

    lastTouchEnd = now
    event.preventDefault()
    scheduleSingle(event)
  }

  return { onClick, onDblclick, onTouchEnd }
}

export function useLikeBurst(): {
  burstVisible: Ref<boolean>
  triggerBurst: () => void
} {
  const burstVisible = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function triggerBurst() {
    burstVisible.value = false
    clearTimeout(timer)
    requestAnimationFrame(() => {
      burstVisible.value = true
      timer = setTimeout(() => {
        burstVisible.value = false
      }, 650)
    })
  }

  return { burstVisible, triggerBurst }
}
