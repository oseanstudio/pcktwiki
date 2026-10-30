import { computed, ref } from 'vue'
import type { Agent } from '@atproto/api'
import { listIncomingMemberRequests } from '@/lib/lichen/member-requests'
import type { LichenMemberRequestRecord, LichenWikiRecord } from '@/types/lichen'

const pendingByWiki = ref<Record<string, LichenMemberRequestRecord[]>>({})
const loading = ref(false)

export function useMemberRequestNotifications() {
  const totalPending = computed(() =>
    Object.values(pendingByWiki.value).reduce((sum, list) => sum + list.length, 0),
  )

  async function loadForWikis(agent: Agent, wikis: LichenWikiRecord[]) {
    if (!wikis.length) {
      pendingByWiki.value = {}
      return
    }
    loading.value = true
    try {
      const entries = await Promise.all(
        wikis.map(async (wiki) => {
          const requests = await listIncomingMemberRequests(agent, wiki.uri).catch(() => [])
          return [wiki.uri, requests] as const
        }),
      )
      pendingByWiki.value = Object.fromEntries(entries)
    } finally {
      loading.value = false
    }
  }

  function requestsFor(wikiUri: string): LichenMemberRequestRecord[] {
    return pendingByWiki.value[wikiUri] ?? []
  }

  return {
    loading,
    totalPending,
    pendingByWiki,
    loadForWikis,
    requestsFor,
  }
}
