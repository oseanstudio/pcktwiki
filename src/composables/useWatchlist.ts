import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import {
  getDiscussionWatchlist,
  getNoteWatchlist,
  getUnseenWatchlistCount,
  getWatchlist,
  isDiscussionUnseen,
  isNoteUnseen,
  isWikiUnseen,
  markAllWatchlistSeen,
  markDiscussionSeen,
  markNoteSeen,
  markWikiSeen,
  subscribeWatchlist,
  type DiscussionWatchEntry,
  type NoteWatchEntry,
  type WatchEntry,
} from '@/lib/watchlist'
import { prefetchWatchedWikis } from '@/lib/offline/prefetch'

export function useWatchlist() {
  const wikis = shallowRef<WatchEntry[]>(getWatchlist())
  const discussions = shallowRef<DiscussionWatchEntry[]>(getDiscussionWatchlist())
  const notes = shallowRef<NoteWatchEntry[]>(getNoteWatchlist())
  const unseenVersion = ref(0)

  const totalCount = computed(
    () => wikis.value.length + discussions.value.length + notes.value.length,
  )
  const unreadCount = computed(() => {
    unseenVersion.value
    return getUnseenWatchlistCount(wikis.value, discussions.value, notes.value)
  })
  const hasWikis = computed(() => wikis.value.length > 0)
  const hasDiscussions = computed(() => discussions.value.length > 0)
  const hasNotes = computed(() => notes.value.length > 0)
  const hasAny = computed(() => totalCount.value > 0)

  function sync() {
    wikis.value = getWatchlist()
    discussions.value = getDiscussionWatchlist()
    notes.value = getNoteWatchlist()
    unseenVersion.value++
  }

  function markWikiRead(wikiUri: string) {
    markWikiSeen(wikiUri)
    unseenVersion.value++
  }

  function markDiscussionRead(wikiUri: string, noteSlug: string) {
    markDiscussionSeen(wikiUri, noteSlug)
    unseenVersion.value++
  }

  function markNoteRead(wikiUri: string, noteSlug: string) {
    markNoteSeen(wikiUri, noteSlug)
    unseenVersion.value++
  }

  function markAllRead() {
    markAllWatchlistSeen(wikis.value, discussions.value, notes.value)
    unseenVersion.value++
  }

  function isWikiUnread(wikiUri: string): boolean {
    unseenVersion.value
    return isWikiUnseen(wikiUri)
  }

  function isDiscussionUnread(wikiUri: string, noteSlug: string): boolean {
    unseenVersion.value
    return isDiscussionUnseen(wikiUri, noteSlug)
  }

  function isNoteUnread(wikiUri: string, noteSlug: string): boolean {
    unseenVersion.value
    return isNoteUnseen(wikiUri, noteSlug)
  }

  let unsub: (() => void) | undefined

  onMounted(() => {
    unsub = subscribeWatchlist(sync)
    sync()
    void prefetchWatchedWikis()
  })

  onUnmounted(() => {
    unsub?.()
  })

  return {
    wikis,
    discussions,
    notes,
    totalCount,
    unreadCount,
    hasWikis,
    hasDiscussions,
    hasNotes,
    hasAny,
    sync,
    markWikiRead,
    markDiscussionRead,
    markNoteRead,
    markAllRead,
    isWikiUnread,
    isDiscussionUnread,
    isNoteUnread,
  }
}
