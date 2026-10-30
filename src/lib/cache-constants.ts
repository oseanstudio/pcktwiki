/** In-memory browse caches (guest feed, global search, wiki data). */
export const BROWSE_CACHE_TTL_MS = 30 * 60 * 1000

/** Build-time / static guest feed snapshot served from /guest-feed-snapshot.json. */
export const STATIC_GUEST_FEED_MAX_AGE_MS = 60 * 60 * 1000

/** Handle → DID resolution (session + memory). */
export const HANDLE_CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Network-wide directory of public wikis, persisted in localStorage. */
export const WIKI_DIRECTORY_TTL_MS = 6 * 60 * 60 * 1000

/** Max parallel upstream requests when loading multiple wikis. */
export const WIKI_FETCH_CONCURRENCY = 3

/**
 * Directory crawling hits a different repo per request rather than hammering
 * one host, so it can run wider than per-wiki content loading.
 */
export const WIKI_DIRECTORY_CONCURRENCY = 6

/**
 * Wikis whose articles get pulled into the search index for a single query.
 * Article indexing costs two paginated repo reads per wiki, so the budget is
 * spent on the wikis most likely to match rather than the whole network.
 */
export const GLOBAL_SEARCH_ARTICLE_BUDGET = 12

/** Max parallel Constellation backlink requests. */
export const CONSTELLATION_FETCH_CONCURRENCY = 2
