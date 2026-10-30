<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { LichenNoteWithContent } from '@/types/lichen'
import { searchWikiNotes } from '@/lib/lichen/search'
import { useComboboxKeyboard } from '@/composables/useComboboxKeyboard'

const props = withDefaults(
  defineProps<{
    notes: LichenNoteWithContent[]
    ownerHandle: string
    wikiSlug: string
    /** Button that expands into the search field (mobile toolbar) */
    expandable?: boolean
  }>(),
  { expandable: false },
)

const router = useRouter()
const query = ref('')
const open = ref(false)
const expanded = ref(!props.expandable)
const activeIndex = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)

const results = computed(() => searchWikiNotes(props.notes, query.value, 8))
const basePath = computed(
  () => `/@${encodeURIComponent(props.ownerHandle)}/${encodeURIComponent(props.wikiSlug)}`,
)

function close() {
  open.value = false
  activeIndex.value = -1
}

function onInput() {
  activeIndex.value = -1
  open.value = query.value.trim().length > 0
}

function selectResult(index: number) {
  const result = results.value[index]
  if (!result) return
  close()
  query.value = ''
  if (props.expandable) expanded.value = false
  void router.push(`${basePath.value}/${result.note.slug}`)
}

const inputId = props.expandable ? 'wiki-search-input-mobile' : 'wiki-search-input'

function suggestionId(index: number): string {
  return `${inputId}-suggestion-${index}`
}

async function expand() {
  expanded.value = true
  await nextTick()
  inputRef.value?.focus()
}

function collapse() {
  if (!props.expandable) return
  close()
  query.value = ''
  expanded.value = false
}

function onBlur(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  const root = (event.currentTarget as HTMLElement).closest('.wiki-search')
  if (next && root?.contains(next)) return
  close()
  if (props.expandable && !query.value.trim()) {
    expanded.value = false
  }
}

const { onKeydown } = useComboboxKeyboard(
  open,
  activeIndex,
  toRef(() => results.value.length),
  {
    onSelect: selectResult,
    onClose: () => {
      close()
      if (props.expandable && !query.value.trim()) expanded.value = false
    },
  },
  suggestionId,
)

watch(
  () => props.expandable,
  (value) => {
    expanded.value = !value
  },
)
</script>

<template>
  <div class="wiki-search" :class="{ expandable, expanded }">
    <button
      v-if="expandable && !expanded"
      type="button"
      class="btn btn-ghost btn-sm search-trigger"
      aria-label="Search wiki"
      @click="expand"
    >
      <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M16.5 16.5 21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      Search
    </button>

    <div v-show="expanded" class="search-field">
      <label class="sr-only" :for="inputId">Search wiki</label>
      <input
        :id="inputId"
        ref="inputRef"
        v-model="query"
        type="search"
        class="input search-input"
        placeholder="Search articles…"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open && results.length > 0"
        :aria-controls="`${inputId}-listbox`"
        :aria-activedescendant="activeIndex >= 0 ? suggestionId(activeIndex) : undefined"
        @input="onInput"
        @focus="onInput"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <button
        v-if="expandable"
        type="button"
        class="btn btn-ghost btn-sm search-close"
        aria-label="Close search"
        @mousedown.prevent="collapse"
      >
        Close
      </button>

      <ul
        v-if="open && results.length"
        :id="`${inputId}-listbox`"
        role="listbox"
        class="search-results card"
      >
        <li
          v-for="(result, index) in results"
          :id="suggestionId(index)"
          :key="result.note.uri"
          role="option"
          :aria-selected="index === activeIndex"
        >
          <button
            type="button"
            class="search-result-btn"
            :class="{ 'combobox-option-active': index === activeIndex }"
            @mousedown.prevent="selectResult(index)"
          >
            <strong>{{ result.note.title }}</strong>
            <span class="snippet muted">{{ result.snippet }}</span>
          </button>
        </li>
      </ul>
      <p v-else-if="open && query.trim()" class="search-empty muted">No matches</p>
    </div>
  </div>
</template>

<style scoped>
.wiki-search {
  position: relative;
}

.search-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.search-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.search-field {
  position: relative;
}

.wiki-search.expandable.expanded .search-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: min(18rem, 70vw);
}

.search-input {
  font-size: 0.9375rem;
  padding: 0.5rem 0.875rem;
  width: 100%;
}

.search-close {
  flex-shrink: 0;
}

.search-results {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  max-height: 280px;
  overflow-y: auto;
}

.wiki-search.expandable .search-results {
  min-width: 16rem;
}

.search-result-btn {
  display: block;
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

.search-result-btn:hover {
  background: var(--pckt-bg-muted);
}

.snippet {
  display: block;
  font-size: 0.8125rem;
  margin-top: 0.15rem;
}

.search-empty {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  background: var(--pckt-bg-elevated);
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
}
</style>
