<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  fetchFollowFeed,
  filterFeedByType,
  type FeedItem,
} from '@/lib/lichen/follow-feed'
import {
  formatNotificationTime,
  notificationHeadline,
  notificationPath,
} from '@/lib/notifications'

const items = ref<FeedItem[]>([])
const loading = ref(true)
const filter = ref<'all' | 'edit' | 'fork-upstream'>('all')

async function load() {
  loading.value = true
  try {
    items.value = await fetchFollowFeed(100)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function filtered(): FeedItem[] {
  return filterFeedByType(items.value, filter.value)
}
</script>

<template>
  <div class="feed-page">
    <div class="feed-inner">
      <header class="feed-header">
        <h1>Follow feed</h1>
        <p class="muted">Recent activity from watched wikis and fork upstream sources.</p>
        <div class="feed-filters">
          <button
            v-for="option in ['all', 'edit', 'fork-upstream'] as const"
            :key="option"
            type="button"
            class="btn btn-ghost btn-sm"
            :class="{ active: filter === option }"
            @click="filter = option"
          >
            {{ option === 'all' ? 'All' : option === 'edit' ? 'Edits' : 'Fork upstream' }}
          </button>
          <RouterLink to="/library" class="btn btn-ghost btn-sm">Library</RouterLink>
        </div>
      </header>

      <div v-if="loading" class="muted">Loading feed…</div>
      <ul v-else-if="filtered().length" class="feed-list">
        <li v-for="item in filtered()" :key="item.id" class="feed-item card">
          <RouterLink :to="notificationPath(item)" class="feed-link">
            <span class="feed-type">{{ item.feedType === 'fork-upstream' ? 'Fork' : 'Edit' }}</span>
            <strong>{{ notificationHeadline(item) }}</strong>
            <span class="muted feed-meta">
              @{{ item.wikiHandle }}/{{ item.wikiSlug }} · {{ formatNotificationTime(item.createdAt) }}
            </span>
          </RouterLink>
        </li>
      </ul>
      <p v-else class="muted">
        No activity yet. Watch wikis from their toolbar or browse
        <RouterLink to="/wikis">public wikis</RouterLink>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.feed-page {
  padding: 2rem 1.25rem 4rem;
}

.feed-inner {
  max-width: 720px;
  margin: 0 auto;
}

.feed-header h1 {
  margin: 0 0 0.25rem;
}

.feed-filters {
  display: flex;
  gap: 0.4rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.feed-filters .active {
  background: var(--pckt-accent);
  color: white;
}

.feed-list {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.feed-item {
  padding: 0;
}

.feed-link {
  display: block;
  padding: 0.875rem 1rem;
  text-decoration: none;
  color: inherit;
}

.feed-type {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-right: 0.5rem;
  color: var(--pckt-text-muted);
}

.feed-meta {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8125rem;
}
</style>
