import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { Agent } from '@atproto/api'
import {
  initializeAuth,
  signIn as oauthSignIn,
  signOut as oauthSignOut,
} from '@/lib/atproto/auth'
import { useLichenStore } from '@/stores/lichen'

export const useAuthStore = defineStore('auth', () => {
  const agent = shallowRef<Agent | null>(null)
  const did = ref<string | null>(null)
  const handle = ref<string | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!agent.value && !!did.value)

  async function initialize(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await initializeAuth()
      if (!result) {
        agent.value = null
        did.value = null
        handle.value = null
        return
      }

      agent.value = result.agent
      did.value = result.did
      handle.value = result.handle

      const { migrateWatchlistToBookmarks } = await import('@/lib/lichen/bookmark-sync')
      void migrateWatchlistToBookmarks(result.agent).catch(() => {})

      const { listUnpublishedDrafts, publishAllDrafts } = await import('@/lib/offline/publish-draft')
      const drafts = await listUnpublishedDrafts()
      if (drafts.length > 0 && typeof window !== 'undefined') {
        const publish = window.confirm(
          `Publish ${drafts.length} local draft wiki${drafts.length === 1 ? '' : 's'} to your PDS?`,
        )
        if (publish) {
          await publishAllDrafts(result.agent)
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to restore session'
    } finally {
      loading.value = false
    }
  }

  async function signIn(inputHandle: string): Promise<void> {
    error.value = null
    const trimmed = inputHandle.trim()
    if (!trimmed) {
      error.value = 'Please enter your handle'
      return
    }
    try {
      await oauthSignIn(trimmed.startsWith('@') ? trimmed.slice(1) : trimmed)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign in failed'
      throw err
    }
  }

  async function signOut(): Promise<void> {
    await oauthSignOut()
    agent.value = null
    did.value = null
    handle.value = null
    useLichenStore().reset()
  }

  return {
    agent,
    did,
    handle,
    loading,
    error,
    isAuthenticated,
    initialize,
    signIn,
    signOut,
  }
})
