export interface DragReorderState {
  draggingIndex: number | null
  dropIndex: number | null
}

export interface DragReorderOptions {
  onReorder: (fromIndex: number, toIndex: number) => void
}

/**
 * Pointer-based drag reordering for lists of elements with drag handles.
 * Returns setup/teardown helpers for attaching to a container.
 */
export function createBlockDragController(options: DragReorderOptions) {
  let container: HTMLElement | null = null
  let draggingIndex: number | null = null
  let dropIndex: number | null = null
  let dragGhost: HTMLElement | null = null
  let activeHandle: HTMLElement | null = null

  function getBlockElements(): HTMLElement[] {
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>('[data-block-index]'))
  }

  function dropIndexFromPointer(clientY: number): number | null {
    const blocks = getBlockElements()
    if (blocks.length === 0) return null

    for (let i = 0; i < blocks.length; i++) {
      const rect = blocks[i].getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      if (clientY < midpoint) return Number(blocks[i].dataset.blockIndex)
    }

    const last = blocks[blocks.length - 1]
    return Number(last.dataset.blockIndex)
  }

  function updateDropIndicator() {
    if (!container) return
    const blocks = getBlockElements()

    for (const block of blocks) {
      const idx = Number(block.dataset.blockIndex)
      block.classList.toggle('wiki-editor-block-drop-before', dropIndex === idx)
      block.classList.remove('wiki-editor-block-drop-after')
    }

    if (dropIndex !== null && draggingIndex !== null) {
      const target = blocks.find((block) => Number(block.dataset.blockIndex) === dropIndex)
      if (target && dropIndex > draggingIndex) {
        target.classList.add('wiki-editor-block-drop-after')
        target.classList.remove('wiki-editor-block-drop-before')
      }
    }
  }

  function clearDropIndicator() {
    if (!container) return
    for (const block of getBlockElements()) {
      block.classList.remove('wiki-editor-block-drop-before', 'wiki-editor-block-drop-after')
    }
  }

  function removeGhost() {
    dragGhost?.remove()
    dragGhost = null
  }

  function onHandlePointerDown(event: PointerEvent) {
    const handle = event.currentTarget as HTMLElement
    const block = handle.closest<HTMLElement>('[data-block-index]')
    if (!block || !container) return

    event.preventDefault()
    event.stopPropagation()

    draggingIndex = Number(block.dataset.blockIndex)
    if (Number.isNaN(draggingIndex)) return

    block.classList.add('wiki-editor-block-dragging')
    activeHandle = handle
    handle.setPointerCapture(event.pointerId)

    const rect = block.getBoundingClientRect()
    dragGhost = block.cloneNode(true) as HTMLElement
    dragGhost.classList.add('wiki-editor-block-ghost')
    dragGhost.style.width = `${rect.width}px`
    dragGhost.style.left = `${rect.left}px`
    dragGhost.style.top = `${rect.top}px`
    document.body.appendChild(dragGhost)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  function onPointerMove(event: PointerEvent) {
    if (draggingIndex === null || !dragGhost) return

    dropIndex = dropIndexFromPointer(event.clientY)
    const rect = dragGhost.getBoundingClientRect()
    dragGhost.style.top = `${event.clientY - rect.height / 2}px`
    updateDropIndicator()
  }

  function onPointerUp(event: PointerEvent) {
    const fromIndex = draggingIndex
    const toIndex = dropIndex

    if (activeHandle?.hasPointerCapture?.(event.pointerId)) {
      activeHandle.releasePointerCapture(event.pointerId)
    }
    activeHandle = null

    for (const block of getBlockElements()) {
      block.classList.remove('wiki-editor-block-dragging')
    }
    clearDropIndicator()
    removeGhost()

    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)

    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      options.onReorder(fromIndex, toIndex)
    }

    draggingIndex = null
    dropIndex = null
  }

  function attachHandles(root: HTMLElement) {
    container = root
    const handles = root.querySelectorAll<HTMLElement>('.wiki-editor-block-handle')
    for (const handle of handles) {
      handle.addEventListener('pointerdown', onHandlePointerDown)
    }
  }

  function detachHandles(root: HTMLElement) {
    const handles = root.querySelectorAll<HTMLElement>('.wiki-editor-block-handle')
    for (const handle of handles) {
      handle.removeEventListener('pointerdown', onHandlePointerDown)
    }
    clearDropIndicator()
    removeGhost()
    container = null
    draggingIndex = null
    dropIndex = null
  }

  return { attachHandles, detachHandles }
}

/**
 * Wrap rendered markdown block elements with drag handles.
 */
export function wrapDomBlocks(
  _root: HTMLElement,
  blockMatches: Map<HTMLElement, { index: number; type: string }>,
): void {
  for (const [element, block] of blockMatches) {
    if (element.closest('.wiki-editor-block')) continue
    if (element.classList.contains('wiki-editor-block')) continue

    const wrapper = document.createElement('div')
    wrapper.className = 'wiki-editor-block'
    wrapper.dataset.blockIndex = String(block.index)
    wrapper.dataset.blockType = block.type

    const handle = document.createElement('button')
    handle.type = 'button'
    handle.className = 'wiki-editor-block-handle'
    handle.setAttribute('aria-label', `Drag to reorder ${block.type}`)
    handle.setAttribute('title', 'Drag to reorder')
    handle.innerHTML =
      '<svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true"><circle cx="2" cy="2" r="1.5" fill="currentColor"/><circle cx="8" cy="2" r="1.5" fill="currentColor"/><circle cx="2" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="2" cy="14" r="1.5" fill="currentColor"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/></svg>'

    element.parentNode?.insertBefore(wrapper, element)
    wrapper.appendChild(handle)
    wrapper.appendChild(element)
  }
}

/** Remove drag wrappers and restore original DOM structure. */
export function unwrapDomBlocks(root: HTMLElement): void {
  const wrappers = Array.from(root.querySelectorAll<HTMLElement>('.wiki-editor-block'))
  for (const wrapper of wrappers) {
    const content = wrapper.querySelector(':scope > :not(.wiki-editor-block-handle)')
    if (content && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(content, wrapper)
    }
    wrapper.remove()
  }
}
