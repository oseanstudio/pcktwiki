import {
  GUEST_FEED_RELATIONS,
  GUEST_FEED_TOPICS,
  findGuestFeedWiki,
  type GuestFeedTopic,
  wikiKey,
} from '@/data/guest-feed'
import type { WatchEntry } from '@/lib/watchlist'

/** Topic ids from watched wikis plus topics on wikis linked to them in the feed. */
export function topicIdsForWatchlist(watchlist: WatchEntry[]): string[] {
  if (watchlist.length === 0) return []

  const watchedKeys = new Set(
    watchlist.map((entry) => wikiKey(entry.handle, entry.wikiSlug)),
  )
  const topicIds = new Set<string>()

  for (const entry of watchlist) {
    const wiki = findGuestFeedWiki(entry.handle, entry.wikiSlug)
    wiki?.topics.forEach((id) => topicIds.add(id))
  }

  for (const relation of GUEST_FEED_RELATIONS) {
    const fromKey = wikiKey(relation.from.handle, relation.from.slug)
    const toKey = wikiKey(relation.to.handle, relation.to.slug)
    if (!watchedKeys.has(fromKey) && !watchedKeys.has(toKey)) continue

    findGuestFeedWiki(relation.from.handle, relation.from.slug)?.topics.forEach((id) =>
      topicIds.add(id),
    )
    findGuestFeedWiki(relation.to.handle, relation.to.slug)?.topics.forEach((id) =>
      topicIds.add(id),
    )
  }

  return [...topicIds]
}

/** Watched topics first, then related-only, then the rest — preserves stable order within each tier. */
export function prioritizeGuestFeedTopics(
  topics: GuestFeedTopic[],
  watchlist: WatchEntry[],
): GuestFeedTopic[] {
  const watchedTopicIds = new Set<string>()
  for (const entry of watchlist) {
    const wiki = findGuestFeedWiki(entry.handle, entry.wikiSlug)
    wiki?.topics.forEach((id) => watchedTopicIds.add(id))
  }

  const relatedTopicIds = new Set(topicIdsForWatchlist(watchlist))
  for (const id of watchedTopicIds) relatedTopicIds.delete(id)

  function tier(topic: GuestFeedTopic): number {
    if (watchedTopicIds.has(topic.id)) return 0
    if (relatedTopicIds.has(topic.id)) return 1
    return 2
  }

  return [...topics].sort((a, b) => {
    const tierDiff = tier(a) - tier(b)
    if (tierDiff !== 0) return tierDiff
    return GUEST_FEED_TOPICS.findIndex((t) => t.id === a.id) -
      GUEST_FEED_TOPICS.findIndex((t) => t.id === b.id)
  })
}

export function allTopicsCardDescription(watchlist: WatchEntry[]): string {
  const watchedCount = watchlist.length
  const topicCount = topicIdsForWatchlist(watchlist).length

  if (watchedCount > 0 && topicCount > 0) {
    return 'Your watchlist and updates across the network'
  }

  return 'Browse wikis and updates across the network'
}
