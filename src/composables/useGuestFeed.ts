import { computed, ref, shallowRef } from 'vue'
import { preloadActorAvatars } from '@/lib/atproto/actor-avatars'
import { BROWSE_CACHE_TTL_MS } from '@/lib/cache-constants'
import { loadStaticGuestFeedSnapshot } from '@/lib/lichen/guest-feed-static'
import {
  buildGuestFeedSnapshot,
  fetchGuestFeedCore,
  fetchGuestFeedNetworkEdges,
  filterFeedByTopic,
  mergeGuestFeedEdges,
  type GuestFeedItem,
  type GuestFeedSnapshot,
  type WikiGraphEdge,
  wikisForTopic,
  edgesForTopic,
  type GuestFeedWikiDisplay,
} from '@/lib/lichen/guest-feed'
import { isRateLimitError, isRateLimitUserMessage, toUserFacingNetworkError } from '@/lib/http-retry'

let cachedSnapshot: GuestFeedSnapshot | null = null
let cachedAt = 0
let inflight: Promise<GuestFeedSnapshot> | null = null
let networkEdgesLoaded = false
let networkEdgesInflight: Promise<void> | null = null

function warmGuestFeedAvatars(snapshot: GuestFeedSnapshot): void {
  const handles = [
    ...snapshot.wikis.map((wiki) => wiki.handle),
    ...snapshot.items.map((item) => item.wiki.handle),
  ]
  void preloadActorAvatars(handles)
}

async function refreshGuestFeedFromNetwork(force = false): Promise<GuestFeedSnapshot> {
  const core = await fetchGuestFeedCore({ force })
  networkEdgesLoaded = false
  const snapshot = buildGuestFeedSnapshot(core, [], false)
  warmGuestFeedAvatars(snapshot)
  cachedSnapshot = snapshot
  cachedAt = Date.now()
  return snapshot
}

export function useGuestFeed() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const snapshot = shallowRef<GuestFeedSnapshot | null>(cachedSnapshot)
  const activeTopic = ref<string | null>(null)
  const networkEdgesLoading = ref(false)
  const networkWarning = computed(() => snapshot.value?.networkWarning ?? null)
  const rateLimited = computed(
    () => snapshot.value?.rateLimited === true || isRateLimitUserMessage(error.value),
  )

  async function load(force = false): Promise<void> {
    if (!force && cachedSnapshot && Date.now() - cachedAt < BROWSE_CACHE_TTL_MS) {
      snapshot.value = cachedSnapshot
      return
    }

    if (inflight && !force) {
      await inflight
      snapshot.value = cachedSnapshot
      return
    }

    loading.value = true
    error.value = null

    if (!force && !cachedSnapshot) {
      const staticSnapshot = await loadStaticGuestFeedSnapshot()
      if (staticSnapshot) {
        cachedSnapshot = staticSnapshot
        cachedAt = Date.parse(staticSnapshot.fetchedAt)
        snapshot.value = staticSnapshot
        warmGuestFeedAvatars(staticSnapshot)
        networkEdgesLoaded = staticSnapshot.edges.some((edge) => edge.source === 'network')
        loading.value = false
        void refreshGuestFeedFromNetwork(false)
          .then((fresh) => {
            snapshot.value = fresh
          })
          .catch(() => {
            // Keep serving the static snapshot when background refresh fails.
          })
        return
      }
    }

    inflight = refreshGuestFeedFromNetwork(force)
      .then((result) => {
        snapshot.value = result
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

    await inflight
  }

  async function loadNetworkEdges(): Promise<void> {
    if (networkEdgesLoaded || networkEdgesInflight || !cachedSnapshot) {
      await networkEdgesInflight
      return
    }

    networkEdgesLoading.value = true
    networkEdgesInflight = (async () => {
      try {
        const network = await fetchGuestFeedNetworkEdges(cachedSnapshot!.wikis)
        const curated = cachedSnapshot!.edges.filter((edge) => edge.source === 'curated')
        const wikilink = cachedSnapshot!.edges.filter((edge) => edge.source === 'wikilink')
        const merged = mergeGuestFeedEdges(curated, wikilink, network)

        cachedSnapshot = {
          ...cachedSnapshot!,
          edges: merged,
        }
        snapshot.value = cachedSnapshot
        networkEdgesLoaded = true
      } catch (err) {
        if (isRateLimitError(err) && cachedSnapshot) {
          cachedSnapshot = {
            ...cachedSnapshot,
            rateLimited: true,
            networkWarning:
              cachedSnapshot.networkWarning ??
              'Cross-wiki links are temporarily unavailable — the network is busy.',
          }
          snapshot.value = cachedSnapshot
        }
      } finally {
        networkEdgesLoading.value = false
        networkEdgesInflight = null
      }
    })()

    await networkEdgesInflight
  }

  function setTopic(topicId: string | null): void {
    activeTopic.value = topicId
  }

  function filteredItems(): GuestFeedItem[] {
    if (!snapshot.value) return []
    return filterFeedByTopic(snapshot.value.items, activeTopic.value)
  }

  function filteredWikis(): GuestFeedWikiDisplay[] {
    if (!snapshot.value) return []
    return wikisForTopic(snapshot.value.wikis, activeTopic.value)
  }

  function filteredEdges(): WikiGraphEdge[] {
    if (!snapshot.value) return []
    return edgesForTopic(snapshot.value.edges, activeTopic.value)
  }

  return {
    loading,
    error,
    networkWarning,
    rateLimited,
    networkEdgesLoading,
    snapshot,
    activeTopic,
    load,
    loadNetworkEdges,
    setTopic,
    filteredItems,
    filteredWikis,
    filteredEdges,
  }
}
