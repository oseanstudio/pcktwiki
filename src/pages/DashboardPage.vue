<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { visibilityLabel } from '@/lib/lichen/collections'
import {
  WIKI_TRASH_RETENTION_DAYS,
  formatWikiTrashCountdown,
} from '@/lib/lichen/wiki-trash'
import type { LichenWikiRecord } from '@/types/lichen'

const auth = useAuthStore()
const lichen = useLichenStore()
const initializing = ref(true)
const trashBusyUri = ref<string | null>(null)
const trashError = ref('')

const activeWikis = computed(() => lichen.activeWikis)
const trashedWikis = computed(() => lichen.trashedWikis)

onMounted(async () => {
  if (!auth.agent) return
  try {
    await lichen.loadOwnerWikis(auth.agent)
    await lichen.purgeExpiredTrashedWikis(auth.agent)
  } finally {
    initializing.value = false
  }
})

async function restore(wiki: LichenWikiRecord) {
  if (!auth.agent || trashBusyUri.value) return
  trashBusyUri.value = wiki.uri
  trashError.value = ''
  try {
    await lichen.restoreWiki(auth.agent, wiki)
  } catch (err) {
    trashError.value = err instanceof Error ? err.message : 'Could not restore wiki'
  } finally {
    trashBusyUri.value = null
  }
}

async function purgeForever(wiki: LichenWikiRecord) {
  if (!auth.agent || trashBusyUri.value) return
  if (!confirm(`Permanently delete “${wiki.name}”? This cannot be undone.`)) return
  trashBusyUri.value = wiki.uri
  trashError.value = ''
  try {
    await lichen.purgeWiki(auth.agent, wiki)
  } catch (err) {
    trashError.value = err instanceof Error ? err.message : 'Could not delete wiki'
  } finally {
    trashBusyUri.value = null
  }
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-inner">
      <header class="dashboard-header">
        <div>
          <h1>My wikis</h1>
          <p class="muted">@{{ auth.handle }} · Lichen records on your PDS</p>
        </div>
        <RouterLink to="/wiki/new" class="btn btn-primary">Create wiki</RouterLink>
      </header>

      <div v-if="initializing || lichen.loading" class="muted">Loading wikis…</div>
      <div v-else-if="lichen.error" class="error-text">{{ lichen.error }}</div>

      <template v-else>
        <div v-if="activeWikis.length === 0" class="empty card">
          <h2>No wikis yet</h2>
          <p class="muted">Create your first wiki using Lichen lexicons. It will interoperate with lichen.wiki.</p>
          <RouterLink to="/wiki/new" class="btn btn-primary">Create wiki</RouterLink>
        </div>

        <ul v-else class="wiki-list">
          <li v-for="wiki in activeWikis" :key="wiki.uri" class="wiki-item card">
            <div>
              <strong>{{ wiki.name }}</strong>
              <span class="slug">/{{ wiki.slug }}</span>
              <span class="badge">{{ visibilityLabel(wiki.visibility) }}</span>
            </div>
            <div class="actions">
              <RouterLink
                :to="`/@${auth.handle}/${wiki.slug}`"
                class="btn btn-secondary"
              >
                Open
              </RouterLink>
              <RouterLink
                :to="`/@${auth.handle}/${wiki.slug}/settings`"
                class="btn btn-ghost"
              >
                Settings
              </RouterLink>
            </div>
          </li>
        </ul>

        <section v-if="trashedWikis.length" class="trash-section">
          <header class="trash-header">
            <h2>Recently deleted</h2>
            <p class="muted">
              Restorable for {{ WIKI_TRASH_RETENTION_DAYS }} days, then permanently removed.
            </p>
          </header>
          <p v-if="trashError" class="error-text">{{ trashError }}</p>
          <ul class="wiki-list">
            <li v-for="wiki in trashedWikis" :key="wiki.uri" class="wiki-item card trash-item">
              <div>
                <strong>{{ wiki.name }}</strong>
                <span class="slug">/{{ wiki.slug }}</span>
                <span class="badge badge-trash">{{ formatWikiTrashCountdown(wiki) }}</span>
              </div>
              <div class="actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  :disabled="trashBusyUri === wiki.uri"
                  @click="restore(wiki)"
                >
                  {{ trashBusyUri === wiki.uri ? 'Working…' : 'Restore' }}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost"
                  :disabled="trashBusyUri === wiki.uri"
                  @click="purgeForever(wiki)"
                >
                  Delete forever
                </button>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem 1.25rem 4rem;
}

.dashboard-inner {
  max-width: 900px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.dashboard-header h1 {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.empty {
  padding: 1.5rem;
}

.wiki-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.wiki-item {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.slug {
  margin-left: 0.5rem;
  color: var(--pckt-text-subtle);
  font-size: 0.875rem;
}

.badge {
  margin-left: 0.5rem;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--pckt-accent-soft);
  color: var(--pckt-red);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 700;
}

.badge-trash {
  text-transform: none;
  letter-spacing: 0;
  background: color-mix(in srgb, var(--pckt-danger) 12%, transparent);
  color: var(--pckt-danger);
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.trash-section {
  margin-top: 2.5rem;
}

.trash-header {
  margin-bottom: 0.75rem;
}

.trash-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-family: var(--pckt-font-ui);
}

.trash-item {
  opacity: 0.92;
  border-style: dashed;
}
</style>
