/** Keyboard shortcut parsing — matches artsky bindings (WASD, IJKL, vim-style aliases). */

export type NavDirection = 'up' | 'down' | 'left' | 'right'

export function parseMovementDirection(e: KeyboardEvent): NavDirection | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null
  const key = e.key.toLowerCase()
  if (key === 'w' || key === 'i' || key === 'arrowup') return 'up'
  if (key === 's' || key === 'k' || key === 'arrowdown') return 'down'
  if (key === 'a' || key === 'j' || key === 'arrowleft') return 'left'
  if (key === 'd' || key === 'l' || key === 'arrowright') return 'right'
  return null
}

export function isHorizontalDirection(direction: NavDirection): boolean {
  return direction === 'left' || direction === 'right'
}

export function isActivateKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  const key = e.key.toLowerCase()
  return key === 'e' || key === 'o' || key === 'enter'
}

export function isBackKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  const key = e.key.toLowerCase()
  return key === 'q' || key === 'u' || e.key === 'Backspace'
}

export function isMovementKey(e: KeyboardEvent): boolean {
  return parseMovementDirection(e) !== null
}

export function isWikiActionKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  const key = e.key.toLowerCase()
  return (
    key === 'r' ||
    key === 'c' ||
    key === 'f' ||
    key === 'm' ||
    key === '`' ||
    e.code === 'Space'
  )
}

export function shouldPreventArtskyShortcut(e: KeyboardEvent): boolean {
  return (
    isMovementKey(e) ||
    isActivateKey(e) ||
    isBackKey(e) ||
    isWikiActionKey(e) ||
    e.key === 'Escape'
  )
}
