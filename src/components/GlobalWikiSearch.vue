<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import SearchSuggestionThumb from '@/components/SearchSuggestionThumb.vue'
import { useComboboxKeyboard } from '@/composables/useComboboxKeyboard'
import { useGlobalWikiSearch } from '@/composables/useGlobalWikiSearch'
import { resultPath, type GlobalSearchResult } from '@/lib/lichen/global-search'

const props = withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    inputId?: string
  }>(),
  {
    id: 'global-wiki-search',
    placeholder: 'Search wikis and articles across the network…',
    inputId: 'global-wiki-search-input',
  },
)

const router = useRouter()
const {
  query,
  loading,
  indexReady,
  indexingArticles,
  articlesComplete,
  results,
  hasQuery,
  ensureIndex,
} = useGlobalWikiSearch()

const open = ref(false)
const activeIndex = ref(-1)

let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(query, (value) => {
  clearTimeout(debounceTimer)
  activeIndex.value = -1

  const q = value.trim()
  if (q.length < 2) {
    open.value = false
    return
  }

  open.value = true
  debounceTimer = setTimeout(() => {
    void ensureIndex()
  }, 150)
})

function onFocus() {
  if (hasQuery.value) {
    open.value = true
    void ensureIndex()
  }
}

function onBlur(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (next && (event.currentTarget as HTMLElement).parentElement?.contains(next)) {
    return
  }
  open.value = false
  activeIndex.value = -1
}

function close() {
  open.value = false
  activeIndex.value = -1
}

function selectResult(result: GlobalSearchResult) {
  close()
  query.value = ''
  void router.push(resultPath(result))
}

function onSubmit() {
  const q = query.value.trim()
  if (!q) return
  close()
  void router.push({ name: 'global-search', query: { q } })
}

function suggestionId(index: number): string {
  return `${props.inputId}-suggestion-${index}`
}

const { onKeydown } = useComboboxKeyboard(
  open,
  activeIndex,
  toRef(() => results.value.length),
  {
    onSelect(index) {
      const result = results.value[index]
      if (result) selectResult(result)
    },
    onClose: close,
    onEnterWithoutSelection: onSubmit,
  },
  suggestionId,
)

function resultLabel(result: GlobalSearchResult): string {
  return result.kind === 'wiki' ? result.wiki.name : result.note.title
}
</script>

<template>
  <div :id="id" class="global-wiki-search">
    <form class="global-wiki-search-form" role="search" @submit.prevent="onSubmit">
      <label class="sr-only" :for="inputId">Search wikis across the network</label>
      <span class="global-wiki-search-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path
            fill-rule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
      <input
        :id="inputId"
        v-model="query"
        type="search"
        class="global-wiki-search-input"
        :placeholder="placeholder"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open && (results.length > 0 || loading)"
        :aria-controls="`${inputId}-listbox`"
        :aria-activedescendant="activeIndex >= 0 ? suggestionId(activeIndex) : undefined"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
    </form>

    <ul
      v-if="open && hasQuery && (results.length || loading || indexReady)"
      :id="`${inputId}-listbox`"
      role="listbox"
      class="global-wiki-search-results card"
    >
      <li v-if="loading && !results.length" class="global-wiki-search-status muted">
        Finding wikis across the network…
      </li>
      <li
        v-for="(result, index) in results"
        :id="suggestionId(index)"
        :key="result.kind === 'wiki' ? `wiki-${result.wiki.handle}-${result.wiki.slug}` : `note-${result.note.uri}`"
        role="option"
        :aria-selected="index === activeIndex"
      >
        <button
          type="button"
          class="global-wiki-search-result"
          :class="{ 'combobox-option-active': index === activeIndex }"
          @mousedown.prevent="selectResult(result)"
        >
          <SearchSuggestionThumb
            :image-url="result.thumbnailUrl"
            :alt="resultLabel(result)"
            :handle="result.wiki.handle"
            :name="result.wiki.name"
            :seed="result.wiki.slug"
            :accent-color="result.wiki.accentColor"
            :size="40"
          />
          <span class="global-wiki-search-result-copy">
            <span class="global-wiki-search-result-title">
              {{ resultLabel(result) }}
            </span>
            <span class="global-wiki-search-result-meta muted">
              <template v-if="result.kind === 'wiki'">
                @{{ result.wiki.handle }} · {{ result.wiki.pdsHost }}
              </template>
              <template v-else>
                @{{ result.wiki.handle }}/{{ result.wiki.slug }} · {{ result.wiki.pdsHost }}
              </template>
            </span>
            <span v-if="result.kind === 'note' && result.snippet" class="global-wiki-search-result-snippet muted">
              {{ result.snippet }}
            </span>
          </span>
          <span class="global-wiki-search-result-kind muted">
            {{ result.kind === 'wiki' ? 'Wiki' : 'Article' }}
          </span>
        </button>
      </li>
      <li
        v-if="!loading && indexReady && !results.length && !indexingArticles"
        class="global-wiki-search-status muted"
      >
        No matches — press Enter to search the whole network
      </li>
      <li
        v-if="indexReady && indexingArticles && !articlesComplete"
        class="global-wiki-search-status muted"
      >
        Reading articles across the network…
      </li>
      <li v-if="results.length" class="global-wiki-search-footer">
        <RouterLink
          :to="{ name: 'global-search', query: { q: query.trim() } }"
          class="global-wiki-search-more"
          @mousedown.prevent
          @click="close"
        >
          View all results for “{{ query.trim() }}”
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.global-wiki-search {
  position: relative;
  width: 100%;
}

.global-wiki-search-form {
  position: relative;
}

.global-wiki-search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: var(--pckt-text-subtle);
  pointer-events: none;
}

.global-wiki-search-input {
  width: 100%;
  min-height: 58px;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 1rem;
  background: var(--pckt-bg-elevated);
  color: var(--pckt-text);
  font-family: var(--pckt-font-ui);
  font-size: 1.125rem;
  line-height: 1.4;
  box-shadow: var(--pckt-shadow-xs);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.global-wiki-search-input::placeholder {
  color: #9ca3af;
}

.global-wiki-search-input:hover {
  box-shadow:
    var(--pckt-shadow-xs),
    0 0 0 1px #d1d5db;
}

.global-wiki-search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

[data-theme='dark'] .global-wiki-search-input {
  border-color: #374151;
  background: #111827;
  color: #f3f4f6;
}

[data-theme='dark'] .global-wiki-search-input::placeholder {
  color: #6b7280;
}

[data-theme='dark'] .global-wiki-search-input:hover {
  box-shadow:
    var(--pckt-shadow-xs),
    0 0 0 1px #4b5563;
}

[data-theme='dark'] .global-wiki-search-input:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.25);
}

.global-wiki-search-results {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  max-height: 360px;
  overflow-y: auto;
  text-align: left;
}

.global-wiki-search-result {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: none;
  border-radius: var(--pckt-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.global-wiki-search-result:hover {
  background: var(--pckt-bg-muted);
}

.global-wiki-search-result-copy {
  flex: 1;
  min-width: 0;
}

.global-wiki-search-result-title {
  display: block;
  font-weight: 700;
  font-size: 0.9375rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-wiki-search-result-meta {
  display: block;
  margin-top: 0.125rem;
  font-size: 0.75rem;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-wiki-search-result-snippet {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.global-wiki-search-result-kind {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding-top: 0.125rem;
}

.global-wiki-search-status {
  margin: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.global-wiki-search-footer {
  border-top: 1px solid var(--pckt-border);
  margin-top: 0.25rem;
  padding-top: 0.25rem;
}

.global-wiki-search-more {
  display: block;
  padding: 0.625rem 0.75rem;
  border-radius: var(--pckt-radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--pckt-blue);
  text-decoration: none;
}

.global-wiki-search-more:hover {
  background: var(--pckt-bg-muted);
  text-decoration: none;
}
</style>
