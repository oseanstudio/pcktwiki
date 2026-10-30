import { nextTick, watch, type Ref } from 'vue'

export interface ComboboxKeyboardHandlers {
  onSelect: (index: number) => void
  onClose?: () => void
  /**
   * Enter while the list is open but no option is highlighted.
   * Return `false` to let the event fall through (e.g. to submit a form
   * with the typed value); any other return value prevents the default.
   */
  onEnterWithoutSelection?: () => boolean | void
}

function moveHighlight(activeIndex: Ref<number>, delta: 1 | -1, count: number): void {
  if (count <= 0) return

  if (activeIndex.value < 0) {
    activeIndex.value = delta > 0 ? 0 : count - 1
    return
  }

  const next = activeIndex.value + delta
  if (next < 0) {
    activeIndex.value = count - 1
  } else if (next >= count) {
    activeIndex.value = 0
  } else {
    activeIndex.value = next
  }
}

/**
 * Arrow-key and Enter navigation for combobox-style inputs with a suggestion list.
 */
export function useComboboxKeyboard(
  open: Ref<boolean>,
  activeIndex: Ref<number>,
  itemCount: Ref<number>,
  handlers: ComboboxKeyboardHandlers,
  getOptionId?: (index: number) => string,
) {
  function onKeydown(event: KeyboardEvent): void {
    const count = itemCount.value

    if (event.key === 'Escape') {
      if (!open.value) return
      event.preventDefault()
      event.stopPropagation()
      handlers.onClose?.()
      activeIndex.value = -1
      return
    }

    if (event.key === 'Enter') {
      if (open.value && activeIndex.value >= 0 && count > 0) {
        event.preventDefault()
        event.stopPropagation()
        handlers.onSelect(activeIndex.value)
        return
      }

      if (handlers.onEnterWithoutSelection) {
        const handled = handlers.onEnterWithoutSelection()
        if (handled !== false) {
          event.preventDefault()
          event.stopPropagation()
        }
      }
      return
    }

    if (!open.value || count <= 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      moveHighlight(activeIndex, 1, count)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      moveHighlight(activeIndex, -1, count)
    }
  }

  if (getOptionId) {
    watch(activeIndex, (index) => {
      if (index < 0) return
      void nextTick(() => {
        document.getElementById(getOptionId(index))?.scrollIntoView({ block: 'nearest' })
      })
    })
  }

  return { onKeydown }
}
