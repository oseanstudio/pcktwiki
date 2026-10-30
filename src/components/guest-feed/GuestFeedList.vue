<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { GuestFeedItem } from '@/lib/lichen/guest-feed'
import { wikiPath } from '@/data/featured-wikis'
import { getTopicById } from '@/data/guest-feed'
import { formatDocumentDate } from '@/lib/standardsite/blog'
import WikiAvatar from '@/components/WikiAvatar.vue'
import FeedLikeSurface from '@/components/guest-feed/FeedLikeSurface.vue'

defineProps<{
  items: GuestFeedItem[]
  limit?: number
  compact?: boolean
  /** Two-column card grid on wide containers */
  grid?: boolean
  /** Double-click / double-tap toggles wiki watchlist (homescreen feed) */
  likeable?: boolean
}>()

function itemPath(item: GuestFeedItem): string {
  return `${wikiPath(item.wiki.handle, item.wiki.slug)}/${item.note.slug}`
}
</script>

<template>
  <ul class="guest-feed-list" :class="{ compact, grid }">
    <li v-for="item in items.slice(0, limit ?? items.length)" :key="item.revision.uri">
      <article class="guest-feed-item">
        <FeedLikeSurface
          v-if="likeable"
          :to="itemPath(item)"
          :handle="item.wiki.handle"
          :wiki-slug="item.wiki.slug"
          :wiki-name="item.wiki.name"
          class="guest-feed-main"
        >
          <WikiAvatar
            :handle="item.wiki.handle"
            :name="item.wiki.name"
            :seed="item.wiki.slug"
            :accent-color="item.wiki.accentColor"
            :size="compact ? 36 : 44"
          />
          <div class="guest-feed-copy">
            <h3 class="guest-feed-title">{{ item.note.title }}</h3>
            <p v-if="item.snippet && !compact" class="guest-feed-snippet muted">{{ item.snippet }}</p>
            <p class="guest-feed-meta muted">
              <span class="guest-feed-wiki">{{ item.wiki.name }}</span>
              · @{{ item.wiki.handle }}
              · {{ item.wiki.pdsHost }}
              · {{ formatDocumentDate(item.revision.createdAt) }}
              <template v-if="item.revision.message"> · {{ item.revision.message }}</template>
            </p>
          </div>
        </FeedLikeSurface>

        <RouterLink
          v-else
          :to="itemPath(item)"
          class="guest-feed-main"
        >
          <WikiAvatar
            :handle="item.wiki.handle"
            :name="item.wiki.name"
            :seed="item.wiki.slug"
            :accent-color="item.wiki.accentColor"
            :size="compact ? 36 : 44"
          />
          <div class="guest-feed-copy">
            <h3 class="guest-feed-title">{{ item.note.title }}</h3>
            <p v-if="item.snippet && !compact" class="guest-feed-snippet muted">{{ item.snippet }}</p>
            <p class="guest-feed-meta muted">
              <span class="guest-feed-wiki">{{ item.wiki.name }}</span>
              · @{{ item.wiki.handle }}
              · {{ item.wiki.pdsHost }}
              · {{ formatDocumentDate(item.revision.createdAt) }}
              <template v-if="item.revision.message"> · {{ item.revision.message }}</template>
            </p>
          </div>
        </RouterLink>

        <ul v-if="item.wiki.topics.length && !compact" class="guest-feed-topics">
          <li v-for="topicId in item.wiki.topics" :key="topicId">
            <span class="topic-pill">{{ getTopicById(topicId)?.label ?? topicId }}</span>
          </li>
        </ul>
      </article>
    </li>
  </ul>
</template>

<style scoped>
.guest-feed-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.guest-feed-list.grid {
  container-type: inline-size;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

@container (min-width: 34rem) {
  .guest-feed-list.grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.guest-feed-list.grid .guest-feed-item {
  padding: 0;
  border-bottom: none;
}

.guest-feed-list.grid .guest-feed-main {
  height: 100%;
  padding: 0.875rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.guest-feed-list.grid .guest-feed-main:hover {
  border-color: color-mix(in srgb, var(--pckt-red) 30%, var(--pckt-border));
  background: color-mix(in srgb, var(--pckt-red) 4%, var(--pckt-bg));
}

.guest-feed-list.grid .guest-feed-topics {
  margin-left: 0;
  padding: 0 0.875rem 0.875rem;
}

.guest-feed-item {
  padding: 1rem 0;
  border-bottom: 1px solid var(--pckt-border);
}

.guest-feed-item:last-child {
  border-bottom: none;
}

.guest-feed-main {
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
  color: inherit;
  text-decoration: none;
}

.guest-feed-main:hover {
  text-decoration: none;
}

.guest-feed-main:hover .guest-feed-title {
  color: var(--pckt-red);
}

.guest-feed-copy {
  min-width: 0;
  flex: 1;
}

.guest-feed-title {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-ui);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.3;
  transition: color 0.15s ease;
}

.compact .guest-feed-item {
  padding: 0.625rem 0;
}

.compact .guest-feed-title {
  font-size: 0.9375rem;
}

.compact .guest-feed-meta {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.guest-feed-snippet {
  margin: 0 0 0.375rem;
  font-size: 0.875rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.guest-feed-meta {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
}

.guest-feed-wiki {
  font-weight: 700;
  color: var(--pckt-text);
}

.guest-feed-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  list-style: none;
  margin: 0.625rem 0 0 3.25rem;
  padding: 0;
}

.compact .guest-feed-topics {
  margin-left: 2.875rem;
}

.topic-pill {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: var(--pckt-radius-pill);
  background: var(--pckt-bg-muted);
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: capitalize;
  color: var(--pckt-text-muted);
}
</style>
