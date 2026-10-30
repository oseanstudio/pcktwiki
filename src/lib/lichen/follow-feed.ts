import { getNoteWatchlist, getWatchlist } from '@/lib/watchlist'
import { getForks } from '@/lib/lichen/fork'
import {
  fetchNoteWatchNotifications,
  fetchWatchNotifications,
  mergeWatchNotifications,
  type WatchNotification,
} from '@/lib/notifications'
import { loadPublicWikiData } from '@/lib/lichen/load-public-wiki'
import { listRecentChanges } from '@/lib/lichen/recent-changes'
import { summarizeRevisionChange } from '@/lib/lichen/change-summary'

export interface FeedItem extends WatchNotification {
  feedType: 'edit' | 'fork-upstream'
}

export async function fetchFollowFeed(limit = 50): Promise<FeedItem[]> {
  const watchlist = getWatchlist()
  const noteWatchlist = getNoteWatchlist()
  const items: FeedItem[] = []

  const [wikiNotifications, noteNotifications] = await Promise.all([
    fetchWatchNotifications(watchlist, Math.ceil(limit / Math.max(watchlist.length, 1))),
    fetchNoteWatchNotifications(noteWatchlist),
  ])
  for (const n of mergeWatchNotifications(wikiNotifications, noteNotifications)) {
    items.push({ ...n, feedType: 'edit' })
  }

  for (const fork of getForks()) {
    try {
      const source = await loadPublicWikiData(fork.sourceHandle, fork.sourceSlug, { force: true })
      const changes = listRecentChanges(source.revisionRecords, source.notesWithContent, 3)
      for (const change of changes) {
        const summary = summarizeRevisionChange(
          change.revision,
          change.note,
          source.revisionRecords,
        )
        items.push({
          id: `fork:${fork.forkWikiUri}:${change.revision.uri}`,
          noteTitle: change.note.title,
          noteSlug: change.note.slug,
          wikiHandle: fork.sourceHandle,
          wikiSlug: fork.sourceSlug,
          wikiName: `↑ ${fork.sourceSlug}`,
          createdAt: change.revision.createdAt,
          action: summary.action,
          detail: summary.detail,
          scope: 'wiki',
          feedType: 'fork-upstream',
        })
      }
    } catch {
      // upstream unavailable
    }
  }

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export function filterFeedByType(items: FeedItem[], type: 'all' | 'edit' | 'fork-upstream'): FeedItem[] {
  if (type === 'all') return items
  return items.filter((item) => item.feedType === type)
}
