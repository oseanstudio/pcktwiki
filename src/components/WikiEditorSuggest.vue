<script setup lang="ts">
import type { SuggestCandidate } from '@/lib/editor/suggest'

defineProps<{
  items: SuggestCandidate[]
  index: number
  top: number
  left: number
}>()

const emit = defineEmits<{
  pick: [item: SuggestCandidate]
  hover: [index: number]
}>()
</script>

<template>
  <ul
    class="wiki-suggest"
    role="listbox"
    aria-label="Page suggestions"
    :style="{ top: `${top}px`, left: `${left}px` }"
  >
    <li
      v-for="(item, i) in items"
      :key="`${item.value}-${i}`"
      role="option"
      class="wiki-suggest-item"
      :class="{ 'is-active': i === index, 'is-new': item.isNew }"
      :aria-selected="i === index"
      @mousedown.prevent="emit('pick', item)"
      @mouseenter="emit('hover', i)"
    >
      <span class="wiki-suggest-label">{{ item.label }}</span>
      <span v-if="item.detail" class="wiki-suggest-detail">{{ item.detail }}</span>
    </li>
  </ul>
</template>

<style scoped>
.wiki-suggest {
  position: absolute;
  z-index: 20;
  min-width: 12rem;
  max-width: min(22rem, calc(100vw - 2rem));
  max-height: 14rem;
  margin: 0;
  padding: 0.25rem;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md, 0 8px 24px color-mix(in srgb, var(--pckt-text) 12%, transparent));
}

.wiki-suggest-item {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  padding: 0.5rem 0.625rem;
  border-radius: calc(var(--pckt-radius-sm) - 2px);
  cursor: pointer;
}

.wiki-suggest-item.is-active,
.wiki-suggest-item:hover {
  background: var(--pckt-accent-soft);
}

.wiki-suggest-label {
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--pckt-text);
}

.wiki-suggest-item.is-new .wiki-suggest-label {
  color: var(--pckt-accent);
}

.wiki-suggest-detail {
  font-family: var(--pckt-font-mono);
  font-size: 0.75rem;
  color: var(--pckt-text-muted);
}
</style>
