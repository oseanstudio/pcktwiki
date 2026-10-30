import type { FeaturedWiki } from '@/data/featured-wikis'

export interface FloatingWikiLayoutItem {
  wiki: FeaturedWiki
  top: number
  left?: number
  right?: number
  size: number
  opacity: number
}

function layoutSide(wikis: FeaturedWiki[], side: 'left' | 'right'): FloatingWikiLayoutItem[] {
  return wikis.map((wiki, index) => {
    let hash = 0
    for (let i = 0; i < wiki.slug.length; i++) {
      hash = (hash << 5) - hash + wiki.slug.charCodeAt(i)
      hash |= 0
    }
    hash = Math.abs(hash)

    const topRaw = 11 + (78 / (wikis.length + 1)) * (index + 1) + (hash % 4) - 2
    const top = Math.max(8, Math.min(92, topRaw))
    const offset = top > 38 && top < 78 ? 5 + (hash % 5) : 15 + (hash % 12)

    return {
      wiki,
      top,
      [side]: offset,
      size: 56 + (hash % 24),
      opacity: 0.5 + (hash % 25) / 100,
    }
  })
}

export function layoutFloatingWikis(wikis: FeaturedWiki[]): {
  left: FloatingWikiLayoutItem[]
  right: FloatingWikiLayoutItem[]
} {
  const mid = Math.ceil(wikis.length / 2)
  return {
    left: layoutSide(wikis.slice(0, mid), 'left'),
    right: layoutSide(wikis.slice(mid), 'right'),
  }
}

export function chipScrollOffset(
  item: FloatingWikiLayoutItem,
  scrollProgress: number,
): number {
  const travel = 55 + ((item.size - 56) / 24) * 90
  const maxUp = Math.max(0, (item.top - 8) * 5)
  const maxDown = Math.max(0, (92 - item.top) * 5)
  const range = Math.min(travel, maxUp + maxDown)
  const cappedUp = Math.min(range, maxUp)
  const cappedDown = Math.min(range, maxDown)
  const total = cappedUp + cappedDown
  return -cappedUp + total * scrollProgress
}
