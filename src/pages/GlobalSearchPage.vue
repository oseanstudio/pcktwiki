<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import GlobalWikiSearch from '@/components/GlobalWikiSearch.vue'
import SearchSuggestionThumb from '@/components/SearchSuggestionThumb.vue'
import { useGlobalWikiSearch } from '@/composables/useGlobalWikiSearch'
import { resultPath, searchGlobalIndex } from '@/lib/lichen/global-search'

const route = useRoute()
const router = useRouter()
const { query, loading, index, indexReady, indexingArticles, articlesComplete, ensureIndex } =
  useGlobalWikiSearch()

const pageQuery = computed(() => String(route.query.q ?? ''))

watch(
  pageQuery,
  (value) => {
    if (query.value !== value) query.value = value
    if (value.trim().length >= 2) {
      void ensureIndex()
    }
  },
  { immediate: true },
)

watch(query, (value) => {
  const q = value.trim()
  const current = String(route.query.q ?? '')
  if (current === q) return
  void router.replace({ query: q ? { q } : {} })
})

const displayResults = computed(() => {
  const q = query.value.trim()
  if (q.length < 2 || !index.value) return []
  return searchGlobalIndex(index.value, q, 30)
})
</script>

<template>
  <div class="global-search-page">
    <div class="global-search-inner">
      <header class="global-search-header">
        <RouterLink to="/wikis" class="muted">← Browse wikis</RouterLink>
        <h1>Search the network</h1>
        <p class="global-search-lead muted">
          Find wikis and articles published across different PDS hosts.
        </p>
      </header>

      <GlobalWikiSearch input-id="global-search-page-input" />

      <div v-if="loading && !indexReady" class="muted global-search-loading">
        Loading wikis from across the network…
      </div>

      <ul v-else-if="query.trim().length >= 2 && displayResults.length" class="results card">
        <li
          v-for="result in displayResults"
          :key="result.kind === 'wiki' ? `w-${result.wiki.slug}` : `n-${result.note.uri}`"
        >
          <RouterLink :to="resultPath(result)" class="result-link">
            <SearchSuggestionThumb
              :image-url="result.thumbnailUrl"
              :alt="result.kind === 'wiki' ? result.wiki.name : result.note.title"
              :handle="result.wiki.handle"
              :name="result.wiki.name"
              :seed="result.wiki.slug"
              :accent-color="result.wiki.accentColor"
              :size="48"
            />
            <span class="result-copy">
              <strong>{{ result.kind === 'wiki' ? result.wiki.name : result.note.title }}</strong>
              <span class="result-meta muted">
                <template v-if="result.kind === 'wiki'">
                  @{{ result.wiki.handle }} · {{ result.wiki.pdsHost }}
                </template>
                <template v-else>
                  @{{ result.wiki.handle }}/{{ result.wiki.slug }} · {{ result.wiki.pdsHost }}
                </template>
              </span>
              <span v-if="result.kind === 'note'" class="result-snippet muted">{{ result.snippet }}</span>
              <span v-else class="result-snippet muted">{{ result.wiki.description }}</span>
            </span>
            <span class="result-kind muted">{{ result.kind === 'wiki' ? 'Wiki' : 'Article' }}</span>
          </RouterLink>
        </li>
      </ul>

      <p v-else-if="query.trim().length >= 2 && indexReady && !indexingArticles" class="muted">
        No matches for “{{ query.trim() }}” in any public wiki on the network.
      </p>

      <p
        v-if="indexReady && indexingArticles && !articlesComplete"
        class="muted global-search-progress"
      >
        Reading articles across the network — more results may still appear…
      </p>
    </div>
  </div>
</template>

<style scoped>
.global-search-page {
  padding: 2rem 1.25rem 4rem;
  min-height: calc(100dvh - 3rem);
}

.global-search-inner {
  max-width: 720px;
  margin: 0 auto;
}

.global-search-header h1 {
  margin: 0.75rem 0 0.375rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.global-search-lead {
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.global-search-loading {
  margin-top: 1.5rem;
}

.global-search-progress {
  margin-top: 1rem;
  font-size: 0.875rem;
}

.results {
  margin-top: 1.5rem;
  list-style: none;
  padding: 0.35rem;
}

.result-link {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 0.75rem;
  border-radius: var(--pckt-radius-sm);
  color: inherit;
  text-decoration: none;
}

.result-link:hover {
  background: var(--pckt-bg-muted);
  text-decoration: none;
}

.result-copy {
  flex: 1;
  min-width: 0;
}

.result-copy strong {
  display: block;
  font-size: 1rem;
  line-height: 1.3;
}

.result-meta {
  display: block;
  margin-top: 0.125rem;
  font-size: 0.8125rem;
}

.result-snippet {
  display: block;
  margin-top: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.45;
}

.result-kind {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
