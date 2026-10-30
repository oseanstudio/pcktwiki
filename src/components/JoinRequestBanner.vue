<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { canEdit, canManage, canRead } from '@/lib/lichen/collections'
import {
  cancelOwnMemberRequest,
  findOwnMemberRequest,
  parseInviteWikiUri,
  requestWikiMembership,
} from '@/lib/lichen/member-requests'
import type { LichenMemberRequestRecord } from '@/types/lichen'

const props = defineProps<{
  wikiUri: string
  wikiName: string
}>()

const auth = useAuthStore()
const lichen = useLichenStore()
const route = useRoute()
const router = useRouter()

const busy = ref(false)
const ownRequest = ref<LichenMemberRequestRecord | null>(null)
const message = ref('')
const inviteActive = computed(() => {
  const invite = parseInviteWikiUri(route.query.invite)
  return invite === props.wikiUri || route.query.invite === '1'
})

const showBanner = computed(() => {
  if (!auth.isAuthenticated) return inviteActive.value
  if (canEdit(lichen.access) || canManage(lichen.access)) return false
  if (canRead(lichen.access) && lichen.currentWiki?.visibility === 'public' && !inviteActive.value) {
    return false
  }
  return inviteActive.value || lichen.access === 'none' || lichen.access === 'read'
})

const alreadyMember = computed(() =>
  lichen.memberships.some(
    (m) => m.wikiRef === props.wikiUri && m.memberDid === auth.did,
  ),
)

async function refreshOwnRequest() {
  if (!auth.agent) {
    ownRequest.value = null
    return
  }
  ownRequest.value = await findOwnMemberRequest(auth.agent, props.wikiUri).catch(() => null)
}

onMounted(refreshOwnRequest)
watch(() => [auth.agent, props.wikiUri] as const, refreshOwnRequest)

async function requestJoin() {
  if (!auth.agent) {
    router.push({ name: 'home', query: { redirect: route.fullPath } })
    return
  }
  if (alreadyMember.value) {
    message.value = 'You already have access.'
    return
  }
  busy.value = true
  message.value = ''
  try {
    ownRequest.value = await requestWikiMembership(auth.agent, props.wikiUri)
    message.value = 'Request sent. An admin can approve it from wiki settings.'
    // Clear invite query so banner settles
    if (route.query.invite) {
      const query = { ...route.query }
      delete query.invite
      router.replace({ query })
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : 'Could not send request'
  } finally {
    busy.value = false
  }
}

async function cancelRequest() {
  if (!auth.agent || !ownRequest.value) return
  busy.value = true
  try {
    await cancelOwnMemberRequest(auth.agent, ownRequest.value.uri)
    ownRequest.value = null
    message.value = 'Request cancelled.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="showBanner && !alreadyMember" class="join-banner card">
    <div>
      <h2>Join {{ wikiName }}</h2>
      <p class="muted">
        <template v-if="ownRequest">
          Your join request is pending approval.
        </template>
        <template v-else-if="inviteActive">
          You’ve been invited to collaborate on this wiki.
        </template>
        <template v-else>
          Request access to edit or view private content.
        </template>
      </p>
      <p v-if="message" class="status">{{ message }}</p>
    </div>
    <div class="actions">
      <button
        v-if="!ownRequest"
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="busy"
        @click="requestJoin"
      >
        {{ auth.isAuthenticated ? (busy ? 'Sending…' : 'Request to join') : 'Sign in to request' }}
      </button>
      <button
        v-else
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="busy"
        @click="cancelRequest"
      >
        Cancel request
      </button>
    </div>
  </section>
</template>

<style scoped>
.join-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

h2 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.status {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
}
</style>
