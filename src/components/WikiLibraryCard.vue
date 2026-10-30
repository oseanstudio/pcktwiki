<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { LibraryItem } from '@/composables/useWikiLibrary'
import { setPinned } from '@/lib/lichen/wiki-cache'

const props = defineProps<{
  item: LibraryItem
}>()

const emit = defineEmits<{
  refresh: []
}>()

async function togglePin() {
  if (!props.item.handle || !props.item.wikiSlug) return
  await setPinned(props.item.handle, props.item.wikiSlug, !props.item.pinned)
  emit('refresh')
}
</script>

<template>
  <article class="library-card card">
    <div class="library-card-main">
      <span v-if="item.badge" class="library-badge">{{ item.badge }}</span>
      <h3>
        <RouterLink :to="item.path">{{ item.name }}</RouterLink>
      </h3>
      <p v-if="item.handle && item.wikiSlug" class="muted library-meta">
        @{{ item.handle }}/{{ item.wikiSlug }}
      </p>
      <p v-if="item.pendingForkChanges" class="library-fork-pending">
        {{ item.pendingForkChanges }} upstream change{{ item.pendingForkChanges === 1 ? '' : 's' }}
      </p>
    </div>
    <div class="library-card-actions">
      <button
        v-if="item.handle && item.wikiSlug && item.type !== 'draft'"
        type="button"
        class="btn btn-ghost btn-sm"
        @click="togglePin"
      >
        {{ item.pinned ? 'Pinned' : 'Pin' }}
      </button>
      <RouterLink :to="item.path" class="btn btn-secondary btn-sm">Open</RouterLink>
    </div>
  </article>
</template>

<style scoped>
.library-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.125rem;
}

.library-card h3 {
  margin: 0.25rem 0 0;
  font-size: 1rem;
}

.library-card h3 a {
  color: inherit;
  text-decoration: none;
}

.library-card h3 a:hover {
  color: var(--pckt-accent);
}

.library-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: var(--pckt-bg-muted);
  color: var(--pckt-text-muted);
}

.library-meta {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
}

.library-fork-pending {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  color: var(--pckt-yellow);
}

.library-card-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
</style>
