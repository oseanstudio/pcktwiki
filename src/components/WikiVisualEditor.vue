<script setup lang="ts">
/** @deprecated Use WikiEditor directly. Kept as a compatibility alias. */
import WikiEditor from '@/components/WikiEditor.vue'

withDefaults(
  defineProps<{
    modelValue: string
    title: string
    editSummary?: string
    ownerHandle: string
    wikiSlug: string
    noteSlug: string
    placeholder?: string
    canPublish?: boolean
    publishing?: boolean
    hasTalkPage?: boolean
    initialSourceMode?: boolean
    id?: string
    draftKey?: string | null
  }>(),
  {
    editSummary: '',
    placeholder: 'Start writing your article…',
    canPublish: true,
    publishing: false,
    hasTalkPage: false,
    initialSourceMode: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:title': [value: string]
  'update:editSummary': [value: string]
  publish: []
}>()
</script>

<template>
  <WikiEditor
    :id="id"
    :model-value="modelValue"
    :title="title"
    :edit-summary="editSummary"
    :owner-handle="ownerHandle"
    :wiki-slug="wikiSlug"
    :note-slug="noteSlug"
    :placeholder="placeholder"
    :can-publish="canPublish"
    :publishing="publishing"
    :has-talk-page="hasTalkPage"
    :draft-key="draftKey"
    @update:model-value="emit('update:modelValue', $event)"
    @update:title="emit('update:title', $event)"
    @update:edit-summary="emit('update:editSummary', $event)"
    @publish="emit('publish')"
  />
</template>
