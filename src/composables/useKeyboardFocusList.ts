import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import { moveFocusIndex } from '@/lib/keyboard-grid'
import { findNearestItemInDirection } from '@/lib/keyboard-spatial'
import type { NavDirection } from '@/lib/keyboard-shortcuts'
import { useKeyboardNav, type KeyboardNavLayer } from '@/composables/useKeyboardNavProvider'

export interface KeyboardFocusListOptions {
  id: string
  label: string
  containerRef: Ref<HTMLElement | null | undefined>
  itemSelector?: string
  enabled?: Ref<boolean> | ComputedRef<boolean>
  /** Fixed column count when spatial is false. */
  columns?: Ref<number> | ComputedRef<number>
  /** Viewport-based WASD movement (artsky-style). Default true. */
  spatial?: boolean
  priority?: number
  syncActiveIndex?: (items: HTMLElement[]) => number
  onShortcut?: (key: string, e: KeyboardEvent) => boolean
}

const DEFAULT_SELECTOR = 'a[href], button:not([disabled])'

function queryItems(container: HTMLElement, selector: string): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(selector)].filter(
    (el) => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null,
  )
}

export function useKeyboardFocusList({
  id,
  label,
  containerRef,
  itemSelector = DEFAULT_SELECTOR,
  enabled,
  columns,
  spatial = true,
  priority = 10,
  syncActiveIndex,
  onShortcut,
}: KeyboardFocusListOptions) {
  const nav = useKeyboardNav()
  const focusedIndex = ref(0)
  const itemCount = ref(0)
  const isEnabled = enabled ?? ref(true)
  const cols = columns ?? ref(1)

  const isActive = computed(() => nav.activeLayerId.value === id)

  function getItems(): HTMLElement[] {
    const container = containerRef.value
    if (!container) return []
    return queryItems(container, itemSelector)
  }

  function applyFocusClass(index: number) {
    const items = getItems()
    const showFocus = nav.keyboardMode.value && isActive.value
    items.forEach((el, i) => el.classList.toggle('kb-focus', showFocus && i === index))
  }

  function refreshItems() {
    const container = containerRef.value
    if (!container) {
      itemCount.value = 0
      return
    }
    const items = queryItems(container, itemSelector)
    itemCount.value = items.length
    if (syncActiveIndex) {
      const synced = syncActiveIndex(items)
      if (synced >= 0) focusedIndex.value = synced
    }
    focusedIndex.value = Math.min(focusedIndex.value, Math.max(0, items.length - 1))
    applyFocusClass(focusedIndex.value)
  }

  function moveFocus(direction: NavDirection) {
    const items = getItems()
    if (items.length === 0) return

    if (focusedIndex.value < 0) {
      focusedIndex.value = 0
      applyFocusClass(0)
      return
    }

    focusedIndex.value = spatial
      ? findNearestItemInDirection(items, focusedIndex.value, direction)
      : moveFocusIndex(focusedIndex.value, items.length, cols.value, direction)

    applyFocusClass(focusedIndex.value)
  }

  function onActivate(index: number) {
    const item = getItems()[index]
    if (!item) return
    if (item.tagName === 'A' || item.tagName === 'BUTTON') {
      item.click()
      return
    }
    const link = item.querySelector<HTMLElement>('a[href], button:not([disabled])')
    link?.click()
  }

  function isFocused(index: number): boolean {
    return isActive.value && focusedIndex.value === index
  }

  const layer: KeyboardNavLayer = {
    id,
    label,
    priority,
    enabled: isEnabled as Ref<boolean>,
    itemCount,
    focusedIndex,
    onActivate,
    moveFocus,
    onShortcut,
  }

  let observer: ResizeObserver | undefined
  let mutationObserver: MutationObserver | undefined

  onMounted(() => {
    nav.registerLayer(layer)
    refreshItems()

    const container = containerRef.value
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => refreshItems())
      observer.observe(container)
    }

    if (container && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => refreshItems())
      mutationObserver.observe(container, { childList: true, subtree: true })
    }
  })

  onUnmounted(() => {
    applyFocusClass(-1)
    nav.unregisterLayer(id)
    observer?.disconnect()
    mutationObserver?.disconnect()
  })

  watch([containerRef, isEnabled], refreshItems, { flush: 'post' })

  watch([focusedIndex, isActive, () => nav.keyboardMode.value], ([index, active]) => {
    applyFocusClass(active ? index : -1)
    if (!active || !nav.keyboardMode.value) return
    const item = getItems()[index]
    item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  })

  watch(
    () => nav.activeLayerId.value,
    (activeId, prevId) => {
      if (prevId === id) applyFocusClass(-1)
      if (activeId === id) refreshItems()
    },
  )

  return {
    focusedIndex,
    itemCount,
    isActive,
    isFocused,
    refreshItems,
    moveFocus,
  }
}
