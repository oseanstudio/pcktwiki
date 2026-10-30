<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { GuestFeedWikiDisplay } from '@/lib/lichen/guest-feed'
import { getTopicById } from '@/data/guest-feed'
import { wikiPath } from '@/data/featured-wikis'
import WikiAvatar from '@/components/WikiAvatar.vue'
import FeedLikeSurface from '@/components/guest-feed/FeedLikeSurface.vue'

defineProps<{
  wikis: GuestFeedWikiDisplay[]
  compact?: boolean
  likeable?: boolean
}>()
</script>

<template>
  <ul class="wiki-cards" :class="{ compact }">
    <li v-for="wiki in wikis" :key="`${wiki.handle}-${wiki.slug}`">
      <FeedLikeSurface
        v-if="likeable"
        :to="wikiPath(wiki.handle, wiki.slug)"
        :handle="wiki.handle"
        :wiki-slug="wiki.slug"
        :wiki-name="wiki.name"
        class="wiki-card"
      >
        <WikiAvatar
          :handle="wiki.handle"
          :name="wiki.name"
          :seed="wiki.slug"
          :accent-color="wiki.accentColor"
          :size="compact ? 36 : 44"
        />
        <span class="wiki-card-copy">
          <strong>{{ wiki.name }}</strong>
          <span class="wiki-card-meta muted">@{{ wiki.handle }}</span>
          <span v-if="!compact" class="wiki-card-host muted">{{ wiki.pdsHost }}</span>
          <span v-if="!compact" class="wiki-card-blurb">{{ wiki.blurb }}</span>
          <span v-if="!compact && wiki.topics.length" class="wiki-card-topics">
            <span
              v-for="topicId in wiki.topics"
              :key="topicId"
              class="wiki-card-topic"
            >
              {{ getTopicById(topicId)?.label ?? topicId }}
            </span>
          </span>
        </span>
      </FeedLikeSurface>

      <RouterLink v-else :to="wikiPath(wiki.handle, wiki.slug)" class="wiki-card">
        <WikiAvatar
          :handle="wiki.handle"
          :name="wiki.name"
          :seed="wiki.slug"
          :accent-color="wiki.accentColor"
          :size="compact ? 36 : 44"
        />
        <span class="wiki-card-copy">
          <strong>{{ wiki.name }}</strong>
          <span class="wiki-card-meta muted">@{{ wiki.handle }}</span>
          <span v-if="!compact" class="wiki-card-host muted">{{ wiki.pdsHost }}</span>
          <span v-if="!compact" class="wiki-card-blurb">{{ wiki.blurb }}</span>
          <span v-if="!compact && wiki.topics.length" class="wiki-card-topics">
            <span
              v-for="topicId in wiki.topics"
              :key="topicId"
              class="wiki-card-topic"
            >
              {{ getTopicById(topicId)?.label ?? topicId }}
            </span>
          </span>
        </span>
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.wiki-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.wiki-cards.compact {
  gap: 0.5rem;
}

.wiki-cards.compact .wiki-card {
  padding: 0.625rem 0.75rem;
}

.wiki-card {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.wiki-card:hover {
  border-color: color-mix(in srgb, var(--pckt-red) 30%, var(--pckt-border));
  background: color-mix(in srgb, var(--pckt-red) 4%, var(--pckt-bg));
  text-decoration: none;
}

.wiki-card-copy {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.wiki-card-copy strong {
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.wiki-card-meta,
.wiki-card-host {
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.wiki-card-blurb {
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--pckt-text-muted);
  margin-top: 0.125rem;
}

.wiki-card-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
}

.wiki-card-topic {
  font-family: var(--pckt-font-ui);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.125rem 0.375rem;
  border-radius: var(--pckt-radius-pill);
  background: var(--pckt-bg-muted);
  color: var(--pckt-text-muted);
}
</style>
