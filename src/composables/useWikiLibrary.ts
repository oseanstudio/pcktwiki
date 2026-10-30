import { computed, onMounted, ref, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { getForks } from '@/lib/lichen/fork'
import { computeForkChanges } from '@/lib/lichen/fork-sync'
import { getWatchlist, getDiscussionWatchlist } from '@/lib/watchlist'
import { listCached } from '@/lib/lichen/wiki-cache'
import { listDraftWikis, subscribeDraftWikis, type DraftWiki } from '@/lib/offline/draft-wiki'
import { loadPublicWikiData } from '@/lib/lichen/load-public-wiki'
import type { StoredWikiEntry } from '@/lib/offline/wiki-store'

export type LibraryItemType = 'owned' | 'fork' | 'watched' | 'cached' | 'draft' | 'member'

export interface LibraryItem {
  id: string
  type: LibraryItemType
  name: string
  handle?: string
  wikiSlug?: string
  path: string
  badge?: string
  pinned?: boolean
  pendingForkChanges?: number
}

export function useWikiLibrary() {
  const auth = useAuthStore()
  const lichen = useLichenStore()
  const loading = ref(false)
  const drafts = shallowRef<DraftWiki[]>([])
  const cached = shallowRef<StoredWikiEntry[]>([])
  const forkPending = ref<Record<string, number>>({})

  async function refresh() {
    loading.value = true
    try {
      drafts.value = await listDraftWikis()
      cached.value = await listCached()
      if (auth.agent) {
        await lichen.loadOwnerWikis(auth.agent)
      }
      await refreshForkCounts()
    } finally {
      loading.value = false
    }
  }

  async function refreshForkCounts() {
    const counts: Record<string, number> = {}
    for (const fork of getForks()) {
      try {
        const source = await loadPublicWikiData(fork.sourceHandle, fork.sourceSlug)
        const forkNotes = cached.value.find(
          (c) => c.handle === fork.forkHandle && c.slug === fork.forkSlug,
        )?.notesWithContent ?? []
        counts[fork.forkWikiUri] = computeForkChanges(fork, source.notesWithContent, forkNotes).length
      } catch {
        counts[fork.forkWikiUri] = 0
      }
    }
    forkPending.value = counts
  }

  const items = computed<LibraryItem[]>(() => {
    const result: LibraryItem[] = []

    for (const wiki of lichen.activeWikis) {
      result.push({
        id: wiki.uri,
        type: 'owned',
        name: wiki.name,
        handle: auth.handle ?? undefined,
        wikiSlug: wiki.slug,
        path: auth.handle ? `/@${auth.handle}/${wiki.slug}` : `/dashboard`,
      })
    }

    for (const fork of getForks()) {
      result.push({
        id: fork.forkWikiUri,
        type: 'fork',
        name: `Fork of ${fork.sourceSlug}`,
        handle: fork.forkHandle,
        wikiSlug: fork.forkSlug,
        path: `/@${fork.forkHandle}/${fork.forkSlug}`,
        badge: 'Fork',
        pendingForkChanges: forkPending.value[fork.forkWikiUri] ?? 0,
      })
    }

    for (const entry of getWatchlist()) {
      if (result.some((i) => i.id === entry.wikiUri)) continue
      result.push({
        id: entry.wikiUri,
        type: 'watched',
        name: entry.wikiName,
        handle: entry.handle,
        wikiSlug: entry.wikiSlug,
        path: `/@${entry.handle}/${entry.wikiSlug}`,
        badge: 'Watching',
      })
    }

    for (const entry of getDiscussionWatchlist()) {
      result.push({
        id: `${entry.wikiUri}:${entry.noteSlug}`,
        type: 'watched',
        name: entry.noteTitle,
        handle: entry.handle,
        wikiSlug: entry.wikiSlug,
        path: `/@${entry.handle}/${entry.wikiSlug}/${entry.noteSlug}`,
        badge: 'Discussion',
      })
    }

    for (const entry of cached.value) {
      if (!entry.wiki) continue
      if (result.some((i) => i.handle === entry.handle && i.wikiSlug === entry.slug)) continue
      result.push({
        id: `cached:${entry.handle}:${entry.slug}`,
        type: 'cached',
        name: entry.wiki.name,
        handle: entry.handle,
        wikiSlug: entry.slug,
        path: `/@${entry.handle}/${entry.slug}`,
        badge: 'Cached',
        pinned: entry.pinned,
      })
    }

    for (const draft of drafts.value) {
      result.push({
        id: draft.id,
        type: 'draft',
        name: draft.name,
        wikiSlug: draft.slug,
        path: `/draft/${draft.id}/home`,
        badge: 'Local draft',
      })
    }

    return result
  })

  onMounted(() => {
    void refresh()
  })

  function subscribe(onChange: () => void) {
    return subscribeDraftWikis(onChange)
  }

  return { items, loading, refresh, cached, drafts, subscribe }
}
