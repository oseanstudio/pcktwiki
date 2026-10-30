<script setup lang="ts">
import {
  EDITOR_TOOLBAR_ACTIONS,
  type EditorInsertAction,
  type EditorInsertResult,
} from '@/lib/editor-insert'
import type { EditorTarget } from '@/lib/editor-target'
import WikiEditorToolbarIcon from '@/components/WikiEditorToolbarIcon.vue'

const props = withDefaults(
  defineProps<{
    target: EditorTarget | null
    compact?: boolean
    embedded?: boolean
  }>(),
  {
    compact: false,
    embedded: false,
  },
)

const emit = defineEmits<{
  beforeApply: []
  applied: [result: EditorInsertResult]
}>()

const actions = EDITOR_TOOLBAR_ACTIONS

function run(action: EditorInsertAction) {
  if (!props.target) return
  emit('beforeApply')
  const result = props.target.applyInsert(action)
  emit('applied', result)
}

function dividerAfter(action: EditorInsertAction) {
  return action === 'quote' || action === 'infobox'
}
</script>

<template>
  <div
    class="wiki-editor-toolbar"
    :class="{ compact, embedded }"
    role="toolbar"
    aria-label="Article formatting"
  >
    <template v-for="action in actions" :key="action.id">
      <button
        type="button"
        class="wiki-editor-toolbar-btn"
        :title="action.title"
        :aria-label="action.title"
        @click="run(action.id)"
      >
        <WikiEditorToolbarIcon :action="action.id" />
      </button>
      <span
        v-if="dividerAfter(action.id)"
        class="wiki-editor-toolbar-divider"
        aria-hidden="true"
      />
    </template>
  </div>
</template>

<style scoped>
.wiki-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.125rem;
  padding: 0.3125rem 0.375rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-muted);
}

.wiki-editor-toolbar.embedded {
  margin: 0;
  border: none;
  border-bottom: 1px solid var(--pckt-border);
  border-radius: 0;
  background: color-mix(in srgb, var(--pckt-bg-muted) 88%, var(--pckt-bg-elevated));
}

.wiki-editor-toolbar.compact {
  gap: 0.0625rem;
  padding: 0.25rem 0.3125rem;
}

.wiki-editor-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--pckt-radius-sm);
  background: transparent;
  color: var(--pckt-text-muted);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.wiki-editor-toolbar.compact .wiki-editor-toolbar-btn {
  width: 1.625rem;
  height: 1.625rem;
}

.wiki-editor-toolbar-btn:hover {
  border-color: var(--pckt-border);
  background: var(--pckt-bg-elevated);
  color: var(--pckt-text);
}

.wiki-editor-toolbar-btn:active {
  background: color-mix(in srgb, var(--pckt-red) 8%, var(--pckt-bg-elevated));
  color: var(--pckt-red);
}

.wiki-editor-toolbar-divider {
  width: 1px;
  height: 1.25rem;
  margin-inline: 0.125rem;
  background: var(--pckt-border);
  flex-shrink: 0;
}
</style>
