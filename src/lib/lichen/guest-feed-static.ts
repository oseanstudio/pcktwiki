import { assetUrl } from '@/lib/base-url'
import { STATIC_GUEST_FEED_MAX_AGE_MS } from '@/lib/cache-constants'
import type { GuestFeedSnapshot } from '@/lib/lichen/guest-feed'

const SNAPSHOT_URL = assetUrl('guest-feed-snapshot.json')

export async function loadStaticGuestFeedSnapshot(): Promise<GuestFeedSnapshot | null> {
  try {
    const response = await fetch(SNAPSHOT_URL, { cache: 'no-cache' })
    if (!response.ok) return null

    const snapshot = (await response.json()) as GuestFeedSnapshot
    if (!snapshot?.fetchedAt || !Array.isArray(snapshot.items) || !Array.isArray(snapshot.wikis)) {
      return null
    }

    const age = Date.now() - Date.parse(snapshot.fetchedAt)
    if (Number.isNaN(age) || age > STATIC_GUEST_FEED_MAX_AGE_MS) {
      return null
    }

    return {
      ...snapshot,
      networkWarning: snapshot.networkWarning ?? null,
      rateLimited: snapshot.rateLimited ?? false,
    }
  } catch {
    return null
  }
}
