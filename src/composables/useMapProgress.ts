import { onUnmounted, ref, shallowRef, watch, type Ref } from 'vue'
import type { Agent } from '@atproto/api'
import {
  getDiscovered,
  markDiscovered,
  resetMapProgressEverywhere,
  subscribeMapProgress,
  syncMapProgress,
} from '@/lib/lichen/map-progress'

export interface UseMapProgressOptions {
  /** AT-URI of the wiki, or null while it is still loading. */
  wikiUri: Ref<string | null>
  /** The reader's agent, or null when signed out. Signed-out progress stays local. */
  agent: Ref<Agent | null>
}

/**
 * Reactive view of the reader's map discoveries for one wiki, kept in step with
 * localStorage and — when signed in — with their PDS.
 */
export function useMapProgress({ wikiUri, agent }: UseMapProgressOptions) {
  const discovered = shallowRef<Set<string>>(new Set())
  const syncing = ref(false)
  const syncError = ref<string | null>(null)
  /** Places pulled in from another device on the last sync. */
  const pulledCount = ref(0)

  function refresh() {
    discovered.value = wikiUri.value ? getDiscovered(wikiUri.value) : new Set()
  }

  const stop = subscribeMapProgress(refresh)
  onUnmounted(stop)

  /** Records a visit here, then mirrors it up in the background. */
  function discover(slug: string) {
    const uri = wikiUri.value
    if (!uri) return
    if (!markDiscovered(uri, slug)) return
    refresh()
    void pushToPds(uri)
  }

  async function pushToPds(uri: string) {
    const currentAgent = agent.value
    if (!currentAgent) return
    try {
      await syncMapProgress(currentAgent, uri)
      refresh()
    } catch {
      // A failed mirror leaves the local record intact; the next sync retries.
    }
  }

  async function sync() {
    const uri = wikiUri.value
    const currentAgent = agent.value
    if (!uri || !currentAgent) return
    syncing.value = true
    syncError.value = null
    try {
      const result = await syncMapProgress(currentAgent, uri)
      pulledCount.value = result.pulled
      refresh()
    } catch {
      syncError.value = "Couldn't sync your progress right now."
    } finally {
      syncing.value = false
    }
  }

  async function reset() {
    const uri = wikiUri.value
    if (!uri) return
    try {
      await resetMapProgressEverywhere(agent.value, uri)
    } catch {
      syncError.value = "Cleared here, but couldn't clear the copy on your account."
    }
    refresh()
  }

  // Reconcile whenever the wiki resolves or the reader signs in.
  watch(
    [wikiUri, agent],
    () => {
      refresh()
      void sync()
    },
    { immediate: true },
  )

  return { discovered, syncing, syncError, pulledCount, discover, sync, reset }
}
