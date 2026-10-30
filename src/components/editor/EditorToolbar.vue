<script setup lang="ts">
import { ref } from 'vue'
import EditorIcon from '@/components/editor/EditorIcon.vue'
import { useOverlayDismiss } from '@/composables/useOverlayDismiss'
import {
  INSERT_TOOLS,
  PRIMARY_TOOLS,
  SECTION_TOOLS,
  formatShortcut,
  type ToolbarCommand,
  type ToolbarItem,
} from '@/lib/editor/toolbar'
import type { EditorActionId } from '@/lib/editor/actions'

defineProps<{
  active: Set<EditorActionId>
  /** Hidden while previewing, where formatting has nothing to act on. */
  disabled?: boolean
  uploading?: boolean
}>()

const emit = defineEmits<{ select: [id: ToolbarCommand] }>()

const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

useOverlayDismiss(menuRef, menuOpen, () => {
  menuOpen.value = false
})

function select(id: ToolbarCommand) {
  menuOpen.value = false
  emit('select', id)
}

function tooltip(tool: ToolbarItem) {
  const shortcut = formatShortcut(tool.shortcut)
  return shortcut ? `${tool.hint} (${shortcut})` : tool.hint
}
</script>

<template>
  <div class="tb" role="toolbar" aria-label="Formatting" :aria-disabled="disabled">
    <div class="tb-scroll">
      <div v-for="(group, index) in PRIMARY_TOOLS" :key="index" class="tb-group">
        <button
          v-for="tool in group"
          :key="tool.id"
          type="button"
          class="tb-btn"
          :class="{ 'is-active': active.has(tool.id as EditorActionId) }"
          :title="tooltip(tool)"
          :aria-label="tool.label"
          :aria-pressed="active.has(tool.id as EditorActionId)"
          :disabled="disabled"
          @mousedown.prevent
          @click="select(tool.id)"
        >
          <span v-if="tool.glyph" class="tb-glyph" :data-glyph="tool.id">{{ tool.glyph }}</span>
          <EditorIcon v-else :name="tool.icon ?? ''" />
        </button>
      </div>
    </div>

    <div ref="menuRef" class="tb-menu-wrap">
      <button
        type="button"
        class="tb-btn tb-menu-trigger"
        :class="{ 'is-active': menuOpen }"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        aria-label="Insert"
        title="Insert"
        :disabled="disabled"
        @mousedown.prevent
        @click="menuOpen = !menuOpen"
      >
        <EditorIcon name="more" />
        <span class="tb-menu-label">Insert</span>
      </button>

      <div v-if="menuOpen" class="tb-menu" role="menu">
        <button
          v-for="tool in INSERT_TOOLS"
          :key="tool.id"
          type="button"
          role="menuitem"
          class="tb-menu-item"
          :disabled="tool.id === 'upload' && uploading"
          @mousedown.prevent
          @click="select(tool.id)"
        >
          <span class="tb-menu-icon">
            <span v-if="tool.glyph" class="tb-glyph">{{ tool.glyph }}</span>
            <EditorIcon v-else :name="tool.icon ?? ''" :size="17" />
          </span>
          <span class="tb-menu-text">
            <span class="tb-menu-name">
              {{ tool.id === 'upload' && uploading ? 'Uploading…' : tool.label }}
            </span>
            <span class="tb-menu-hint">{{ tool.hint }}</span>
          </span>
        </button>

        <p class="tb-menu-heading" role="presentation">Sections</p>

        <button
          v-for="tool in SECTION_TOOLS"
          :key="tool.id"
          type="button"
          role="menuitem"
          class="tb-menu-item"
          @mousedown.prevent
          @click="select(tool.id)"
        >
          <span class="tb-menu-icon">
            <EditorIcon :name="tool.icon ?? ''" :size="17" />
          </span>
          <span class="tb-menu-text">
            <span class="tb-menu-name">{{ tool.label }}</span>
            <span class="tb-menu-hint">{{ tool.hint }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tb {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  height: var(--pw-toolbar-height, 3rem);
  padding: 0 0.375rem;
  background: var(--pckt-bg-elevated);
}

/*
 * A single scrolling row keeps every tool reachable at any width without
 * reflowing the editor, and the fade hints that there is more to the right.
 */
.tb-scroll {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  mask-image: linear-gradient(to right, transparent 0, #000 0.75rem, #000 calc(100% - 1.25rem), transparent 100%);
}

.tb-scroll::-webkit-scrollbar {
  display: none;
}

.tb-group {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
  padding-right: 0.3125rem;
  margin-right: 0.3125rem;
  border-right: 1px solid var(--pckt-border);
}

.tb-group:last-child {
  border-right: none;
}

.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  flex-shrink: 0;
  /* 2.25rem keeps the touch target at ~44px once the row padding is counted. */
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: var(--pckt-radius-sm);
  background: transparent;
  color: var(--pckt-text-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.tb-btn:hover:not(:disabled) {
  background: var(--pckt-bg-muted);
  color: var(--pckt-text);
}

.tb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tb-btn.is-active {
  background: var(--pckt-accent-soft);
  color: var(--pckt-accent);
}

.tb-btn:focus-visible {
  outline: 2px solid var(--pckt-blue);
  outline-offset: -2px;
}

.tb-glyph {
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
}

.tb-glyph[data-glyph='italic'] {
  font-style: italic;
}

.tb-glyph[data-glyph='strike'] {
  text-decoration: line-through;
}

.tb-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.tb-menu-trigger {
  width: auto;
  padding: 0 0.625rem;
}

.tb-menu-label {
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
}

@media (max-width: 600px) {
  .tb-menu-label {
    display: none;
  }

  .tb-menu-trigger {
    width: 2.25rem;
    padding: 0;
  }
}

.tb-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.375rem);
  z-index: 30;
  width: 15rem;
  max-height: min(20rem, 60vh);
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md);
}

/* Above the keyboard the menu would open off-screen, so flip it upwards. */
@media (max-width: 767px) {
  .tb-menu {
    top: auto;
    bottom: calc(100% + 0.375rem);
  }
}

.tb-menu-heading {
  margin: 0.375rem 0 0.125rem;
  padding: 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pckt-text-subtle);
  border-top: 1px solid var(--pckt-border);
  padding-top: 0.5rem;
}

.tb-menu-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: calc(var(--pckt-radius-sm) - 4px);
  background: transparent;
  color: var(--pckt-text);
  text-align: left;
  cursor: pointer;
}

.tb-menu-item:hover:not(:disabled) {
  background: var(--pckt-bg-muted);
}

.tb-menu-item:disabled {
  opacity: 0.5;
  cursor: progress;
}

.tb-menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  color: var(--pckt-text-muted);
}

.tb-menu-text {
  display: grid;
  min-width: 0;
}

.tb-menu-name {
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 600;
}

.tb-menu-hint {
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  color: var(--pckt-text-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
