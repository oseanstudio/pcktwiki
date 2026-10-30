import type { NavDirection } from '@/lib/keyboard-shortcuts'

function rectCenter(rect: DOMRect): { cx: number; cy: number } {
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
}

/**
 * Pick the nearest focusable item in a direction using viewport geometry —
 * same idea as artsky's masonry horizontal nav (closest vertical neighbor in the next column).
 */
export function findNearestItemInDirection(
  items: HTMLElement[],
  currentIndex: number,
  direction: NavDirection,
): number {
  if (items.length === 0) return 0
  if (currentIndex < 0) return 0

  const current = items[currentIndex]
  if (!current) return Math.min(currentIndex, items.length - 1)

  const curRect = current.getBoundingClientRect()
  if (curRect.width <= 0 && curRect.height <= 0) return currentIndex

  const { cx: curCx, cy: curCy } = rectCenter(curRect)
  let bestIndex = currentIndex
  let bestScore = Infinity

  for (let i = 0; i < items.length; i++) {
    if (i === currentIndex) continue

    const rect = items[i]!.getBoundingClientRect()
    if (rect.width <= 0 && rect.height <= 0) continue

    const { cx, cy } = rectCenter(rect)
    const dx = cx - curCx
    const dy = cy - curCy
    const overlapX = Math.min(curRect.right, rect.right) - Math.max(curRect.left, rect.left)
    const overlapY = Math.min(curRect.bottom, rect.bottom) - Math.max(curRect.top, rect.top)
    const minStep = 2

    let inDirection = false
    let primary = 0
    let secondary = 0

    switch (direction) {
      case 'up':
        inDirection = dy < -minStep
        primary = -dy
        secondary = Math.abs(dx)
        if (overlapX > 0) secondary *= 0.35
        break
      case 'down':
        inDirection = dy > minStep
        primary = dy
        secondary = Math.abs(dx)
        if (overlapX > 0) secondary *= 0.35
        break
      case 'left':
        inDirection = dx < -minStep
        primary = -dx
        secondary = Math.abs(dy)
        if (overlapY > 0) secondary *= 0.35
        break
      case 'right':
        inDirection = dx > minStep
        primary = dx
        secondary = Math.abs(dy)
        if (overlapY > 0) secondary *= 0.35
        break
    }

    if (!inDirection) continue

    const score = primary + secondary * 1.75
    if (score < bestScore - 0.5 || (Math.abs(score - bestScore) <= 0.5 && i < bestIndex)) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}
