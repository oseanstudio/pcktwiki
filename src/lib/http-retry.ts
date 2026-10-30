import { ResponseType, XRPCError } from '@atproto/xrpc'

export const NETWORK_BUSY_MESSAGE =
  'The network is busy — too many requests. Wait a moment and try again.'

export const SIGN_IN_RATE_LIMIT_HINT =
  'Signing in loads your wiki through your PDS instead of shared public relays, which can help avoid rate limits.'

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
}

export function isRateLimitStatus(status: number): boolean {
  return status === 429
}

export function isRateLimitError(err: unknown): boolean {
  if (err instanceof XRPCError) {
    return err.status === ResponseType.RateLimitExceeded
  }

  if (err instanceof Error) {
    const status =
      (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode
    if (status === 429) return true
  }

  return false
}

export function toUserFacingNetworkError(err: unknown): string {
  if (isRateLimitError(err)) return NETWORK_BUSY_MESSAGE
  if (err instanceof Error && err.message) return err.message
  return 'Request failed'
}

export function isRateLimitUserMessage(message: string | null | undefined): boolean {
  if (!message) return false
  if (message === NETWORK_BUSY_MESSAGE) return true
  return message.toLowerCase().includes('network is busy')
}

function parseRetryAfterMs(header: string | null | undefined): number | null {
  if (!header) return null

  const seconds = Number(header)
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const date = Date.parse(header)
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now())
  }

  return null
}

export function retryDelayMs(
  attempt: number,
  retryAfterHeader?: string | null,
  options?: RetryOptions,
): number {
  const { baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options }
  const parsed = parseRetryAfterMs(retryAfterHeader)
  if (parsed !== null) {
    return Math.min(parsed, maxDelayMs)
  }

  const exponential = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
  return exponential + Math.random() * 200
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<Response> {
  const { maxAttempts } = { ...DEFAULT_OPTIONS, ...options }
  let lastResponse: Response | undefined

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(input, init)

    if (!isRateLimitStatus(response.status) || attempt >= maxAttempts - 1) {
      return response
    }

    lastResponse = response
    await sleep(retryDelayMs(attempt, response.headers.get('Retry-After'), options))
  }

  return lastResponse!
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions & { isRetryable?: (err: unknown) => boolean },
): Promise<T> {
  const { maxAttempts } = { ...DEFAULT_OPTIONS, ...options }
  const isRetryable = options?.isRetryable ?? isRateLimitError
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isRetryable(err) || attempt >= maxAttempts - 1) {
        throw err
      }

      const headers = err instanceof XRPCError ? err.headers : undefined
      const retryAfter = headers?.['retry-after'] ?? headers?.['Retry-After'] ?? null
      await sleep(retryDelayMs(attempt, retryAfter, options))
    }
  }

  throw lastError
}

export function createRetryFetch(options?: RetryOptions): typeof fetch {
  return (input, init) => fetchWithRetry(input, init, options)
}

export function guestFeedNetworkWarning(options: {
  failedWikiCount: number
  totalWikiCount: number
  sawRateLimit: boolean
  hasItems: boolean
  constellationDegraded: boolean
}): { message: string | null; rateLimited: boolean } {
  const {
    failedWikiCount,
    totalWikiCount,
    sawRateLimit,
    hasItems,
    constellationDegraded,
  } = options

  if (failedWikiCount === 0 && !constellationDegraded) {
    return { message: null, rateLimited: false }
  }

  if (sawRateLimit) {
    if (failedWikiCount === totalWikiCount && !hasItems) {
      return { message: NETWORK_BUSY_MESSAGE, rateLimited: true }
    }
    return {
      message: 'Some wikis could not be loaded — the network is busy. Showing partial results.',
      rateLimited: true,
    }
  }

  if (constellationDegraded) {
    return {
      message: 'Cross-wiki links are temporarily unavailable — the network is busy.',
      rateLimited: true,
    }
  }

  if (failedWikiCount > 0 && !hasItems) {
    return { message: 'Could not load recent updates right now.', rateLimited: false }
  }

  if (failedWikiCount > 0) {
    return {
      message: 'Some wikis could not be loaded. Showing partial results.',
      rateLimited: false,
    }
  }

  return { message: null, rateLimited: false }
}
