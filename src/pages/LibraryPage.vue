<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import WikiLibraryCard from '@/components/WikiLibraryCard.vue'
import { useWikiLibrary, type LibraryItemType } from '@/composables/useWikiLibrary'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { items, loading, refresh, subscribe } = useWikiLibrary()

subscribe(() => {
  void refresh()
})

const filter = computed(() => {
  const groups: Record<string, typeof items.value> = {
    draft: [],
    owned: [],
    fork: [],
    watched: [],
    cached: [],
  }
  for (const item of items.value) {
    groups[item.type]?.push(item)
  }
  return groups
})

function sectionTitle(type: LibraryItemType): string {
  switch (type) {
    case 'draft':
      return 'Local drafts'
    case 'owned':
      return 'Your wikis'
    case 'fork':
      return 'Forks'
    case 'watched':
      return 'Watching'
    case 'cached':
      return 'Cached offline'
    default:
      return type
  }
}
</script>

<template>
  <div class="library-page">
    <div class="library-inner">
      <header class="library-header">
        <div>
          <h1>Wiki library</h1>
          <p class="muted">
            Your wikis, forks, watchlist, offline cache, and local drafts in one place.
          </p>
        </div>
        <div class="library-header-actions">
          <RouterLink v-if="auth.isAuthenticated" to="/wiki/new" class="btn btn-primary">
            Create wiki
          </RouterLink>
          <RouterLink v-else to="/wiki/new" class="btn btn-primary">Start locally</RouterLink>
          <RouterLink to="/feed" class="btn btn-ghost">Activity feed</RouterLink>
        </div>
      </header>

      <div v-if="loading" class="muted">Loading library…</div>

      <template v-else>
        <section
          v-for="(groupItems, type) in filter"
          :key="type"
          v-show="groupItems.length > 0"
          class="library-section"
        >
          <h2>{{ sectionTitle(type as LibraryItemType) }}</h2>
          <div class="library-grid">
            <WikiLibraryCard
              v-for="item in groupItems"
              :key="item.id"
              :item="item"
              @refresh="refresh"
            />
          </div>
        </section>

        <p v-if="items.length === 0" class="muted">
          No wikis yet.
          <RouterLink to="/wiki/new">Create one</RouterLink>
          or browse <RouterLink to="/wikis">public wikis</RouterLink>.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.library-page {
  padding: 2rem 1.25rem 4rem;
}

.library-inner {
  max-width: 900px;
  margin: 0 auto;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.library-header h1 {
  margin: 0 0 0.25rem;
}

.library-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.library-section {
  margin-bottom: 2rem;
}

.library-section h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-family: var(--pckt-font-content);
}

.library-grid {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
</style>
