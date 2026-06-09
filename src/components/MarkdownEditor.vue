<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    localValue.value = value
  },
)

function onInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  localValue.value = value
  emit('update:modelValue', value)
}
</script>

<template>
  <textarea
    class="textarea editor"
    :value="localValue"
    :placeholder="placeholder"
    spellcheck="true"
    @input="onInput"
  />
</template>

<style scoped>
.editor {
  min-height: 360px;
}
</style>
