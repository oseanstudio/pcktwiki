import { ref, shallowRef, watch, type MaybeRefOrGetter, toValue } from 'vue'
import {
  fetchNetworkReferences,
  type NetworkReference,
} from '@/lib/constellation/references'
import { toUserFacingNetworkError } from '@/lib/http-retry'

/**
 * Constellation lookups are opt-in: nothing is fetched until `reload()` is
 * called. Page loads must not query the network — off-wiki references only
 * appear once an admin has approved them, and the admin review UI is what
 * triggers the lookup.
 */
export function useConstellationReferences(subjects: MaybeRefOrGetter<string[]>) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const references = shallowRef<NetworkReference[]>([])
  const loaded = ref(false)
  let requestId = 0

  async function load(): Promise<void> {
    const uris = toValue(subjects).filter(Boolean)
    const id = ++requestId

    if (!uris.length) {
      references.value = []
      error.value = null
      loaded.value = true
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await fetchNetworkReferences(uris)
      if (id !== requestId) return
      references.value = result
      loaded.value = true
    } catch (err) {
      if (id !== requestId) return
      references.value = []
      error.value = toUserFacingNetworkError(err)
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  // A different subject invalidates what we hold; refetch only if already open.
  watch(
    () => toValue(subjects),
    () => {
      requestId += 1
      references.value = []
      error.value = null
      if (loaded.value) void load()
    },
  )

  return {
    loading,
    error,
    references,
    loaded,
    reload: load,
  }
}
