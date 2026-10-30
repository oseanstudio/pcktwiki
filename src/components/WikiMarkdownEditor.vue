<script setup lang="ts">
import { computed, ref } from 'vue'
import SilkdownEditor from '@/components/SilkdownEditor.vue'
import WikiEditorToolbar from '@/components/WikiEditorToolbar.vue'
import type { EditorInsertResult } from '@/lib/editor-insert'
import { createCodemirrorTarget } from '@/lib/editor-codemirror'
import type { EditorTarget } from '@/lib/editor-target'

const props = withDefaults(
  defineProps<{
    modelValue: string
    id?: string
    placeholder?: string
    minHeight?: string
    spellcheck?: boolean
    ariaDescribedby?: string
    prose?: boolean
    borderless?: boolean
    hideToolbar?: boolean
    /** @deprecated Always live-rendered; kept for call-site compatibility. */
    liveRendered?: boolean
    /** @deprecated Ignored — block drag removed from the remade editor. */
    blockDrag?: boolean
    /** @deprecated Ignored — auto-grow not needed for Silkdown. */
    autoGrow?: boolean
    /** @deprecated Ignored. */
    compact?: boolean
    /** @deprecated Ignored. */
    rows?: number
    ownerHandle?: string
    wikiSlug?: string
  }>(),
  {
    rows: 1,
    compact: false,
    autoGrow: false,
    minHeight: undefined,
    spellcheck: true,
    prose: false,
    borderless: false,
    hideToolbar: false,
    liveRendered: true,
    blockDrag: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  applied: [result: EditorInsertResult]
}>()

const silkdownRef = ref<InstanceType<typeof SilkdownEditor> | null>(null)
const historyTick = ref(0)

const editorTarget = computed<EditorTarget | null>(() => {
  const view = silkdownRef.value?.getView()
  return view ? createCodemirrorTarget(view) : null
})

const canUndo = computed(() => {
  historyTick.value
  return editorTarget.value?.canUndo() ?? false
})
const canRedo = computed(() => {
  historyTick.value
  return editorTarget.value?.canRedo() ?? false
})

function onLiveUpdate(value: string) {
  historyTick.value++
  emit('update:modelValue', value)
}

function onBeforeToolbarApply() {
  editorTarget.value?.focus()
}

function onApplied(result: EditorInsertResult) {
  emit('update:modelValue', result.text)
  emit('applied', result)
  historyTick.value++
}

function undo() {
  editorTarget.value?.undo()
  historyTick.value++
}

function redo() {
  editorTarget.value?.redo()
  historyTick.value++
}

defineExpose({
  getTextarea: () => null,
  getEditorTarget: () => editorTarget.value,
  onBeforeToolbarApply,
  onApplied,
  undo,
  redo,
  canUndo: () => canUndo.value,
  canRedo: () => canRedo.value,
  getPickMode: () => false,
  togglePickMode: () => {},
  closePickMode: () => {},
})
</script>

<template>
  <div
    class="wiki-markdown-editor wiki-markdown-editor-live"
    :class="{ prose, borderless }"
    :style="minHeight ? { '--wiki-editor-min-height': minHeight } : undefined"
  >
    <WikiEditorToolbar
      v-if="!hideToolbar"
      embedded
      :compact="compact"
      :target="editorTarget"
      @before-apply="onBeforeToolbarApply"
      @applied="onApplied"
    />

    <div class="wiki-markdown-editor-surface wiki-live-rendered-editor">
      <SilkdownEditor
        ref="silkdownRef"
        :model-value="modelValue"
        class="wiki-silkdown-editor"
        :placeholder="placeholder"
        :min-height="minHeight"
        @update:model-value="onLiveUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.wiki-markdown-editor {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
}

.wiki-markdown-editor.borderless {
  border: none;
  border-radius: 0;
  background: transparent;
}

.wiki-markdown-editor-surface {
  min-height: inherit;
}

.wiki-live-rendered-editor {
  min-height: var(--wiki-editor-min-height, 11rem);
}

.wiki-silkdown-editor {
  min-height: inherit;
}

.wiki-silkdown-editor :deep(.silkdown-editor-host) {
  min-height: inherit;
}

.wiki-markdown-editor-live :deep(.cm-editor) {
  --silkdown-link-color: var(--pckt-red);
}

.wiki-markdown-editor.prose :deep(.cm-content) {
  font-family: var(--pckt-font-content);
  font-size: 0.9375rem;
  line-height: 1.55;
}
</style>
