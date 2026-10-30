<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RecentChange } from '@/lib/lichen/recent-changes'
import { formatDocumentDate } from '@/lib/standardsite/blog'

/** Renders every change it is given — callers cap the count via listRecentChanges. */
defineProps<{
  changes: RecentChange[]
  ownerHandle: string
  wikiSlug: string
}>()
</script>

<template>
  <ul class="recent-list">
    <li v-for="change in changes" :key="change.revision.uri">
      <RouterLink :to="`/@${ownerHandle}/${wikiSlug}/${change.note.slug}`">
        <strong>{{ change.note.title }}</strong>
      </RouterLink>
      <span class="meta muted">
        {{ formatDocumentDate(change.revision.createdAt) }}
        <template v-if="change.revision.message"> · {{ change.revision.message }}</template>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--pckt-border);
}

.recent-list li:last-child {
  border-bottom: none;
}

.meta {
  display: block;
  font-size: 0.8125rem;
  margin-top: 0.15rem;
}
</style>
