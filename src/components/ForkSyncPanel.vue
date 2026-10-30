<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { summarizeForkChanges, type ForkChange } from '@/lib/lichen/fork-sync'
import { toUserFacingNetworkError } from '@/lib/http-retry'
import ForkMergeDiff from '@/components/ForkMergeDiff.vue'

const auth = useAuthStore()
const lichen = useLichenStore()

const errorText = ref<string | null>(null)
const expanded = ref<Set<string>>(new Set())
const busySlug = ref<string | null>(null)

const fork = computed(() => lichen.forkInfo)
const changes = computed(() => lichen.forkChanges)
const summary = computed(() => summarizeForkChanges(changes.value))
const canManage = computed(() => lichen.access === 'admin')

const lastChecked = computed(() => {
  const iso = fork.value?.lastCheckedAt
  return iso ? new Date(iso).toLocaleString() : null
})

function toggle(slug: string) {
  const next = new Set(expanded.value)
  if (next.has(slug)) next.delete(slug)
  else next.add(slug)
  expanded.value = next
}

function changeLabel(change: ForkChange): string {
  if (change.type === 'added') return 'New upstream'
  if (change.type === 'removed') return 'Removed upstream'
  return change.conflicted ? 'Conflict' : 'Updated upstream'
}

async function check() {
  errorText.value = null
  try {
    await lichen.checkForkUpdates(auth.agent)
  } catch (err) {
    errorText.value = toUserFacingNetworkError(err)
  }
}

const mergeEditors = ref<Map<string, InstanceType<typeof ForkMergeDiff>>>(new Map())

function setMergeRef(slug: string, el: InstanceType<typeof ForkMergeDiff> | null) {
  if (el) mergeEditors.value.set(slug, el)
  else mergeEditors.value.delete(slug)
}

async function acceptAllClean() {
  if (!auth.agent) return
  errorText.value = null
  try {
    await lichen.acceptAllNonConflicting(auth.agent)
  } catch (err) {
    errorText.value = toUserFacingNetworkError(err)
  }
}

async function accept(change: ForkChange) {
  if (!auth.agent) return
  busySlug.value = change.slug
  errorText.value = null
  try {
    const editor = mergeEditors.value.get(change.slug)
    const custom = editor?.getMergeContent?.()
    await lichen.acceptForkChange(auth.agent, change, custom)
  } catch (err) {
    errorText.value = toUserFacingNetworkError(err)
  } finally {
    busySlug.value = null
  }
}

function deny(change: ForkChange) {
  lichen.denyForkChange(change)
}

function toggleAutoSync() {
  lichen.setForkAutoSyncPref(!(fork.value?.autoSync ?? false))
}

function detach() {
  if (!confirm('Stop tracking the upstream wiki? Your fork keeps all its content.')) return
  lichen.detachFork()
}

onMounted(() => {
  if (fork.value && canManage.value) void check()
})
</script>

<template>
  <section v-if="fork && canManage" class="fork-sync card">
    <header class="fork-sync-header">
      <div>
        <h2>Forked wiki</h2>
        <p class="muted">
          Tracking <code>@{{ fork.sourceHandle }}/{{ fork.sourceSlug }}</code>
          <template v-if="lastChecked"> · checked {{ lastChecked }}</template>
        </p>
      </div>
      <div class="fork-sync-controls">
        <label class="fork-sync-auto">
          <input type="checkbox" :checked="fork.autoSync" @change="toggleAutoSync" />
          Auto-sync
        </label>
        <button
          v-if="summary.total > 0 && summary.conflicts < summary.total"
          type="button"
          class="btn btn-secondary btn-sm"
          @click="acceptAllClean"
        >
          Accept all non-conflicts
        </button>
        <button type="button" class="btn btn-ghost btn-sm" :disabled="lichen.forkChecking" @click="check">
          {{ lichen.forkChecking ? 'Checking…' : 'Check for updates' }}
        </button>
        <button type="button" class="btn btn-ghost btn-sm" @click="detach">Detach</button>
      </div>
    </header>

    <p v-if="errorText" class="error-text">{{ errorText }}</p>

    <p v-if="!lichen.forkChecking && summary.total === 0" class="muted fork-sync-empty">
      Up to date with upstream.
    </p>

    <p v-else-if="summary.total > 0" class="fork-sync-summary muted">
      {{ summary.total }} change{{ summary.total === 1 ? '' : 's' }}
      <template v-if="summary.conflicts">· {{ summary.conflicts }} conflict{{ summary.conflicts === 1 ? '' : 's' }}</template>
    </p>

    <ul v-if="summary.total > 0" class="fork-change-list">
      <li v-for="change in changes" :key="change.slug" class="fork-change">
        <div class="fork-change-row">
          <button type="button" class="fork-change-toggle" @click="toggle(change.slug)">
            <span class="fork-change-caret" :class="{ open: expanded.has(change.slug) }">›</span>
            <span class="fork-change-title">{{ change.title || change.slug }}</span>
            <code class="fork-change-slug">{{ change.slug }}</code>
          </button>
          <span class="fork-change-badge" :class="`badge-${change.conflicted ? 'conflict' : change.type}`">
            {{ changeLabel(change) }}
          </span>
          <div class="fork-change-actions">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              :disabled="busySlug === change.slug"
              @click="accept(change)"
            >
              {{ change.type === 'removed' ? 'Delete mine' : 'Accept' }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="deny(change)">
              Keep mine
            </button>
          </div>
        </div>
        <div v-if="expanded.has(change.slug)" class="fork-change-diff">
          <ForkMergeDiff :ref="(el) => setMergeRef(change.slug, el as InstanceType<typeof ForkMergeDiff> | null)" :change="change" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.fork-sync {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
  margin-bottom: 1.25rem;
}

.fork-sync-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.fork-sync-header h2 {
  margin: 0;
  font-size: 1rem;
  font-family: var(--pckt-font-content);
}

.fork-sync-header p {
  margin: 0.2rem 0 0;
  font-size: 0.8125rem;
}

.fork-sync-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.fork-sync-auto {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
}

.fork-sync-summary,
.fork-sync-empty {
  margin: 0;
  font-size: 0.8125rem;
}

.fork-change-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fork-change {
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  padding: 0.625rem 0.75rem;
}

.fork-change-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.fork-change-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
  flex: 1 1 12rem;
  min-width: 0;
  text-align: left;
}

.fork-change-caret {
  transition: transform 0.15s ease;
  display: inline-block;
}

.fork-change-caret.open {
  transform: rotate(90deg);
}

.fork-change-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fork-change-slug {
  font-family: var(--pckt-font-mono);
  font-size: 0.75rem;
  color: var(--pckt-text-muted);
}

.fork-change-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--pckt-bg-muted);
  color: var(--pckt-text-muted);
}

.badge-conflict {
  background: color-mix(in srgb, var(--pckt-red) 20%, transparent);
  color: var(--pckt-red);
}

.badge-added {
  background: color-mix(in srgb, var(--pckt-green) 20%, transparent);
  color: var(--pckt-green);
}

.fork-change-actions {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}

.fork-change-diff {
  margin-top: 0.625rem;
}

.fork-change-diff-label {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
}

code {
  font-family: var(--pckt-font-mono);
}
</style>
