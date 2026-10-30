import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchNoteWatchNotifications,
  fetchWatchNotifications,
  mergeWatchNotifications,
  getReadNotificationIds,
  markAllNotificationsRead,
  markNotificationRead,
  notificationPath,
  subscribeNotificationReads,
  type WatchNotification,
} from '@/lib/notifications'
import { getNoteWatchlist, getWatchlist, subscribeWatchlist } from '@/lib/watchlist'

export function useWatchNotifications() {
  const router = useRouter()
  const watchlist = shallowRef(getWatchlist())
  const noteWatchlist = shallowRef(getNoteWatchlist())
  const notifications = ref<WatchNotification[]>([])
  const readIds = ref(getReadNotificationIds())
  const loading = ref(false)

  const unreadCount = computed(
    () => notifications.value.filter((item) => !readIds.value.has(item.id)).length,
  )

  const hasWatchlist = computed(
    () => watchlist.value.length > 0 || noteWatchlist.value.length > 0,
  )
  const hasNotifications = computed(() => notifications.value.length > 0)

  function syncWatchlist() {
    watchlist.value = getWatchlist()
    noteWatchlist.value = getNoteWatchlist()
  }

  function syncReadIds() {
    readIds.value = getReadNotificationIds()
  }

  async function loadNotifications() {
    syncWatchlist()
    if (watchlist.value.length === 0 && noteWatchlist.value.length === 0) {
      notifications.value = []
      return
    }

    loading.value = true
    try {
      const [wikiItems, noteItems] = await Promise.all([
        fetchWatchNotifications(watchlist.value),
        fetchNoteWatchNotifications(noteWatchlist.value),
      ])
      notifications.value = mergeWatchNotifications(wikiItems, noteItems)
    } finally {
      loading.value = false
    }
  }

  function markRead(id: string) {
    markNotificationRead(id)
    syncReadIds()
  }

  function markAllRead() {
    const unreadIds = notifications.value
      .filter((item) => !readIds.value.has(item.id))
      .map((item) => item.id)
    markAllNotificationsRead(unreadIds)
    syncReadIds()
  }

  async function openNotification(notification: WatchNotification) {
    markRead(notification.id)
    const path = notificationPath(notification)
    if (router.currentRoute.value.path !== path) {
      await router.push(path)
    }
  }

  let unsubWatchlist: (() => void) | undefined
  let unsubReads: (() => void) | undefined

  onMounted(() => {
    unsubWatchlist = subscribeWatchlist(() => {
      syncWatchlist()
      void loadNotifications()
    })
    unsubReads = subscribeNotificationReads(syncReadIds)
    void loadNotifications()
  })

  onUnmounted(() => {
    unsubWatchlist?.()
    unsubReads?.()
  })

  return {
    watchlist,
    noteWatchlist,
    notifications,
    readIds,
    loading,
    unreadCount,
    hasWatchlist,
    hasNotifications,
    loadNotifications,
    markRead,
    markAllRead,
    openNotification,
    isRead: (id: string) => readIds.value.has(id),
  }
}
