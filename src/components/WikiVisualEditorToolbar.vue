<script setup lang="ts">
import type { EditorInsertAction, EditorInsertResult } from '@/lib/editor-insert'
import type { EditorTarget } from '@/lib/editor-target'
import WikiEditorToolbarIcon from '@/components/WikiEditorToolbarIcon.vue'
import WikiToolbarDropdown from '@/components/WikiToolbarDropdown.vue'

const props = defineProps<{
  target: EditorTarget | null
  canUndo: boolean
  canRedo: boolean
  sourceMode: boolean
  pickMode: boolean
}>()

const emit = defineEmits<{
  beforeApply: []
  applied: [result: EditorInsertResult]
  undo: []
  redo: []
  togglePick: []
}>()

interface ToolButton {
  id: EditorInsertAction
  label: string
  hint: string
}

const formatTools: ToolButton[] = [
  { id: 'bold', label: 'Bold', hint: 'Make text bold' },
  { id: 'italic', label: 'Italic', hint: 'Make text italic' },
]

const blockTools: ToolButton[] = [
  { id: 'heading', label: 'Heading', hint: 'Add a big section heading' },
  { id: 'subheading', label: 'Subheading', hint: 'Add a smaller heading' },
  { id: 'bullet', label: 'Bulleted list', hint: 'Start a bulleted list' },
  { id: 'numbered', label: 'Numbered list', hint: 'Start a numbered list' },
  { id: 'quote', label: 'Quote', hint: 'Add a block quote' },
]

const insertTools: ToolButton[] = [
  { id: 'wikilink', label: 'Link to a page', hint: 'Link to another page in this wiki' },
  { id: 'source', label: 'Link to a website', hint: 'Add a link to an external site' },
  { id: 'fork', label: 'Link to another wiki', hint: "Link to someone else's wiki" },
  { id: 'image', label: 'Image', hint: 'Add an image by URL' },
  { id: 'infobox', label: 'Info box', hint: 'Add a fact box in the sidebar' },
  { id: 'category', label: 'Category tag', hint: 'File this page under a category' },
]

function run(action: EditorInsertAction) {
  if (!props.target) return
  emit('beforeApply')
  const result = props.target.applyInsert(action)
  emit('applied', result)
}
</script>

<template>
  <div class="pw-toolbar" role="toolbar" aria-label="Formatting tools">
    <div class="pw-toolbar-group">
      <button
        type="button"
        class="pw-tool pw-tool-icon"
        title="Undo"
        aria-label="Undo"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <path fill="currentColor" d="M7.5 5.5 3 10l4.5 4.5V12h5.5a4 4 0 1 0 0-8H7.5V5.5z" />
        </svg>
      </button>
      <button
        type="button"
        class="pw-tool pw-tool-icon"
        title="Redo"
        aria-label="Redo"
        :disabled="!canRedo"
        @click="emit('redo')"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <path fill="currentColor" d="M12.5 5.5V8H7a4 4 0 1 0 0 8h5.5v2.5L17 10l-4.5-4.5z" />
        </svg>
      </button>
    </div>

    <span class="pw-toolbar-divider" aria-hidden="true" />

    <div class="pw-toolbar-group">
      <button
        v-for="tool in formatTools"
        :key="tool.id"
        type="button"
        class="pw-tool pw-tool-icon"
        :title="tool.hint"
        :aria-label="tool.hint"
        @click="run(tool.id)"
      >
        <WikiEditorToolbarIcon :action="tool.id" />
      </button>
    </div>

    <span class="pw-toolbar-divider" aria-hidden="true" />

    <div class="pw-toolbar-group">
      <button
        v-for="tool in blockTools"
        :key="tool.id"
        type="button"
        class="pw-tool"
        :title="tool.hint"
        :aria-label="tool.hint"
        @click="run(tool.id)"
      >
        <WikiEditorToolbarIcon :action="tool.id" />
        <span class="pw-tool-label">{{ tool.label }}</span>
      </button>
    </div>

    <span class="pw-toolbar-divider" aria-hidden="true" />

    <div class="pw-toolbar-group">
      <WikiToolbarDropdown label="Insert" title="Insert a link, image or more">
        <button
          v-for="tool in insertTools"
          :key="tool.id"
          type="button"
          class="wiki-toolbar-menu-item"
          role="menuitem"
          :title="tool.hint"
          @click="run(tool.id)"
        >
          <WikiEditorToolbarIcon :action="tool.id" />
          <span class="pw-menu-text">
            <span class="pw-menu-label">{{ tool.label }}</span>
            <span class="pw-menu-hint">{{ tool.hint }}</span>
          </span>
        </button>
      </WikiToolbarDropdown>
    </div>

    <div class="pw-toolbar-spacer" />

    <div v-if="!sourceMode" class="pw-toolbar-group">
      <button
        type="button"
        class="pw-tool pw-tool-pick"
        :class="{ 'pw-tool-active': pickMode }"
        title="Point at any part of the page to jump straight to editing it"
        :aria-pressed="pickMode"
        @click="emit('togglePick')"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10.8 2.2a.8.8 0 0 0-1.1 1.1l.5.5-6.2 6.2a2.2 2.2 0 0 0 3.1 3.1l6.2-6.2.5.5a.8.8 0 1 0 1.1-1.1l-1.2-1.2 1.6-1.6 1.2 1.2a.8.8 0 1 0 1.1-1.1l-4.4-4.4a.8.8 0 0 0-1.1 0L10.8 2.2Z"
          />
          <circle cx="14.8" cy="5.2" r="1.1" fill="currentColor" />
        </svg>
        <span class="pw-tool-label">Point &amp; edit</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pw-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--pckt-bg-elevated);
}

.pw-toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.1875rem;
}

.pw-toolbar-divider {
  align-self: stretch;
  width: 1px;
  margin: 0.25rem 0.25rem;
  background: var(--pckt-border);
}

.pw-toolbar-spacer {
  flex: 1 1 auto;
}

.pw-tool {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.125rem;
  padding: 0 0.625rem;
  border: 1px solid transparent;
  border-radius: var(--pckt-radius-pill);
  background: transparent;
  color: var(--pckt-text-muted);
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}

.pw-tool-icon {
  padding: 0;
  width: 2.125rem;
  justify-content: center;
}

.pw-tool:hover:not(:disabled) {
  background: var(--pckt-bg-muted);
  color: var(--pckt-text);
}

.pw-tool:active:not(:disabled) {
  transform: scale(0.94);
  background: var(--pckt-accent-soft);
  color: var(--pckt-accent);
}

.pw-tool:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--pckt-blue) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pckt-blue) 20%, transparent);
}

.pw-tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pw-tool-label {
  white-space: nowrap;
}

.pw-tool-pick.pw-tool-active {
  background: color-mix(in srgb, var(--pckt-blue) 14%, transparent);
  color: var(--pckt-blue-active);
}

.pw-menu-text {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
}

.pw-menu-label {
  font-weight: 600;
  color: var(--pckt-text);
}

.pw-menu-hint {
  font-size: 0.75rem;
  color: var(--pckt-text-muted);
}

@media (max-width: 768px) {
  .pw-tool-label {
    display: none;
  }

  .pw-tool {
    padding: 0;
    width: 2.125rem;
    justify-content: center;
  }

  .pw-menu-label,
  .pw-menu-hint {
    display: block;
  }
}
</style>
