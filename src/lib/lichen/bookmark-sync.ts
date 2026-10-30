import type { Agent } from '@atproto/api'
import {
  findBookmarkForWiki,
  writeBookmark,
  deleteBookmark,
} from '@/lib/lichen/bookmarks'
import { watchWiki, unwatchWiki, type WatchEntry } from '@/lib/watchlist'

export async function syncWatchToBookmark(agent: Agent, entry: WatchEntry): Promise<void> {
  const existing = await findBookmarkForWiki(agent, agent.accountDid, entry.wikiUri)
  if (!existing) {
    await writeBookmark(agent, entry.wikiUri)
  }
}

export async function syncUnwatchFromBookmark(agent: Agent, wikiUri: string): Promise<void> {
  const existing = await findBookmarkForWiki(agent, agent.accountDid, wikiUri)
  if (existing) {
    await deleteBookmark(agent, existing.uri)
  }
}

export async function migrateWatchlistToBookmarks(agent: Agent): Promise<number> {
  const { getWatchlist } = await import('@/lib/watchlist')
  const watchlist = getWatchlist()
  let migrated = 0
  for (const entry of watchlist) {
    const existing = await findBookmarkForWiki(agent, agent.accountDid, entry.wikiUri)
    if (!existing) {
      await writeBookmark(agent, entry.wikiUri)
      migrated += 1
    }
  }
  return migrated
}

export async function watchWikiWithBookmark(agent: Agent | null, entry: WatchEntry): Promise<void> {
  watchWiki(entry)
  if (agent) {
    await syncWatchToBookmark(agent, entry).catch(() => {})
  }
}

export async function unwatchWikiWithBookmark(agent: Agent | null, wikiUri: string): Promise<void> {
  unwatchWiki(wikiUri)
  if (agent) {
    await syncUnwatchFromBookmark(agent, wikiUri).catch(() => {})
  }
}
