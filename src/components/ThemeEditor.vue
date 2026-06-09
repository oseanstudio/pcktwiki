<script setup lang="ts">
import { computed } from 'vue'
import type { WikiTheme } from '@/types/wiki'
import { ACCENT_PRESETS, FONT_OPTIONS } from '@/types/wiki'

const props = defineProps<{
  modelValue: WikiTheme
}>()

const emit = defineEmits<{
  'update:modelValue': [value: WikiTheme]
}>()

const theme = computed({
  get: () => props.modelValue,
  set: (value: WikiTheme) => emit('update:modelValue', value),
})

function updateField<K extends keyof WikiTheme>(key: K, value: WikiTheme[K]) {
  theme.value = { ...theme.value, [key]: value }
}
</script>

<template>
  <div class="theme-editor card">
    <h3>Wiki theme</h3>

    <div class="field">
      <label class="label" for="accent">Accent color</label>
      <div class="swatches">
        <button
          v-for="color in ACCENT_PRESETS"
          :key="color"
          type="button"
          class="swatch"
          :class="{ active: theme.accentColor === color }"
          :style="{ background: color }"
          :aria-label="`Accent ${color}`"
          @click="updateField('accentColor', color)"
        />
      </div>
      <input
        id="accent"
        class="input"
        type="color"
        :value="theme.accentColor ?? '#2d5016'"
        @input="updateField('accentColor', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="field">
      <label class="label" for="font">Content font</label>
      <select
        id="font"
        class="select"
        :value="theme.fontFamily ?? 'Literata'"
        @change="updateField('fontFamily', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="font in FONT_OPTIONS" :key="font" :value="font">
          {{ font }}
        </option>
      </select>
    </div>

    <div class="field">
      <label class="label" for="mode">Color mode</label>
      <select
        id="mode"
        class="select"
        :value="theme.mode ?? 'light'"
        @change="updateField('mode', ($event.target as HTMLSelectElement).value as WikiTheme['mode'])"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
    </div>

    <div class="field">
      <label class="label" for="width">Layout width</label>
      <select
        id="width"
        class="select"
        :value="theme.layoutWidth ?? 'medium'"
        @change="updateField('layoutWidth', ($event.target as HTMLSelectElement).value as WikiTheme['layoutWidth'])"
      >
        <option value="narrow">Narrow</option>
        <option value="medium">Medium</option>
        <option value="wide">Wide</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.theme-editor {
  padding: 1.25rem;
}

h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.swatches {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.swatch {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.swatch.active {
  border-color: var(--pckt-text);
  box-shadow: 0 0 0 2px var(--pckt-bg-elevated);
}
</style>
