/** Shared keyboard helpers — adapted from artsky modalKeyboard pattern. */

const TEXT_INPUT_TYPES = new Set([
  '',
  'text',
  'search',
  'email',
  'password',
  'url',
  'tel',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
])

export function isEditableElement(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type.toLowerCase()
    return TEXT_INPUT_TYPES.has(type)
  }
  return false
}

export function getFocusedEditableElement(): HTMLElement | null {
  const active = typeof document !== 'undefined' ? document.activeElement : null
  return isEditableElement(active) ? active : null
}

/** True when grid/shortcut handlers should yield to typing in a field. */
export function shouldBlockGridKeysForEditableTarget(
  target: HTMLElement | null | undefined,
): boolean {
  if (target && isEditableElement(target)) return true
  return getFocusedEditableElement() !== null
}

export function blurEditableOnEscape(e: KeyboardEvent, target?: HTMLElement | null): void {
  if (e.key !== 'Escape') return
  const editable =
    (target && isEditableElement(target) ? target : null) ?? getFocusedEditableElement()
  if (!editable) return
  e.preventDefault()
  editable.blur()
}

/**
 * Gate for global/grid shortcut handlers. Returns true when the caller should return
 * early (only Escape may have been handled to blur the active field).
 */
export function gateKeyboardShortcutsForEditable(e: KeyboardEvent): boolean {
  const target = e.target instanceof HTMLElement ? e.target : null
  if (!shouldBlockGridKeysForEditableTarget(target)) return false
  blurEditableOnEscape(e, target)
  return true
}

export function getTopModalDialog(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
  return dialogs.length > 0 ? dialogs[dialogs.length - 1]! : null
}

/** Full-page handlers: skip when a modal is open and the event is outside the top dialog. */
export function shouldUnderlayHandleGridKeys(target: HTMLElement): boolean {
  const topDialog = getTopModalDialog()
  if (!topDialog) return true
  return topDialog.contains(target)
}
