<script setup lang="ts">
import { computed } from 'vue'
import { useWikiEditMode, type WikiEditTarget } from '@/composables/useWikiEditMode'

const props = withDefaults(
  defineProps<{
    target: WikiEditTarget
    /** When false, renders a plain passthrough wrapper. */
    allowed?: boolean
    label?: string
    /** Keep layout as-is while editing (no chrome bar / padding). */
    seamless?: boolean
    /**
     * Edit directly as soon as edit mode starts, with no click to open. For
     * small always-visible controls — link rows — where the extra click just
     * hides the add/reorder buttons behind a step. Bypasses `openTarget`, so
     * several auto-open regions can be live at once; the edit-mode Save commits
     * them all.
     */
    autoOpen?: boolean
  }>(),
  { seamless: false, autoOpen: false },
)

const editMode = useWikiEditMode()

const enabled = computed(
  () => editMode.active.value && props.allowed !== false && !isEditing.value,
)

const isEditing = computed(
  () =>
    (props.autoOpen && editMode.active.value && props.allowed !== false) ||
    editMode.openTarget.value === props.target,
)

function onClick(event: MouseEvent) {
  if (!enabled.value) return
  event.preventDefault()
  event.stopPropagation()
  editMode.open(props.target)
}
</script>

<template>
  <div
    class="wiki-editable"
    :class="{
      'wiki-editable--active': enabled,
      'wiki-editable--editing': isEditing,
      'wiki-editable--seamless': seamless,
    }"
    :data-wiki-edit-target="enabled || isEditing ? target : undefined"
    :tabindex="enabled ? 0 : undefined"
    :role="enabled ? 'button' : undefined"
    :aria-label="enabled ? label ?? `Edit ${target}` : undefined"
    @click.capture="onClick"
    @keydown.enter.prevent="enabled && editMode.open(target)"
    @keydown.space.prevent="enabled && editMode.open(target)"
  >
    <div
      v-if="isEditing"
      class="wiki-editable-editor"
      :class="{ 'wiki-editable-editor--seamless': seamless }"
      @click.stop
    >
      <slot name="editor" />
    </div>
    <template v-else>
      <slot />
    </template>
  </div>
</template>

<style scoped>
.wiki-editable {
  position: relative;
  display: block;
  min-width: 0;
}

/* Dashed outline marks fields you can write in while edit mode is on. */
.wiki-editable--active {
  cursor: pointer;
  border-radius: var(--pckt-radius-btn);
  outline: var(--pckt-edit-dash);
  outline-offset: var(--pckt-edit-dash-offset);
}

.wiki-editable--active:hover,
.wiki-editable--active:focus-visible {
  outline: var(--pckt-edit-dash-strong);
  outline-offset: var(--pckt-edit-dash-offset);
}

.wiki-editable--editing {
  cursor: auto;
  border-radius: var(--pckt-radius-btn);
  outline: var(--pckt-edit-dash-strong);
  outline-offset: var(--pckt-edit-dash-offset);
  overflow: visible;
}

.wiki-editable-editor {
  padding: 0.75rem;
  cursor: auto;
  overflow: visible;
}

.wiki-editable-editor--seamless {
  padding: 0;
}
</style>
