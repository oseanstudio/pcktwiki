import { fetchWithRetry, toUserFacingNetworkError } from '@/lib/http-retry'

export const CONSTELLATION_BASE_URL = 'https://constellation.microcosm.blue'
export const CONSTELLATION_USER_AGENT = 'pckt.wiki (https://pckt.wiki)'

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.value
}

function setCached<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

export interface ConstellationLinkingRecord {
  did: string
  collection: string
  rkey: string
}

export interface ConstellationBacklinksResponse {
  total: number
  linking_records: ConstellationLinkingRecord[]
  cursor: string | null
}

export interface ConstellationLinkSourceStats {
  records: number
  distinct_dids: number
}

export interface ConstellationLinksAllResponse {
  links: Record<string, Record<string, ConstellationLinkSourceStats>>
}

async function constellationFetch<T>(path: string): Promise<T> {
  const response = await fetchWithRetry(`${CONSTELLATION_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': CONSTELLATION_USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? toUserFacingNetworkError({ status: 429 })
        : `Constellation request failed (${response.status})`,
    )
  }

  return response.json() as Promise<T>
}

export async function fetchLinksAll(target: string): Promise<ConstellationLinksAllResponse> {
  const cacheKey = `links-all:${target}`
  const cached = getCached<ConstellationLinksAllResponse>(cacheKey)
  if (cached) return cached

  const query = new URLSearchParams({ target })
  const result = await constellationFetch<ConstellationLinksAllResponse>(`/links/all?${query}`)
  setCached(cacheKey, result)
  return result
}

export async function fetchBacklinks(options: {
  target: string
  collection: string
  path: string
  limit?: number
  cursor?: string
}): Promise<ConstellationBacklinksResponse> {
  const query = new URLSearchParams({
    target: options.target,
    collection: options.collection,
    path: options.path,
    limit: String(options.limit ?? 16),
  })
  if (options.cursor) query.set('cursor', options.cursor)

  const cacheKey = `links:${query}`
  const cached = getCached<ConstellationBacklinksResponse>(cacheKey)
  if (cached) return cached

  const result = await constellationFetch<ConstellationBacklinksResponse>(`/links?${query}`)
  setCached(cacheKey, result)
  return result
}

export function buildAtUri(did: string, collection: string, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`
}
