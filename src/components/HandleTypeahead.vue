<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import {
  searchHandleSuggestions,
  type HandleSuggestion,
} from '@/lib/atproto/handle-typeahead'
import { useComboboxKeyboard } from '@/composables/useComboboxKeyboard'

const model = defineModel<string>({ required: true })

const emit = defineEmits<{
  /** Fired when a suggestion is chosen via keyboard (Enter). Parent may submit immediately. */
  select: [handle: string]
}>()

const props = withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    disabled?: boolean
    inputClass?: string
    gradientBorder?: boolean
  }>(),
  {
    id: 'handle',
    placeholder: '@you.bsky.social',
    inputClass: 'input',
    gradientBorder: false,
  },
)

const inputRef = ref<HTMLInputElement | null>(null)

const open = ref(false)
const loading = ref(false)
const suggestions = ref<HandleSuggestion[]>([])
const activeIndex = ref(-1)
const focused = ref(false)
const chosenFromList = ref(false)
let pickingSuggestion = false

const showGradientBorder = computed(
  () => props.gradientBorder && (focused.value || chosenFromList.value),
)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0

/** When true, Enter was pressed while a search is in flight — accept the first result. */
let submitFirstWhenReady = false

async function runSearch(value: string) {
  const id = ++requestId
  loading.value = true
  open.value = true
  try {
    const results = await searchHandleSuggestions(value)
    if (id !== requestId) return
    suggestions.value = results
    open.value = true
    // Pre-highlight the top match so Enter selects it without arrow keys.
    activeIndex.value = results.length > 0 ? 0 : -1
    if (submitFirstWhenReady) {
      submitFirstWhenReady = false
      if (results[0]) {
        void selectSuggestion(results[0], { submit: true })
      } else {
        // No matches — proceed with whatever the user typed.
        emit('select', model.value)
      }
    }
  } catch {
    if (id !== requestId) return
    suggestions.value = []
    activeIndex.value = -1
    if (submitFirstWhenReady) {
      submitFirstWhenReady = false
      emit('select', model.value)
    }
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(
  () => model.value,
  (value) => {
    if (!pickingSuggestion) {
      chosenFromList.value = false
    }

    clearTimeout(debounceTimer)
    debounceTimer = undefined
    activeIndex.value = -1
    submitFirstWhenReady = false

    const q = value.trim().replace(/^@/, '')
    if (q.length < 2) {
      suggestions.value = []
      open.value = false
      loading.value = false
      return
    }

    loading.value = true
    open.value = true

    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      void runSearch(value)
    }, 250)
  },
)

async function selectSuggestion(
  suggestion: HandleSuggestion,
  options?: { submit?: boolean },
) {
  pickingSuggestion = true
  submitFirstWhenReady = false
  model.value = suggestion.handle
  chosenFromList.value = true
  suggestions.value = []
  open.value = false
  activeIndex.value = -1
  await nextTick()
  pickingSuggestion = false
  if (options?.submit) {
    emit('select', suggestion.handle)
  }
}

function onFocus() {
  focused.value = true
  if (model.value.trim().replace(/^@/, '').length >= 2) {
    open.value = suggestions.value.length > 0 || loading.value
  }
}

function onBlur(event: FocusEvent) {
  const root = event.currentTarget as HTMLElement
  const next = event.relatedTarget as Node | null
  if (next && root.closest('.handle-typeahead')?.contains(next)) {
    return
  }
  focused.value = false
  open.value = false
  activeIndex.value = -1
  submitFirstWhenReady = false
}

function suggestionId(index: number): string {
  return `${props.id}-suggestion-${index}`
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })

const { onKeydown } = useComboboxKeyboard(
  open,
  activeIndex,
  toRef(() => suggestions.value.length),
  {
    onSelect(index) {
      const suggestion = suggestions.value[index]
      if (suggestion) void selectSuggestion(suggestion, { submit: true })
    },
    onEnterWithoutSelection() {
      // Prefer the top suggestion over the raw typed handle.
      if (suggestions.value.length > 0) {
        void selectSuggestion(suggestions.value[0], { submit: true })
        return true
      }
      // Still searching — flush debounce if needed, then accept the first match.
      if (loading.value || open.value) {
        submitFirstWhenReady = true
        if (debounceTimer) {
          clearTimeout(debounceTimer)
          debounceTimer = undefined
          void runSearch(model.value)
        }
        return true
      }
      // No suggestions to pick — let the form submit the typed value.
      return false
    },
    onClose() {
      open.value = false
      submitFirstWhenReady = false
    },
  },
  suggestionId,
)
</script>

<template>
  <div class="handle-typeahead">
    <label class="sr-only" :for="id">Handle</label>
    <div class="handle-typeahead-field">
      <div v-if="gradientBorder" class="handle-input-shell">
        <div
          class="handle-input-frame"
          :class="{ 'is-gradient': showGradientBorder }"
          aria-hidden="true"
        />
        <input
          ref="inputRef"
          :id="id"
          v-model="model"
          :class="inputClass"
          type="text"
          :placeholder="placeholder"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="open && (suggestions.length > 0 || loading)"
          :aria-controls="`${id}-listbox`"
          :aria-activedescendant="activeIndex >= 0 ? suggestionId(activeIndex) : undefined"
          :disabled="disabled"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeydown"
        />
      </div>
      <input
        v-else
        ref="inputRef"
        :id="id"
        v-model="model"
        :class="inputClass"
        type="text"
        :placeholder="placeholder"
        autocomplete="username"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open && (suggestions.length > 0 || loading)"
        :aria-controls="`${id}-listbox`"
        :aria-activedescendant="activeIndex >= 0 ? suggestionId(activeIndex) : undefined"
        :disabled="disabled"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
    </div>

    <ul
      v-if="open && (suggestions.length || loading)"
      :id="`${id}-listbox`"
      role="listbox"
      class="suggestions card"
    >
      <li v-if="loading && !suggestions.length" class="suggestion-status muted">
        Searching…
      </li>
      <li
        v-for="(suggestion, index) in suggestions"
        :id="suggestionId(index)"
        :key="suggestion.did"
        role="option"
        :aria-selected="index === activeIndex"
      >
        <button
          type="button"
          class="suggestion-btn"
          :class="{ 'combobox-option-active': index === activeIndex }"
          @mousedown.prevent="selectSuggestion(suggestion)"
        >
          <img
            v-if="suggestion.avatar"
            :src="suggestion.avatar"
            :alt="''"
            class="suggestion-avatar"
            loading="lazy"
          />
          <span v-else class="suggestion-avatar suggestion-avatar-fallback" aria-hidden="true">
            {{ suggestion.handle.slice(0, 1).toUpperCase() }}
          </span>
          <span class="suggestion-text">
            <span class="suggestion-primary">
              {{ suggestion.displayName?.trim() || `@${suggestion.handle}` }}
            </span>
            <span
              v-if="suggestion.displayName?.trim()"
              class="suggestion-handle muted"
            >
              @{{ suggestion.handle }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else-if="open && model.trim().replace(/^@/, '').length >= 2 && !loading" class="suggestion-empty muted">
      No matching handles
    </p>
  </div>
</template>

<style scoped>
.handle-typeahead {
  --handle-shell-border-width: 2px;
  position: relative;
}

/*
 * Field wrapper keeps the @ prefix and gradient shell positioned against the
 * input even when a parent sets the typeahead root to position: static so
 * suggestions can span a wider ancestor (e.g. sign-in field + button).
 */
.handle-typeahead-field {
  position: relative;
}

.handle-typeahead-field > input {
  width: 100%;
}

.handle-input-shell {
  --handle-shell-radius: var(--pckt-radius);
  position: relative;
  padding: var(--handle-shell-border-width);
  border-radius: var(--handle-shell-radius);
  overflow: hidden;
}

.handle-input-frame {
  position: absolute;
  inset: 0;
  background: var(--pckt-border-strong);
  transition: background 0.15s ease;
}

.handle-input-frame.is-gradient {
  background: linear-gradient(
    to right,
    var(--pckt-red),
    var(--pckt-blue),
    var(--pckt-green),
    var(--pckt-yellow)
  );
}

.handle-input-shell input {
  position: relative;
  z-index: 1;
  width: 100%;
  border-color: transparent;
  box-shadow: none;
  border-radius: calc(var(--handle-shell-radius) - var(--handle-shell-border-width));
}

.handle-input-shell input:hover,
.handle-input-shell input:focus {
  border-color: transparent;
  box-shadow: none;
}

.suggestions {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  max-height: 280px;
  overflow-y: auto;
  text-align: left;
}

.suggestion-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
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

.suggestion-btn:hover {
  background: var(--pckt-bg-muted);
}

.suggestion-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.suggestion-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--pckt-bg-subtle);
  color: var(--pckt-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

.suggestion-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.suggestion-primary {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion-handle {
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion-status,
.suggestion-empty {
  margin: 0.35rem 0.75rem;
  font-size: 0.875rem;
}
</style>
