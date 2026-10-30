<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
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
import type { WikiImageMode } from '@/types/lichen'

const props = defineProps<{
  active: Set<EditorActionId>
  canUndo?: boolean
  canRedo?: boolean
  uploading?: boolean
  disabled?: boolean
  /** False for talk pages — article subheader links aren't available there. */
  canSubheaderLinks?: boolean
  /** Wiki image policy: 'any' keeps the upload tools, others hide them. */
  imageMode?: WikiImageMode
}>()

const emit = defineEmits<{
  select: [id: ToolbarCommand]
  undo: []
  redo: []
}>()

/** New blob uploads are only offered when the wiki's policy allows them. */
const primaryGroups = computed<ToolbarItem[][]>(() =>
  props.imageMode && props.imageMode !== 'any'
    ? PRIMARY_TOOLS.map((group) => group.filter((tool) => tool.id !== 'upload'))
    : PRIMARY_TOOLS,
)

const insertTools = computed<ToolbarItem[]>(() =>
  props.imageMode && props.imageMode !== 'any'
    ? INSERT_TOOLS.filter((tool) => tool.id !== 'image')
    : INSERT_TOOLS,
)

const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const menuStyle = ref<Record<string, string>>({})

const tip = ref<{ label: string; left: number; top: number } | null>(null)
let tipTimer: ReturnType<typeof setTimeout> | undefined

useOverlayDismiss([triggerRef, menuRef], menuOpen, () => {
  menuOpen.value = false
})

function select(id: ToolbarCommand) {
  menuOpen.value = false
  hideTip()
  emit('select', id)
}

function tipLabel(tool: ToolbarItem) {
  const shortcut = formatShortcut(tool.shortcut)
  return shortcut ? `${tool.label} (${shortcut})` : tool.label
}

function showTip(event: Event, label: string) {
  clearTimeout(tipTimer)
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  tipTimer = setTimeout(() => {
    tip.value = {
      label,
      left: rect.left + rect.width / 2,
      top: rect.top,
    }
  }, 280)
}

function hideTip() {
  clearTimeout(tipTimer)
  tip.value = null
}

/** Prefer the visual viewport so mobile keyboards don't count as free space. */
function viewportBox() {
  const vv = window.visualViewport
  if (vv) {
    return {
      top: vv.offsetTop,
      left: vv.offsetLeft,
      width: vv.width,
      bottom: vv.offsetTop + vv.height,
      height: vv.height,
    }
  }
  return {
    top: 0,
    left: 0,
    width: window.innerWidth,
    bottom: window.innerHeight,
    height: window.innerHeight,
  }
}

function positionMenu() {
  const trigger = triggerRef.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const vp = viewportBox()
  const gap = 6
  const edge = 12
  const width = Math.min(18 * 16, vp.width - edge * 2)
  let left = rect.right - width
  left = Math.max(vp.left + edge, Math.min(left, vp.left + vp.width - width - edge))

  const spaceBelow = vp.bottom - rect.bottom - gap - edge
  const spaceAbove = rect.top - vp.top - gap - edge

  // Mobile + inline editors pin the toolbar near the bottom. Space "below"
  // is often the keyboard inset — never open into it.
  const inLowerHalf = rect.top > vp.top + vp.height * 0.45
  const openBelow = !inLowerHalf && spaceBelow > spaceAbove && spaceBelow >= 160

  if (openBelow) {
    const top = rect.bottom + gap
    const maxHeight = Math.max(80, vp.bottom - edge - top)
    menuStyle.value = {
      top: `${top}px`,
      bottom: 'auto',
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    }
  } else {
    // Anchor to the trigger with `bottom` so short menus hug the button
    // and tall ones grow upward (then scroll inside max-height).
    const maxHeight = Math.max(80, spaceAbove)
    menuStyle.value = {
      top: 'auto',
      bottom: `${window.innerHeight - rect.top + gap}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    }
  }
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

watch(menuOpen, async (open) => {
  if (!open) return
  await nextTick()
  positionMenu()
  // Re-measure after layout so max-height matches the painted menu.
  requestAnimationFrame(positionMenu)
})

function onViewportChange() {
  if (!menuOpen.value) return
  positionMenu()
}

function bindViewportListeners(open: boolean) {
  const vv = window.visualViewport
  if (open) {
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    vv?.addEventListener('resize', onViewportChange)
    vv?.addEventListener('scroll', onViewportChange)
  } else {
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('scroll', onViewportChange, true)
    vv?.removeEventListener('resize', onViewportChange)
    vv?.removeEventListener('scroll', onViewportChange)
  }
}

watch(menuOpen, (open) => {
  bindViewportListeners(open)
})

onUnmounted(() => {
  clearTimeout(tipTimer)
  bindViewportListeners(false)
})
</script>

<template>
  <div class="wet" role="toolbar" aria-label="Formatting" :aria-disabled="disabled" @mouseleave="hideTip">
    <div class="wet-scroll">
      <div class="wet-group">
        <button
          type="button"
          class="wet-btn"
          aria-label="Undo"
          :disabled="disabled || !canUndo"
          @mousedown.prevent
          @mouseenter="showTip($event, 'Undo')"
          @mouseleave="hideTip"
          @focus="showTip($event, 'Undo')"
          @blur="hideTip"
          @click="emit('undo')"
        >
          <EditorIcon name="undo" />
        </button>
        <button
          type="button"
          class="wet-btn"
          aria-label="Redo"
          :disabled="disabled || !canRedo"
          @mousedown.prevent
          @mouseenter="showTip($event, 'Redo')"
          @mouseleave="hideTip"
          @focus="showTip($event, 'Redo')"
          @blur="hideTip"
          @click="emit('redo')"
        >
          <EditorIcon name="redo" />
        </button>
      </div>

      <div v-for="(group, index) in primaryGroups" :key="index" class="wet-group">
        <button
          v-for="tool in group"
          :key="tool.id"
          type="button"
          class="wet-btn"
          :class="{
            'is-active': active.has(tool.id as EditorActionId),
            'is-uploading': tool.id === 'upload' && uploading,
          }"
          :aria-label="tool.id === 'upload' && uploading ? 'Uploading image' : tool.label"
          :aria-pressed="active.has(tool.id as EditorActionId)"
          :aria-busy="tool.id === 'upload' ? uploading : undefined"
          :disabled="disabled || (tool.id === 'upload' && uploading)"
          @mousedown.prevent
          @mouseenter="showTip($event, tool.id === 'upload' && uploading ? 'Uploading…' : tipLabel(tool))"
          @mouseleave="hideTip"
          @focus="showTip($event, tool.id === 'upload' && uploading ? 'Uploading…' : tipLabel(tool))"
          @blur="hideTip"
          @click="select(tool.id)"
        >
          <span
            v-if="tool.id === 'upload' && uploading"
            class="wet-upload-spinner"
            aria-hidden="true"
          />
          <span v-else-if="tool.glyph" class="wet-glyph" :data-glyph="tool.id">{{ tool.glyph }}</span>
          <EditorIcon v-else :name="tool.icon ?? ''" />
        </button>
      </div>
    </div>

    <div class="wet-menu-wrap">
      <button
        ref="triggerRef"
        type="button"
        class="wet-btn wet-menu-trigger"
        :class="{ 'is-active': menuOpen }"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        aria-label="Insert"
        :disabled="disabled"
        @mousedown.prevent
        @click="toggleMenu"
      >
        <EditorIcon name="more" />
        <span class="wet-menu-label">Insert</span>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        ref="menuRef"
        class="wet-menu"
        role="menu"
        :style="menuStyle"
      >
        <button
          v-for="tool in insertTools"
          :key="tool.id"
          type="button"
          role="menuitem"
          class="wet-menu-item"
          :disabled="
            (tool.id === 'upload' && uploading) ||
            (tool.id === 'subheaderLinks' && !canSubheaderLinks)
          "
          @mousedown.prevent
          @click="select(tool.id)"
        >
          <span class="wet-menu-icon">
            <span v-if="tool.glyph" class="wet-glyph">{{ tool.glyph }}</span>
            <EditorIcon v-else :name="tool.icon ?? ''" :size="17" />
          </span>
          <span class="wet-menu-text">
            <span class="wet-menu-name">
              {{ tool.id === 'upload' && uploading ? 'Uploading…' : tool.label }}
            </span>
            <span class="wet-menu-hint">
              {{
                tool.id === 'subheaderLinks' && !canSubheaderLinks
                  ? 'Not available on talk pages'
                  : tool.hint
              }}
            </span>
          </span>
        </button>

        <p class="wet-menu-heading" role="presentation">Sections</p>

        <button
          v-for="tool in SECTION_TOOLS"
          :key="tool.id"
          type="button"
          role="menuitem"
          class="wet-menu-item"
          @mousedown.prevent
          @click="select(tool.id)"
        >
          <span class="wet-menu-icon">
            <EditorIcon :name="tool.icon ?? ''" :size="17" />
          </span>
          <span class="wet-menu-text">
            <span class="wet-menu-name">{{ tool.label }}</span>
            <span class="wet-menu-hint">{{ tool.hint }}</span>
          </span>
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="tip"
        class="wet-tip"
        role="tooltip"
        :style="{ left: `${tip.left}px`, top: `${tip.top}px` }"
      >
        {{ tip.label }}
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.wet {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  height: var(--pw-toolbar-height, 3rem);
  padding: 0 0.375rem;
  background: var(--pckt-bg-elevated);
}

.wet-scroll {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 0.75rem,
    #000 calc(100% - 1.25rem),
    transparent 100%
  );
}

.wet-scroll::-webkit-scrollbar {
  display: none;
}

.wet-group {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
  padding-right: 0.3125rem;
  margin-right: 0.3125rem;
  border-right: 1px solid var(--pckt-border);
}

.wet-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: none;
  border-radius: var(--pckt-radius-sm);
  background: transparent;
  color: var(--pckt-text-muted);
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.wet-btn:hover:not(:disabled) {
  background: var(--pckt-bg-muted);
  color: var(--pckt-text);
}

.wet-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.wet-btn.is-active {
  background: var(--pckt-accent-soft);
  color: var(--pckt-accent);
}

.wet-btn.is-uploading {
  background: color-mix(in srgb, var(--pckt-blue) 12%, transparent);
  color: var(--pckt-blue);
}

.wet-btn:focus-visible {
  outline: 2px solid var(--pckt-blue);
  outline-offset: -2px;
}

.wet-upload-spinner {
  display: block;
  width: 1rem;
  height: 1rem;
  border: 2px solid color-mix(in srgb, var(--pckt-blue) 28%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: wet-spin 0.7s linear infinite;
}

@keyframes wet-spin {
  to {
    transform: rotate(360deg);
  }
}

.wet-glyph {
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
}

.wet-glyph[data-glyph='italic'] {
  font-style: italic;
}

.wet-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.wet-menu-trigger {
  width: auto;
  padding: 0 0.625rem;
}

.wet-menu-label {
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .wet-menu-label {
    display: none;
  }

  .wet-menu-trigger {
    width: 2.5rem;
    padding: 0;
  }
}
</style>

<!-- Teleported nodes sit outside scoped tree. -->
<style>
.wet-menu {
  position: fixed;
  z-index: 1100;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.25rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md, 0 8px 24px color-mix(in srgb, var(--pckt-text) 12%, transparent));
}

.wet-menu-heading {
  margin: 0.375rem 0 0.125rem;
  padding: 0.5rem 0.5rem 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pckt-text-subtle);
  border-top: 1px solid var(--pckt-border);
}

.wet-menu-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: calc(var(--pckt-radius-sm) - 2px);
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--pckt-text);
}

.wet-menu-item:hover:not(:disabled),
.wet-menu-item:focus-visible {
  background: var(--pckt-bg-muted);
  outline: none;
}

.wet-menu-item:disabled {
  opacity: 0.55;
  cursor: wait;
}

.wet-menu-icon {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.125rem;
  color: var(--pckt-text-muted);
}

.wet-menu-text {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}

.wet-menu-name {
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 600;
}

.wet-menu-hint {
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  color: var(--pckt-text-muted);
}

.wet-tip {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, calc(-100% - 0.5rem));
  padding: 0.3125rem 0.5rem;
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-text);
  color: var(--pckt-bg-elevated);
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--pckt-text) 18%, transparent);
}
</style>
