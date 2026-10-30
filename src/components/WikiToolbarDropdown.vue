<script setup lang="ts">
import { ref } from 'vue'
import { useMenuDismissGroup } from '@/composables/useMenuDismissGroup'
import { useOverlayDismiss } from '@/composables/useOverlayDismiss'

const props = withDefaults(
  defineProps<{
    label: string
    title?: string
    align?: 'start' | 'end'
  }>(),
  {
    align: 'start',
  },
)

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function close() {
  open.value = false
}

const { closeOtherMenus } = useMenuDismissGroup(open, close)

useOverlayDismiss(rootRef, open, close)

function toggle(event: Event) {
  event.stopPropagation()
  if (!open.value) closeOtherMenus()
  open.value = !open.value
}

defineExpose({ close })
</script>

<template>
  <div ref="rootRef" class="wiki-toolbar-dropdown" :class="{ open }">
    <button
      type="button"
      class="wiki-toolbar-dropdown-trigger"
      :title="title || label"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle($event)"
    >
      <span class="wiki-toolbar-dropdown-label">{{ label }}</span>
      <span class="wiki-toolbar-dropdown-caret" aria-hidden="true" />
    </button>
    <div
      v-show="open"
      class="wiki-toolbar-dropdown-panel"
      :class="`align-${align}`"
      role="menu"
      @click="close"
    >
      <slot />
    </div>
  </div>
</template>
