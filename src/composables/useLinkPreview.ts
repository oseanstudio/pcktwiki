import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import type { NotePreview } from '@/lib/link-preview'

/** Preview of a page that has no note behind it yet — the red-link case. */
export interface MissingPreview {
  kind: 'missing'
  title: string
}

export type LinkPreviewData = ({ kind: 'note' } & NotePreview) | MissingPreview

export type LinkPreviewResolver = (
  anchor: HTMLAnchorElement,
) => LinkPreviewData | null

const OPEN_DELAY_MS = 350
const CLOSE_DELAY_MS = 200

const activeAnchor = shallowRef<HTMLAnchorElement | null>(null)
const activeData = shallowRef<LinkPreviewData | null>(null)
const activeHref = ref('')
/** Which consumer opened the card — every other one keeps its card hidden. */
const activeOwner = shallowRef<symbol | null>(null)

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (openTimer) clearTimeout(openTimer)
  if (closeTimer) clearTimeout(closeTimer)
  openTimer = null
  closeTimer = null
}

function closeNow() {
  clearTimers()
  activeAnchor.value = null
  activeData.value = null
  activeHref.value = ''
  activeOwner.value = null
}

function supportsHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
}

/**
 * Wikipedia-style page previews: hovering an internal link long enough opens a
 * card with the target page's lead text. One card is open at a time, app-wide.
 */
export function useLinkPreview(resolve: LinkPreviewResolver) {
  const bound = ref(false)
  const ownerId = Symbol('link-preview')
  const isOwner = computed(() => activeOwner.value === ownerId)

  function open(anchor: HTMLAnchorElement) {
    const data = resolve(anchor)
    if (!data) return
    activeAnchor.value = anchor
    activeData.value = data
    activeHref.value = anchor.getAttribute('href') ?? ''
    activeOwner.value = ownerId
    bindDismissListeners()
  }

  function scheduleOpen(anchor: HTMLAnchorElement) {
    if (activeAnchor.value === anchor) {
      clearTimers()
      return
    }
    clearTimers()
    openTimer = setTimeout(() => open(anchor), OPEN_DELAY_MS)
  }

  function scheduleClose() {
    if (openTimer) {
      clearTimeout(openTimer)
      openTimer = null
    }
    if (!activeAnchor.value) return
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(closeNow, CLOSE_DELAY_MS)
  }

  function previewableAnchor(target: EventTarget | null): HTMLAnchorElement | null {
    if (!(target instanceof Element)) return null
    const anchor = target.closest('a[href]')
    return anchor instanceof HTMLAnchorElement ? anchor : null
  }

  function onPointerOver(event: PointerEvent) {
    if (event.pointerType && event.pointerType !== 'mouse') return
    if (!supportsHover()) return
    const anchor = previewableAnchor(event.target)
    if (!anchor) return
    scheduleOpen(anchor)
  }

  function onPointerOut(event: PointerEvent) {
    if (event.pointerType && event.pointerType !== 'mouse') return
    const anchor = previewableAnchor(event.target)
    if (!anchor) return
    // Moving within the same link (across a nested span) is not a leave.
    const next = event.relatedTarget
    if (next instanceof Node && anchor.contains(next)) return
    scheduleClose()
  }

  function onFocusIn(event: FocusEvent) {
    const anchor = previewableAnchor(event.target)
    if (!anchor || !anchor.matches(':focus-visible')) return
    clearTimers()
    open(anchor)
  }

  function onFocusOut(event: FocusEvent) {
    const anchor = previewableAnchor(event.target)
    if (!anchor) return
    scheduleClose()
  }

  /** Card hover keeps the card alive so links inside it stay clickable. */
  function onCardEnter() {
    clearTimers()
  }

  function onCardLeave() {
    scheduleClose()
  }

  function onWindowScroll() {
    closeNow()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeNow()
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target
    if (target instanceof Element && target.closest('[data-link-preview-card]')) return
    closeNow()
  }

  function bindDismissListeners() {
    if (bound.value) return
    bound.value = true
    window.addEventListener('scroll', onWindowScroll, { passive: true, capture: true })
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('pointerdown', onPointerDown, true)
  }

  function unbindDismissListeners() {
    if (!bound.value) return
    bound.value = false
    window.removeEventListener('scroll', onWindowScroll, true)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('pointerdown', onPointerDown, true)
  }

  onBeforeUnmount(() => {
    unbindDismissListeners()
    if (isOwner.value) closeNow()
  })

  return {
    anchorEl: computed(() => (isOwner.value ? activeAnchor.value : null)),
    preview: computed(() => (isOwner.value ? activeData.value : null)),
    href: computed(() => (isOwner.value ? activeHref.value : '')),
    onPointerOver,
    onPointerOut,
    onFocusIn,
    onFocusOut,
    onCardEnter,
    onCardLeave,
    close: closeNow,
  }
}
