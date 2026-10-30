<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { loadWikiByHandle } from '@/lib/atproto/wiki-loader'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { normalizeHandle } from '@/lib/config'
import { searchWikiNotes } from '@/lib/lichen/search'
import { filterNotes, type NoteFilters } from '@/lib/lichen/timeline'
import { NOTE_TEMPLATES } from '@/lib/lichen/templates'
import { useReaderPrefs } from '@/composables/useReaderPrefs'
import { isBranchSlug } from '@/lib/lichen/branches'
import { isTalkSlug } from '@/lib/lichen/content-meta'

const route = useRoute()
const auth = useAuthStore()
const lichen = useLichenStore()
const { hideNonMain } = useReaderPrefs()

const handle = computed(() => normalizeHandle(route.params.handle as string))
const wikiSlug = computed(() => route.params.wikiSlug as string)
const query = ref(String(route.query.q ?? ''))
const template = ref<string>(String(route.query.template ?? ''))
const status = ref<string>(String(route.query.status ?? ''))
const canon = ref<string>(String(route.query.canon ?? ''))

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

const filters = computed<NoteFilters>(() => ({
  template: template.value || null,
  status: status.value === 'draft' || status.value === 'stub' ? status.value : null,
  canon: canon.value === 'main' || canon.value === 'au' || canon.value === 'spoilers' ? canon.value : null,
  hideNonMain: hideNonMain.value && !canon.value,
}))

const filteredNotes = computed(() =>
  filterNotes(
    lichen.notes.filter((note) => !isTalkSlug(note.slug) && !isBranchSlug(note.slug)),
    filters.value,
  ),
)

const results = computed(() => {
  if (!query.value.trim()) {
    return filteredNotes.value.slice(0, 40).map((note) => ({
      note,
      snippet: '',
      score: 0,
    }))
  }
  return searchWikiNotes(filteredNotes.value, query.value, 40)
})
</script>

<template>
  <div class="search-page">
    <div class="search-inner">
      <header>
        <RouterLink :to="`/@${handle}/${wikiSlug}`" class="muted">← Wiki home</RouterLink>
        <h1>Search</h1>
      </header>

      <input
        v-model="query"
        type="search"
        class="input"
        placeholder="Search articles…"
        aria-label="Search wiki"
      />

      <div class="filters">
        <select v-model="template" class="select" aria-label="Template filter">
          <option value="">All templates</option>
          <option v-for="item in NOTE_TEMPLATES.filter((t) => t.id !== 'blank')" :key="item.id" :value="item.id">
            {{ item.label }}
          </option>
        </select>
        <select v-model="status" class="select" aria-label="Status filter">
          <option value="">Any status</option>
          <option value="stub">Stub</option>
          <option value="draft">Draft</option>
        </select>
        <select v-model="canon" class="select" aria-label="Canon filter">
          <option value="">Any canon</option>
          <option value="main">Main</option>
          <option value="au">AU</option>
          <option value="spoilers">Spoilers</option>
        </select>
      </div>

      <ul v-if="results.length" class="results card">
        <li v-for="result in results" :key="result.note.uri">
          <RouterLink :to="`/@${handle}/${wikiSlug}/${result.note.slug}`">
            <strong>{{ result.note.title }}</strong>
            <span v-if="result.snippet" class="snippet muted">{{ result.snippet }}</span>
          </RouterLink>
        </li>
      </ul>
      <p v-else-if="query.trim()" class="muted">No matches for “{{ query }}”</p>
      <p v-else class="muted">{{ filteredNotes.length }} notes match the current filters.</p>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  padding: 2rem 1.25rem 4rem;
}

.search-inner {
  max-width: 720px;
  margin: 0 auto;
}

header h1 {
  margin: 0.5rem 0 1rem;
  font-family: var(--pckt-font-content);
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
  margin: 0.75rem 0 0;
}

.results {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0.5rem;
}

.results a {
  display: block;
  padding: 0.75rem;
  border-radius: var(--pckt-radius-sm);
  color: inherit;
  text-decoration: none;
}

.results a:hover {
  background: var(--pckt-bg-muted);
  text-decoration: none;
}

.snippet {
  display: block;
  font-size: 0.875rem;
  margin-top: 0.2rem;
}
</style>
