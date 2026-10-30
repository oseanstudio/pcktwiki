import type { NavDirection } from '@/lib/keyboard-shortcuts'

/** Move a linear index (single column list). */
export function moveLinearIndex(
  current: number,
  count: number,
  direction: NavDirection,
): number {
  if (count <= 0) return 0
  if (direction === 'up' || direction === 'left') {
    return Math.max(0, current - 1)
  }
  return Math.min(count - 1, current + 1)
}

/** Move a grid index with a fixed column count. */
export function moveGridIndex(
  current: number,
  count: number,
  columns: number,
  direction: NavDirection,
): number {
  if (count <= 0) return 0
  const cols = Math.max(1, columns)
  if (cols <= 1) return moveLinearIndex(current, count, direction)

  const row = Math.floor(current / cols)
  const col = current % cols

  if (direction === 'up') {
    const nextRow = Math.max(0, row - 1)
    return nextRow * cols + col
  }
  if (direction === 'down') {
    const maxRow = Math.floor((count - 1) / cols)
    const nextRow = Math.min(maxRow, row + 1)
    return Math.min(nextRow * cols + col, count - 1)
  }
  if (direction === 'left') {
    return col > 0 ? current - 1 : current
  }
  if (col < cols - 1 && current + 1 < count) return current + 1
  return current
}

export function moveFocusIndex(
  current: number,
  count: number,
  columns: number,
  direction: NavDirection,
): number {
  return columns <= 1
    ? moveLinearIndex(current, count, direction)
    : moveGridIndex(current, count, columns, direction)
}
