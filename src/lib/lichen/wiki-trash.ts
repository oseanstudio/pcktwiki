import type { LichenWikiRecord } from '@/types/lichen'

/** How long a soft-deleted wiki can be restored before permanent purge. */
export const WIKI_TRASH_RETENTION_DAYS = 30
export const WIKI_TRASH_RETENTION_MS = WIKI_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000

export function isWikiTrashed(wiki: Pick<LichenWikiRecord, 'deletedAt'>): boolean {
  return Boolean(wiki.deletedAt)
}

export function wikiTrashExpiresAt(
  wiki: Pick<LichenWikiRecord, 'deletedAt'>,
): Date | null {
  if (!wiki.deletedAt) return null
  const deletedAt = Date.parse(wiki.deletedAt)
  if (Number.isNaN(deletedAt)) return null
  return new Date(deletedAt + WIKI_TRASH_RETENTION_MS)
}

export function isWikiTrashExpired(
  wiki: Pick<LichenWikiRecord, 'deletedAt'>,
  now = Date.now(),
): boolean {
  const expires = wikiTrashExpiresAt(wiki)
  if (!expires) return false
  return expires.getTime() <= now
}

/** Whole days remaining before permanent purge (0 if expired or not trashed). */
export function wikiTrashDaysLeft(
  wiki: Pick<LichenWikiRecord, 'deletedAt'>,
  now = Date.now(),
): number {
  const expires = wikiTrashExpiresAt(wiki)
  if (!expires) return 0
  return Math.max(0, Math.ceil((expires.getTime() - now) / (24 * 60 * 60 * 1000)))
}

export function formatWikiTrashCountdown(
  wiki: Pick<LichenWikiRecord, 'deletedAt'>,
  now = Date.now(),
): string {
  const days = wikiTrashDaysLeft(wiki, now)
  if (days <= 0) return 'Expires soon'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
