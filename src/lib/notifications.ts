import { wikiPath } from '@/data/featured-wikis'
import {
  changeActionLabel,
  summarizeRevisionChange,
  type ChangeAction,
} from '@/lib/lichen/change-summary'
import { loadPublicWikiData } from '@/lib/lichen/load-public-wiki'
import { listRecentChanges } from '@/lib/lichen/recent-changes'
import type { NoteWatchEntry, WatchEntry } from '@/lib/watchlist'

const READ_KEY = 'pckt.wiki.notifications.read'
const READ_EVENT = 'pckt-notifications-read-change'

export interface WatchNotification {
  id: string
  noteTitle: string
  noteSlug: string
  wikiHandle: string
  wikiSlug: string
  wikiName: string
  createdAt: string
  action: ChangeAction
  detail: string
  /** Whether this arrived via a whole-wiki watch or a single-article watch. */
  scope: 'wiki' | 'note'
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function notificationContext(notification: WatchNotification): string {
  return `${notification.wikiName} · ${formatNotificationTime(notification.createdAt)}`
}

export function notificationHeadline(notification: WatchNotification): string {
  return `${changeActionLabel(notification.action)} · ${notification.noteTitle}`
}

function readReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeReadIds(ids: Set<string>): void {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(READ_EVENT))
  }
}

export function getReadNotificationIds(): Set<string> {
  return readReadIds()
}

export function isNotificationRead(id: string): boolean {
  return readReadIds().has(id)
}

export function markNotificationRead(id: string): void {
  const ids = readReadIds()
  if (ids.has(id)) return
  ids.add(id)
  writeReadIds(ids)
}

export function markAllNotificationsRead(ids: string[]): void {
  const readIds = readReadIds()
  let changed = false
  for (const id of ids) {
    if (!readIds.has(id)) {
      readIds.add(id)
      changed = true
    }
  }
  if (changed) writeReadIds(readIds)
}

export function subscribeNotificationReads(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key === READ_KEY) onChange()
  }

  window.addEventListener(READ_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(READ_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function notificationPath(notification: WatchNotification): string {
  return `${wikiPath(notification.wikiHandle, notification.wikiSlug)}/${notification.noteSlug}`
}

export async function fetchWatchNotifications(
  watchlist: WatchEntry[],
  limitPerWiki = 4,
): Promise<WatchNotification[]> {
  if (watchlist.length === 0) return []

  const results = await Promise.allSettled(
    watchlist.map(async (entry) => {
      const data = await loadPublicWikiData(entry.handle, entry.wikiSlug)
      if (!data.wiki) return []

      const changes = listRecentChanges(data.revisionRecords, data.notesWithContent, limitPerWiki)
      return changes.map((change) => {
        const summary = summarizeRevisionChange(
          change.revision,
          change.note,
          data.revisionRecords,
        )
        return {
          id: change.revision.uri,
          noteTitle: change.note.title,
          noteSlug: change.note.slug,
          wikiHandle: entry.handle,
          wikiSlug: entry.wikiSlug,
          wikiName: entry.wikiName,
          createdAt: change.revision.createdAt,
          action: summary.action,
          detail: summary.detail,
          scope: 'wiki' as const,
        }
      })
    }),
  )

  const notifications: WatchNotification[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') notifications.push(...result.value)
  }

  return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Updates for individually watched articles. Wikis are loaded once each, however
 * many of their articles are watched.
 */
export async function fetchNoteWatchNotifications(
  noteWatchlist: NoteWatchEntry[],
  limitPerNote = 4,
): Promise<WatchNotification[]> {
  if (noteWatchlist.length === 0) return []

  const byWiki = new Map<
    string,
    { handle: string; wikiSlug: string; entries: NoteWatchEntry[] }
  >()
  for (const entry of noteWatchlist) {
    const key = `${entry.handle}/${entry.wikiSlug}`
    const group = byWiki.get(key)
    if (group) group.entries.push(entry)
    else byWiki.set(key, { handle: entry.handle, wikiSlug: entry.wikiSlug, entries: [entry] })
  }

  const results = await Promise.allSettled(
    [...byWiki.values()].map(async (group) => {
      const data = await loadPublicWikiData(group.handle, group.wikiSlug)
      if (!data.wiki) return []

      const noteByUri = new Map(data.notesWithContent.map((note) => [note.uri, note]))
      const sorted = [...data.revisionRecords].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )

      const notifications: WatchNotification[] = []
      for (const entry of group.entries) {
        let taken = 0
        for (const revision of sorted) {
          if (taken >= limitPerNote) break
          const note = noteByUri.get(revision.noteRef)
          if (!note || note.slug !== entry.noteSlug) continue
          const summary = summarizeRevisionChange(revision, note, data.revisionRecords)
          notifications.push({
            id: revision.uri,
            noteTitle: note.title,
            noteSlug: note.slug,
            wikiHandle: entry.handle,
            wikiSlug: entry.wikiSlug,
            wikiName: entry.wikiName,
            createdAt: revision.createdAt,
            action: summary.action,
            detail: summary.detail,
            scope: 'note',
          })
          taken += 1
        }
      }
      return notifications
    }),
  )

  const notifications: WatchNotification[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') notifications.push(...result.value)
  }

  return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Merges wiki- and article-scoped notifications. A revision in a wiki you watch
 * whose article you also watch would otherwise appear twice; the article-scoped
 * copy wins so the more specific subscription is what the reader sees.
 */
export function mergeWatchNotifications(
  ...lists: WatchNotification[][]
): WatchNotification[] {
  const byId = new Map<string, WatchNotification>()
  for (const list of lists) {
    for (const notification of list) {
      const existing = byId.get(notification.id)
      if (!existing || (existing.scope === 'wiki' && notification.scope === 'note')) {
        byId.set(notification.id, notification)
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
