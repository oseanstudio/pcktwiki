import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import { useRoute } from 'vue-router'
import { findNearestItemInDirection } from '@/lib/keyboard-spatial'
import type { NavDirection } from '@/lib/keyboard-shortcuts'
import {
  useKeyboardNav,
  type KeyboardNavContext,
  type KeyboardNavLayer,
} from '@/composables/useKeyboardNavProvider'

export interface KeyboardBrowseOptions {
  id: string
  label: string
  containerRef: Ref<HTMLElement | null | undefined>
  /** Pass when calling from the component that invoked provideKeyboardNav(). */
  nav?: KeyboardNavContext
  itemSelector?: string
  sectionSelector?: string
  enabled?: Ref<boolean> | ComputedRef<boolean>
  priority?: number
  syncActiveIndex?: (items: HTMLElement[]) => number
  onShortcut?: (key: string, e: KeyboardEvent) => boolean
}

const DEFAULT_ITEM_SELECTOR = 'a[href], button:not([disabled])'
const DEFAULT_SECTION_SELECTOR = '[data-kb-section]'

function queryFocusable(container: HTMLElement, selector: string): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(selector)].filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    return true
  })
}

export function useKeyboardBrowse({
  id,
  label,
  containerRef,
  nav: navContext,
  itemSelector = DEFAULT_ITEM_SELECTOR,
  sectionSelector = DEFAULT_SECTION_SELECTOR,
  enabled,
  priority = 0,
  syncActiveIndex,
  onShortcut,
}: KeyboardBrowseOptions) {
  const nav = navContext ?? useKeyboardNav()
  const route = useRoute()
  const focusedIndex = ref(0)
  const itemCount = ref(0)
  const drilledSection = ref<HTMLElement | null>(null)
  const isEnabled = enabled ?? ref(true)

  const sectionCount = ref(0)
  const isActive = computed(() => nav.activeLayerId.value === id)
  const inSectionMode = computed(() => !drilledSection.value && sectionCount.value > 0)

  function getSections(): HTMLElement[] {
    const container = containerRef.value
    if (!container) return []
    return queryFocusable(container, sectionSelector)
  }

  function getDrillItems(): HTMLElement[] {
    const scope = drilledSection.value ?? containerRef.value
    if (!scope) return []
    return queryFocusable(scope, itemSelector)
  }

  function getItems(): HTMLElement[] {
    if (drilledSection.value) return getDrillItems()
    const sections = getSections()
    if (sections.length > 1) return sections
    return getDrillItems()
  }

  function clearFocusClasses() {
    const container = containerRef.value
    if (!container) return
    container.querySelectorAll('.kb-focus').forEach((el) => el.classList.remove('kb-focus'))
    container.querySelectorAll('.kb-section-focus').forEach((el) => el.classList.remove('kb-section-focus'))
    drilledSection.value?.classList.remove('kb-zone-active')
  }

  function applyFocusClasses(index: number) {
    clearFocusClasses()
    if (!nav.keyboardMode.value || !isActive.value) return

    const items = getItems()
    const target = items[index]
    if (!target) return

    if (inSectionMode.value) {
      target.classList.add('kb-section-focus')
      return
    }

    target.classList.add('kb-focus')
    if (drilledSection.value) {
      drilledSection.value.classList.add('kb-zone-active')
    }
  }

  function refreshItems() {
    const container = containerRef.value
    if (!container) {
      itemCount.value = 0
      sectionCount.value = 0
      return
    }

    sectionCount.value = getSections().length

    if (drilledSection.value && !container.contains(drilledSection.value)) {
      drilledSection.value = null
    }

    const items = getItems()
    itemCount.value = items.length

    if (syncActiveIndex && !drilledSection.value) {
      const synced = syncActiveIndex(items)
      if (synced >= 0) focusedIndex.value = synced
    }

    focusedIndex.value = Math.min(focusedIndex.value, Math.max(0, items.length - 1))
    applyFocusClasses(focusedIndex.value)
    nav.syncActiveLayer()
  }

  function enterSection(section: HTMLElement) {
    drilledSection.value = section
    focusedIndex.value = 0
    applyFocusClasses(0)
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function exitSection(): boolean {
    if (!drilledSection.value) return false
    drilledSection.value = null
    focusedIndex.value = 0
    refreshItems()
    return true
  }

  function moveFocus(direction: NavDirection) {
    const items = getItems()
    if (items.length === 0) return

    if (focusedIndex.value < 0) {
      focusedIndex.value = 0
    } else {
      focusedIndex.value = findNearestItemInDirection(items, focusedIndex.value, direction)
    }

    applyFocusClasses(focusedIndex.value)

    const target = items[focusedIndex.value]
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }

  function onActivate(index: number) {
    const items = getItems()
    const item = items[index]
    if (!item) return

    if (inSectionMode.value && item.matches(sectionSelector)) {
      enterSection(item)
      return
    }

    if (item.tagName === 'A' || item.tagName === 'BUTTON') {
      item.click()
      return
    }

    const link = item.querySelector<HTMLElement>('a[href], button:not([disabled])')
    link?.click()
  }

  function onEscape(): boolean {
    return exitSection()
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
    onEscape,
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
    clearFocusClasses()
    nav.unregisterLayer(id)
    observer?.disconnect()
    mutationObserver?.disconnect()
  })

  watch([containerRef, isEnabled], refreshItems, { flush: 'post' })

  watch(
    () => route.path,
    () => {
      drilledSection.value = null
      focusedIndex.value = 0
      refreshItems()
    },
  )

  watch([focusedIndex, isActive, () => nav.keyboardMode.value], ([index, active]) => {
    if (!active) {
      clearFocusClasses()
      return
    }
    applyFocusClasses(index)
  })

  watch(
    () => nav.activeLayerId.value,
    (activeId, prevId) => {
      if (prevId === id) clearFocusClasses()
      if (activeId === id) refreshItems()
    },
  )

  watch(itemCount, () => nav.syncActiveLayer())

  return {
    focusedIndex,
    itemCount,
    isActive,
    inSectionMode,
    drilledSection,
    refreshItems,
    exitSection,
  }
}
