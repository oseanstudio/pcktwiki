<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { loadWikiByHandle } from '@/lib/atproto/wiki-loader'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { normalizeHandle } from '@/lib/config'
import { computeWikiCategories, findCategoryBySlug, getNotesInCategory } from '@/lib/lichen/categories'

const route = useRoute()
const auth = useAuthStore()
const lichen = useLichenStore()

const handle = computed(() => normalizeHandle(route.params.handle as string))
const wikiSlug = computed(() => route.params.wikiSlug as string)
const categorySlugParam = computed(() => route.params.categorySlug as string)

async function load() {
  await loadWikiByHandle(lichen, {
    handle: handle.value,
    wikiSlug: wikiSlug.value,
    viewerDid: auth.did,
    authAgent: auth.agent,
  })
}

onMounted(load)
watch(() => route.fullPath, load)

const allCategories = computed(() => computeWikiCategories(lichen.notes))
const category = computed(() => findCategoryBySlug(allCategories.value, categorySlugParam.value))
const notes = computed(() => getNotesInCategory(lichen.notes, categorySlugParam.value))
</script>

<template>
  <div class="category-page">
    <div class="category-inner">
      <header>
        <RouterLink :to="`/@${handle}/${wikiSlug}`" class="muted">← Wiki home</RouterLink>
        <h1>Category: {{ category?.name ?? categorySlugParam }}</h1>
        <p v-if="category" class="muted">{{ category.count }} article{{ category.count === 1 ? '' : 's' }}</p>
      </header>

      <div v-if="lichen.loading" class="muted">Loading…</div>
      <ul v-else-if="notes.length" class="note-list card">
        <li v-for="note in notes" :key="note.uri">
          <RouterLink :to="`/@${handle}/${wikiSlug}/${note.slug}`">
            {{ note.title }}
          </RouterLink>
        </li>
      </ul>
      <p v-else class="muted">No articles in this category yet.</p>
    </div>
  </div>
</template>

<style scoped>
.category-page {
  padding: 2rem 1.25rem 4rem;
}

.category-inner {
  max-width: 720px;
  margin: 0 auto;
}

header h1 {
  margin: 0.5rem 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.note-list {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0.75rem 1rem;
}

.note-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--pckt-border);
}

.note-list li:last-child {
  border-bottom: none;
}
</style>
