import { onMounted, onUnmounted, ref } from 'vue'
import {
  isWikiWatchedByScope,
  subscribeWatchlist,
  toggleWikiWatchScope,
} from '@/lib/watchlist'
import { useLikeBurst } from '@/composables/useDoubleActivation'

export function useWikiLike(handle: string, wikiSlug: string, wikiName: string) {
  const liked = ref(isWikiWatchedByScope(handle, wikiSlug))
  const toggling = ref(false)
  const { burstVisible, triggerBurst } = useLikeBurst()

  function syncLiked() {
    liked.value = isWikiWatchedByScope(handle, wikiSlug)
  }

  async function toggleLike(): Promise<void> {
    if (toggling.value) return
    toggling.value = true
    try {
      const nowLiked = await toggleWikiWatchScope({ handle, wikiSlug, wikiName })
      liked.value = nowLiked
      if (nowLiked) triggerBurst()
    } finally {
      toggling.value = false
    }
  }

  let unsubWatchlist: (() => void) | undefined

  onMounted(() => {
    syncLiked()
    unsubWatchlist = subscribeWatchlist(syncLiked)
  })

  onUnmounted(() => {
    unsubWatchlist?.()
  })

  return { liked, toggling, burstVisible, toggleLike, syncLiked }
}
