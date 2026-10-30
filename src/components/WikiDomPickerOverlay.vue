<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { EditorView } from '@codemirror/view'
import {
  formatPickPosition,
  type WikiDomPick,
  type WikiDomPickAction,
} from '@/lib/wiki-dom-picker'
import { refreshBlockPick, resolvePickAtCoords } from '@/lib/silkdown-picker'

const props = defineProps<{
  active: boolean
  view: EditorView | null
  source: string
}>()

const emit = defineEmits<{
  pick: [pick: WikiDomPick]
  action: [action: WikiDomPickAction, pick: WikiDomPick]
  close: []
}>()

const hovered = ref<WikiDomPick | null>(null)
const selected = ref<WikiDomPick | null>(null)

const highlight = computed(() => selected.value ?? hovered.value)

const highlightStyle = computed(() => {
  if (!highlight.value) return undefined
  const { rect } = highlight.value
  return {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
})

const labelStyle = computed(() => {
  if (!highlight.value) return undefined
  const { rect } = highlight.value
  return {
    top: `${Math.max(8, rect.top - 28)}px`,
    left: `${rect.left}px`,
  }
})

function refreshRects() {
  const view = props.view
  if (!view) return

  if (hovered.value) {
    hovered.value = refreshBlockPick(view, hovered.value)
  }
  if (selected.value) {
    selected.value = refreshBlockPick(view, selected.value)
  }
}

function onPointerMove(event: PointerEvent) {
  if (!props.active || !props.view) return

  const pick = resolvePickAtCoords(props.view, event.clientX, event.clientY)
  hovered.value = pick
}

function onPointerDown(event: PointerEvent) {
  if (!props.active || !props.view) return
  if ((event.target as Element).closest('.wiki-dom-picker-panel')) return

  event.preventDefault()
  event.stopPropagation()

  const pick = resolvePickAtCoords(props.view, event.clientX, event.clientY)
  if (!pick) return

  selected.value = pick
  hovered.value = pick
  emit('pick', pick)
}

function onKeydown(event: KeyboardEvent) {
  if (!props.active) return
  if (event.key === 'Escape') {
    event.preventDefault()
    if (selected.value) {
      selected.value = null
      return
    }
    emit('close')
  }
}

function runAction(action: WikiDomPickAction) {
  if (!selected.value) return
  emit('action', action, selected.value)
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      document.body.classList.add('wiki-dom-picker-active')
      window.addEventListener('pointermove', onPointerMove, true)
      window.addEventListener('pointerdown', onPointerDown, true)
      window.addEventListener('keydown', onKeydown, true)
      window.addEventListener('scroll', refreshRects, true)
      window.addEventListener('resize', refreshRects)
      props.view?.scrollDOM.addEventListener('scroll', refreshRects)
    } else {
      document.body.classList.remove('wiki-dom-picker-active')
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeydown, true)
      window.removeEventListener('scroll', refreshRects, true)
      window.removeEventListener('resize', refreshRects)
      props.view?.scrollDOM.removeEventListener('scroll', refreshRects)
      hovered.value = null
      selected.value = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  document.body.classList.remove('wiki-dom-picker-active')
  window.removeEventListener('pointermove', onPointerMove, true)
  window.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('scroll', refreshRects, true)
  window.removeEventListener('resize', refreshRects)
  props.view?.scrollDOM.removeEventListener('scroll', refreshRects)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      class="wiki-dom-picker-overlay"
      aria-live="polite"
    >
      <div
        v-if="highlight"
        class="wiki-dom-picker-highlight"
        :class="{ selected: !!selected }"
        :style="highlightStyle"
      />

      <div
        v-if="highlight"
        class="wiki-dom-picker-label"
        :style="labelStyle"
      >
        <span class="wiki-dom-picker-tag">{{ highlight.tagName }}</span>
        <span v-if="highlight.className" class="wiki-dom-picker-class">{{ highlight.className }}</span>
        <span v-if="highlight.blockType" class="wiki-dom-picker-block">{{ highlight.blockType }}</span>
      </div>

      <div v-if="active && !selected" class="wiki-dom-picker-hint">
        Magic cursor — click a section to edit. Press Esc to exit.
      </div>

      <aside
        v-if="selected"
        class="wiki-dom-picker-panel card"
        role="dialog"
        aria-label="Selected wiki section"
      >
        <header class="wiki-dom-picker-panel-header">
          <h3 class="wiki-dom-picker-panel-title">Selected section</h3>
          <button
            type="button"
            class="wiki-dom-picker-close"
            aria-label="Clear selection"
            @click="selected = null"
          >
            ×
          </button>
        </header>

        <dl class="wiki-dom-picker-meta">
          <div>
            <dt>Block path</dt>
            <dd><code>{{ selected.domPath }}</code></dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd><code>{{ formatPickPosition(selected.rect) }}</code></dd>
          </div>
          <div v-if="selected.textPreview">
            <dt>Text</dt>
            <dd>{{ selected.textPreview }}</dd>
          </div>
        </dl>

        <div class="wiki-dom-picker-actions">
          <button type="button" class="btn btn-sm" @click="runAction('edit')">
            Edit text
          </button>
          <button type="button" class="btn btn-sm btn-secondary" @click="runAction('wikilink')">
            Add wikilink
          </button>
          <button type="button" class="btn btn-sm btn-secondary" @click="runAction('source')">
            Add link
          </button>
          <button type="button" class="btn btn-sm btn-secondary" @click="runAction('image')">
            Add image
          </button>
          <button type="button" class="btn btn-sm btn-secondary" @click="runAction('bold')">
            Bold
          </button>
        </div>

        <button type="button" class="wiki-dom-picker-done" @click="emit('close')">
          Done picking
        </button>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.wiki-dom-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  pointer-events: none;
}

.wiki-dom-picker-highlight {
  position: fixed;
  box-sizing: border-box;
  border: 2px solid var(--pckt-blue);
  border-radius: 2px;
  background: color-mix(in srgb, var(--pckt-blue) 10%, transparent);
  pointer-events: none;
  transition: top 0.05s ease, left 0.05s ease, width 0.05s ease, height 0.05s ease;
}

.wiki-dom-picker-highlight.selected {
  border-color: var(--pckt-red);
  background: color-mix(in srgb, var(--pckt-red) 8%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--pckt-red) 25%, transparent);
}

.wiki-dom-picker-label {
  position: fixed;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  max-width: min(24rem, calc(100vw - 1rem));
  padding: 0.2rem 0.5rem;
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-text);
  color: var(--pckt-bg-elevated);
  font-family: var(--pckt-font-mono);
  font-size: 0.6875rem;
  line-height: 1.3;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wiki-dom-picker-tag {
  font-weight: 700;
  color: #9cdcfe;
}

.wiki-dom-picker-class {
  color: #dcdcaa;
}

.wiki-dom-picker-block {
  color: #c586c0;
}

.wiki-dom-picker-hint {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pckt-text) 92%, transparent);
  color: var(--pckt-bg-elevated);
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.wiki-dom-picker-panel {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  width: min(22rem, calc(100vw - 2rem));
  max-height: min(70dvh, 32rem);
  overflow: auto;
  padding: 0.875rem 1rem 1rem;
  pointer-events: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
}

.wiki-dom-picker-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.wiki-dom-picker-panel-title {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 800;
}

.wiki-dom-picker-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: var(--pckt-radius-sm);
  background: transparent;
  color: var(--pckt-text-muted);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.wiki-dom-picker-close:hover {
  background: var(--pckt-bg-muted);
  color: var(--pckt-text);
}

.wiki-dom-picker-meta {
  margin: 0 0 0.875rem;
  display: grid;
  gap: 0.625rem;
}

.wiki-dom-picker-meta dt {
  margin: 0 0 0.15rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pckt-text-muted);
}

.wiki-dom-picker-meta dd {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  word-break: break-word;
}

.wiki-dom-picker-meta code {
  display: block;
  padding: 0.375rem 0.5rem;
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-muted);
  font-family: var(--pckt-font-mono);
  font-size: 0.6875rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.wiki-dom-picker-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
}

.wiki-dom-picker-done {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-muted);
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--pckt-text);
  cursor: pointer;
}

.wiki-dom-picker-done:hover {
  background: var(--pckt-bg);
}
</style>

<style>
body.wiki-dom-picker-active {
  cursor: crosshair !important;
}

body.wiki-dom-picker-active .cm-editor,
body.wiki-dom-picker-active .cm-editor * {
  cursor: crosshair !important;
}

body.wiki-dom-picker-active .cm-block-drag-gutter .wiki-editor-block-handle {
  pointer-events: none !important;
  opacity: 0 !important;
}
</style>
