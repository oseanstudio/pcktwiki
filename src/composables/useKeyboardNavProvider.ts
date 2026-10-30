import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  type InjectionKey,
  type Ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  gateKeyboardShortcutsForEditable,
  getTopModalDialog,
  shouldUnderlayHandleGridKeys,
} from '@/lib/keyboard-input'
import {
  isActivateKey,
  isBackKey,
  isHorizontalDirection,
  isWikiActionKey,
  parseMovementDirection,
  type NavDirection,
} from '@/lib/keyboard-shortcuts'

export interface KeyboardNavLayer {
  id: string
  label: string
  priority: number
  enabled: Ref<boolean>
  itemCount: Ref<number>
  focusedIndex: Ref<number>
  onActivate: (index: number) => void
  moveFocus: (direction: NavDirection) => void
  onShortcut?: (key: string, e: KeyboardEvent) => boolean
  /** Exit a drilled-in section; return true when handled. */
  onEscape?: () => boolean
}

export interface KeyboardNavContext {
  helpOpen: Ref<boolean>
  keyboardMode: Ref<boolean>
  activeLayerId: Ref<string | null>
  activeLayer: Ref<KeyboardNavLayer | null>
  layers: Ref<KeyboardNavLayer[]>
  registerLayer: (layer: KeyboardNavLayer) => void
  unregisterLayer: (id: string) => void
  syncActiveLayer: () => void
  focusSearch: () => void
  setPageShortcutHandler: (handler: ((key: string, e: KeyboardEvent) => boolean) | null) => void
}

const KEYBOARD_NAV_KEY: InjectionKey<KeyboardNavContext> = Symbol('keyboardNav')

function sortLayers(layers: KeyboardNavLayer[]): KeyboardNavLayer[] {
  return [...layers].sort((a, b) => a.priority - b.priority)
}

function pickDefaultLayer(layers: KeyboardNavLayer[]): KeyboardNavLayer | null {
  const available = layers.filter((layer) => layer.enabled.value && layer.itemCount.value > 0)
  return available[0] ?? null
}

export function provideKeyboardNav(): KeyboardNavContext {
  const router = useRouter()
  const route = useRoute()
  const helpOpen = ref(false)
  const keyboardMode = ref(false)
  const layerMap = shallowRef(new Map<string, KeyboardNavLayer>())
  const activeLayerId = ref<string | null>(null)
  const pageShortcutHandler = shallowRef<((key: string, e: KeyboardEvent) => boolean) | null>(null)

  function enterKeyboardMode() {
    keyboardMode.value = true
  }

  function exitKeyboardMode() {
    keyboardMode.value = false
  }

  const layers = computed(() => sortLayers([...layerMap.value.values()]))

  const activeLayer = computed(() => {
    const id = activeLayerId.value
    if (!id) return null
    const layer = layerMap.value.get(id)
    if (!layer?.enabled.value || layer.itemCount.value <= 0) return null
    return layer
  })

  function syncActiveLayer() {
    const best = pickDefaultLayer(layers.value)
    if (!best) {
      activeLayerId.value = null
      return
    }
    const current = activeLayerId.value ? layerMap.value.get(activeLayerId.value) : null
    if (
      !current ||
      !current.enabled.value ||
      current.itemCount.value <= 0 ||
      best.priority < current.priority
    ) {
      activeLayerId.value = best.id
    }
  }

  function registerLayer(layer: KeyboardNavLayer) {
    layerMap.value = new Map(layerMap.value).set(layer.id, layer)
    syncActiveLayer()
  }

  function unregisterLayer(id: string) {
    const next = new Map(layerMap.value)
    next.delete(id)
    layerMap.value = next
    syncActiveLayer()
  }

  function setPageShortcutHandler(
    handler: ((key: string, e: KeyboardEvent) => boolean) | null,
  ) {
    pageShortcutHandler.value = handler
  }

  function focusSearch() {
    const selectors = [
      '#global-wiki-search-input',
      '#browse-wiki-search-input',
      '#wiki-search-input',
      'input[type="search"]',
    ]
    for (const selector of selectors) {
      const el = document.querySelector<HTMLInputElement>(selector)
      if (el) {
        el.focus()
        el.select()
        return
      }
    }
  }

  function closeTopOverlay() {
    if (helpOpen.value) {
      helpOpen.value = false
      return true
    }
    return false
  }

  function onGlobalKeyDown(e: KeyboardEvent) {
    const target = e.target instanceof HTMLElement ? e.target : null
    const topDialog = getTopModalDialog()

    if (topDialog && target && !topDialog.contains(target)) return
    if (gateKeyboardShortcutsForEditable(e)) return

    const key = e.key.toLowerCase()

    if (e.key === 'Escape') {
      if (closeTopOverlay()) {
        e.preventDefault()
        return
      }
      const layer = activeLayer.value
      if (layer?.onEscape?.()) {
        e.preventDefault()
        enterKeyboardMode()
      }
      return
    }

    if (e.ctrlKey || e.metaKey) return

    if (key === '?' || (key === '/' && e.shiftKey)) {
      e.preventDefault()
      helpOpen.value = true
      return
    }

    if (key === '/') {
      e.preventDefault()
      focusSearch()
      return
    }

    if (isBackKey(e)) {
      const layer = activeLayer.value
      if (layer?.onEscape?.()) {
        e.preventDefault()
        enterKeyboardMode()
        return
      }
      if (route.name === 'home') return
      if (window.history.length > 1) {
        e.preventDefault()
        router.back()
      }
      return
    }

    if (!shouldUnderlayHandleGridKeys(target ?? document.body)) return

    const layer = activeLayer.value
    if (!layer) return

    if (isWikiActionKey(e) && pageShortcutHandler.value?.(key, e)) {
      enterKeyboardMode()
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (isWikiActionKey(e) && layer.onShortcut?.(key, e)) {
      enterKeyboardMode()
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (isActivateKey(e)) {
      enterKeyboardMode()
      e.preventDefault()
      e.stopPropagation()
      layer.onActivate(layer.focusedIndex.value)
      return
    }

    const direction = parseMovementDirection(e)
    if (!direction) return

    if (e.repeat && isHorizontalDirection(direction)) return

    enterKeyboardMode()
    e.preventDefault()
    e.stopPropagation()
    layer.moveFocus(direction)
  }

  function onPointerDown() {
    exitKeyboardMode()
  }

  onMounted(() => {
    window.addEventListener('keydown', onGlobalKeyDown)
    window.addEventListener('pointerdown', onPointerDown, true)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onGlobalKeyDown)
    window.removeEventListener('pointerdown', onPointerDown, true)
  })

  const ctx: KeyboardNavContext = {
    helpOpen,
    keyboardMode,
    activeLayerId,
    activeLayer,
    layers,
    registerLayer,
    unregisterLayer,
    syncActiveLayer,
    focusSearch,
    setPageShortcutHandler,
  }

  provide(KEYBOARD_NAV_KEY, ctx)
  return ctx
}

export function useKeyboardNav(): KeyboardNavContext {
  const ctx = inject(KEYBOARD_NAV_KEY)
  if (!ctx) {
    throw new Error('useKeyboardNav() requires provideKeyboardNav() in a parent component')
  }
  return ctx
}
