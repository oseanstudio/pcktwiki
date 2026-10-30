import { getPublicAgent, resolveHandleToDid } from '@/lib/atproto/auth'
import { mapWithConcurrency } from '@/lib/concurrency'
import { getActorProfile } from '@/lib/standardsite/blog'

const AVATAR_FETCH_CONCURRENCY = 2

const cache = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, '').toLowerCase()
}

export function getCachedActorAvatar(handle: string): string | null | undefined {
  const key = normalizeHandle(handle)
  if (!cache.has(key)) return undefined
  return cache.get(key) ?? null
}

export async function getActorAvatar(handle: string): Promise<string | null> {
  const key = normalizeHandle(handle)
  const cached = getCachedActorAvatar(handle)
  if (cached !== undefined) return cached

  const pending = inflight.get(key)
  if (pending) return pending

  const promise = (async () => {
    try {
      const did = await resolveHandleToDid(handle)
      const profile = await getActorProfile(getPublicAgent(), did)
      const url = profile.avatar ?? null
      cache.set(key, url)
      return url
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  return promise
}

export async function preloadActorAvatars(handles: string[]): Promise<void> {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const handle of handles) {
    const key = normalizeHandle(handle)
    if (seen.has(key) || cache.has(key)) continue
    seen.add(key)
    deduped.push(handle)
  }

  if (!deduped.length) return

  await mapWithConcurrency(deduped, AVATAR_FETCH_CONCURRENCY, (handle) => getActorAvatar(handle))
}
