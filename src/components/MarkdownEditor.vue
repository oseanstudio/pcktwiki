<script setup lang="ts">
import WikiEditor from '@/components/WikiEditor.vue'

withDefaults(
  defineProps<{
    modelValue: string
    title?: string
    editSummary?: string
    id?: string
    placeholder?: string
    ownerHandle?: string
    wikiSlug?: string
    noteSlug?: string
    canPublish?: boolean
    publishing?: boolean
    hasTalkPage?: boolean
  }>(),
  {
    title: 'Untitled',
    editSummary: '',
    noteSlug: 'draft',
    canPublish: false,
    publishing: false,
    hasTalkPage: false,
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
    :owner-handle="ownerHandle ?? ''"
    :wiki-slug="wikiSlug ?? ''"
    :note-slug="noteSlug"
    :placeholder="placeholder"
    :can-publish="canPublish"
    :publishing="publishing"
    :has-talk-page="hasTalkPage"
    @update:model-value="emit('update:modelValue', $event)"
    @update:title="emit('update:title', $event)"
    @update:edit-summary="emit('update:editSummary', $event)"
    @publish="emit('publish')"
  />
</template>
