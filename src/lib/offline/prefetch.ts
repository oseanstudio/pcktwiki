import { loadPublicWikiData } from '@/lib/lichen/load-public-wiki'
import { getWatchlist } from '@/lib/watchlist'
import { isOnline } from '@/lib/offline-queue'

let prefetchRunning = false

export async function prefetchWatchedWikis(): Promise<void> {
  if (!isOnline() || prefetchRunning) return
  prefetchRunning = true
  try {
    const watchlist = getWatchlist()
    await Promise.all(
      watchlist.slice(0, 12).map((entry) =>
        loadPublicWikiData(entry.handle, entry.wikiSlug, { force: true }).catch(() => null),
      ),
    )
  } finally {
    prefetchRunning = false
  }
}
