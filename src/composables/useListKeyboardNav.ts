import { onMounted, onUnmounted, type Ref } from 'vue'
import { moveFocusIndex } from '@/lib/keyboard-grid'
import { findNearestItemInDirection } from '@/lib/keyboard-spatial'
import {
  isActivateKey,
  parseMovementDirection,
  type NavDirection,
} from '@/lib/keyboard-shortcuts'
import { shouldBlockGridKeysForEditableTarget, blurEditableOnEscape } from '@/lib/keyboard-input'

export interface ListKeyboardNavOptions {
  enabled: Ref<boolean>
  itemCount: Ref<number>
  focusedIndex: Ref<number>
  onActivate: (index: number) => void
  getItems?: () => HTMLElement[]
  columns?: Ref<number>
  spatial?: boolean
  useCapture?: boolean
}

/**
 * Standalone keyboard nav for popups/lists (artsky useListKeyboardNav pattern).
 */
export function useListKeyboardNav({
  enabled,
  itemCount,
  focusedIndex,
  onActivate,
  getItems,
  columns,
  spatial = true,
  useCapture = false,
}: ListKeyboardNavOptions): void {
  const cols = columns ?? { value: 1 } as Ref<number>

  function moveFocus(direction: NavDirection) {
    const count = itemCount.value
    if (count <= 0) return

    if (getItems && spatial) {
      const items = getItems()
      focusedIndex.value = findNearestItemInDirection(items, focusedIndex.value, direction)
      return
    }

    focusedIndex.value = moveFocusIndex(
      focusedIndex.value,
      count,
      cols.value,
      direction,
    )
  }

  onMounted(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabled.value || itemCount.value <= 0) return

      const target = e.target instanceof HTMLElement ? e.target : null
      if (shouldBlockGridKeysForEditableTarget(target)) {
        blurEditableOnEscape(e, target)
        return
      }

      if (isActivateKey(e)) {
        e.preventDefault()
        e.stopPropagation()
        onActivate(focusedIndex.value)
        return
      }

      const direction = parseMovementDirection(e)
      if (!direction) return

      e.preventDefault()
      e.stopPropagation()
      moveFocus(direction)
    }

    window.addEventListener('keydown', onKeyDown, useCapture)
    onUnmounted(() => window.removeEventListener('keydown', onKeyDown, useCapture))
  })
}
