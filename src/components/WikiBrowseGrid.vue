<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useFeaturedWikisList } from '@/composables/useFeaturedWikis'
import { wikiPath } from '@/data/featured-wikis'
import WikiAvatar from '@/components/WikiAvatar.vue'

const { wikis, loading } = useFeaturedWikisList()
</script>

<template>
  <div class="wiki-browse-grid">
    <p v-if="loading && wikis.length === 0" class="wiki-browse-loading muted">Loading wikis…</p>

    <RouterLink
      v-for="wiki in wikis"
      :key="`${wiki.handle}-${wiki.slug}`"
      :to="wikiPath(wiki.handle, wiki.slug)"
      class="wiki-browse-card"
    >
      <div class="wiki-browse-card-top">
        <WikiAvatar
          :handle="wiki.handle"
          :name="wiki.name"
          :seed="wiki.slug"
          :accent-color="wiki.accentColor"
          :size="48"
        />
        <div class="wiki-browse-card-meta">
          <span class="wiki-browse-card-lang">{{ wiki.language }}</span>
          <span class="wiki-browse-card-notes">{{ wiki.noteCount }} articles</span>
        </div>
      </div>
      <h3 class="wiki-browse-card-title">{{ wiki.name }}</h3>
      <p class="wiki-browse-card-description">{{ wiki.description }}</p>
      <p class="wiki-browse-card-handle">@{{ wiki.handle }}</p>
    </RouterLink>
  </div>
</template>

<style scoped>
.wiki-browse-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1rem;
}

.wiki-browse-loading {
  grid-column: 1 / -1;
  margin: 0;
}

.wiki-browse-card {
  display: block;
  padding: 1rem;
  border-radius: var(--pckt-radius-btn);
  border: 1px solid #dccaa4;
  background: #fff;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

[data-theme='dark'] .wiki-browse-card {
  border-color: #3a3025;
  background: rgba(31, 41, 55, 0.4);
}

.wiki-browse-card:hover {
  background: color-mix(in srgb, var(--pckt-blue) 5%, #fff);
  transform: translateY(-2px);
  box-shadow: var(--pckt-shadow-xs);
  text-decoration: none;
}

[data-theme='dark'] .wiki-browse-card:hover {
  background: color-mix(in srgb, var(--pckt-blue) 10%, #1f2937);
}

.wiki-browse-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
}

.wiki-browse-card-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  color: var(--pckt-text-muted);
}

.wiki-browse-card-title {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.3;
}

.wiki-browse-card-description {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wiki-browse-card-handle {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  color: var(--pckt-blue);
  font-weight: 600;
}
</style>
