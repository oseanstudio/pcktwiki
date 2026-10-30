import { computed, onMounted, ref, shallowRef } from 'vue'
import {
  buildPortalWikiSelection,
  getWikiPortalStats,
  loadFeaturedWikis,
  sortWikisByNoteCount,
  type FeaturedWiki,
  type PortalWikiSelection,
} from '@/lib/lichen/featured-wiki-loader'

const wikis = shallowRef<FeaturedWiki[]>([])
const loading = ref(false)
const loaded = ref(false)
let sharedLoad: Promise<FeaturedWiki[]> | null = null

function ensureFeaturedWikis(force = false): Promise<FeaturedWiki[]> {
  if (!force && loaded.value) return Promise.resolve(wikis.value)
  if (!force && sharedLoad) return sharedLoad

  loading.value = true
  sharedLoad = loadFeaturedWikis({ force })
    .then((result) => {
      wikis.value = result
      loaded.value = true
      return result
    })
    .finally(() => {
      loading.value = false
      sharedLoad = null
    })

  return sharedLoad
}

function portalSelectionFromCache(): PortalWikiSelection | null {
  return loaded.value ? buildPortalWikiSelection(wikis.value) : null
}

export function useFeaturedWikis() {
  const portalSelection = ref<PortalWikiSelection | null>(portalSelectionFromCache())

  onMounted(() => {
    void ensureFeaturedWikis().then((list) => {
      portalSelection.value = buildPortalWikiSelection(list)
    })
  })

  const stats = computed(() => getWikiPortalStats(wikis.value))
  const sortedWikis = computed(() => sortWikisByNoteCount(wikis.value))

  return {
    wikis,
    loading,
    loaded,
    portalSelection,
    stats,
    sortedWikis,
    refresh: () => ensureFeaturedWikis(true),
  }
}

export function useFeaturedWikisList() {
  onMounted(() => {
    void ensureFeaturedWikis()
  })

  return {
    wikis,
    loading,
    loaded,
    refresh: () => ensureFeaturedWikis(true),
  }
}
