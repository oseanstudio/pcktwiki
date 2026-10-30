import { computed, ref, shallowRef } from 'vue'
import { BROWSE_CACHE_TTL_MS } from '@/lib/cache-constants'
import {
  indexArticlesFor,
  loadGlobalSearchIndex,
  searchGlobalIndex,
  selectArticleTargets,
  type GlobalSearchIndex,
  type GlobalSearchResult,
} from '@/lib/lichen/global-search'
import { toUserFacingNetworkError } from '@/lib/http-retry'

const CACHE_TTL_MS = BROWSE_CACHE_TTL_MS

let cachedAt = 0
let inflight: Promise<GlobalSearchIndex> | null = null
const query = ref('')

/**
 * Article indexing runs in rounds against whatever query is current. Tracking
 * the query a round was started for lets a new keystroke abandon the old sweep
 * instead of finishing work nobody is waiting for.
 */
let articleSweepQuery: string | null = null

/**
 * Shared with the index itself: the header bar and the search page are separate
 * component instances driving one sweep, so a per-instance flag would leave
 * whichever did not start it reporting the wrong state.
 */
const indexingArticles = ref(false)
const loading = ref(false)
const indexReady = ref(false)
const error = ref<string | null>(null)
const index = shallowRef<GlobalSearchIndex | null>(null)

function cachedIndexValue(): GlobalSearchIndex | null {
  return index.value
}

export function useGlobalWikiSearch() {
  function publish(next: GlobalSearchIndex): void {
    index.value = next
  }

  async function ensureIndex(force = false): Promise<GlobalSearchIndex | null> {
    const cached = cachedIndexValue()

    if (!force && cached && Date.now() - cachedAt < CACHE_TTL_MS) {
      indexReady.value = true
      void sweepArticles()
      return cached
    }

    if (inflight && !force) {
      await inflight
      indexReady.value = !!cachedIndexValue()
      void sweepArticles()
      return cachedIndexValue()
    }

    loading.value = true
    error.value = null

    inflight = loadGlobalSearchIndex()
      .then((result) => {
        cachedAt = Date.now()
        publish(result)
        indexReady.value = true
        return result
      })
      .catch((err) => {
        error.value = toUserFacingNetworkError(err)
        throw err
      })
      .finally(() => {
        loading.value = false
        inflight = null
      })

    try {
      const result = await inflight
      void sweepArticles()
      return result
    } catch {
      return null
    }
  }

  /**
   * Walks the directory a budget at a time, most promising wikis first,
   * republishing the index after each round so matches appear as they are
   * found rather than after the whole network has been read.
   */
  async function sweepArticles(): Promise<void> {
    const current = query.value.trim()
    if (current.length < 2 || !cachedIndexValue()) return
    if (articleSweepQuery === current) return

    articleSweepQuery = current
    indexingArticles.value = true

    try {
      for (;;) {
        const snapshot = cachedIndexValue()
        if (articleSweepQuery !== current || !snapshot) return

        const targets = selectArticleTargets(snapshot, current)
        if (!targets.length) return

        const next = await indexArticlesFor(snapshot, targets)
        if (articleSweepQuery !== current) return

        publish(next)
      }
    } catch {
      // A failed round leaves the wikis it covered unindexed; the next query
      // retries them. Wiki-level results are unaffected.
    } finally {
      if (articleSweepQuery === current) {
        articleSweepQuery = null
        indexingArticles.value = false
      }
    }
  }

  const results = computed((): GlobalSearchResult[] => {
    const q = query.value.trim()
    if (q.length < 2 || !index.value) return []
    return searchGlobalIndex(index.value, q, 8)
  })

  const hasQuery = computed(() => query.value.trim().length >= 2)

  /** True once every wiki in the directory has had its articles read. */
  const articlesComplete = computed(() => {
    const value = index.value
    if (!value) return false
    return value.indexedWikis.size >= value.wikis.length
  })

  return {
    query,
    loading,
    indexReady,
    indexingArticles,
    articlesComplete,
    index,
    error,
    results,
    hasQuery,
    ensureIndex,
  }
}
