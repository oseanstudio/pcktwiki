<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** Optional quick swatches shown above the picker. */
    swatches?: readonly string[]
    label?: string
    id?: string
  }>(),
  {
    swatches: () => [],
    label: 'Color',
    id: 'theme-color',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

const hexDraft = ref(normalizeHex(props.modelValue))

watch(
  () => props.modelValue,
  (value) => {
    const next = normalizeHex(value)
    if (next.toLowerCase() !== hexDraft.value.toLowerCase()) {
      hexDraft.value = next
    }
  },
)

const pickerValue = computed(() => {
  const hex = normalizeHex(props.modelValue)
  return expandShortHex(hex)
})

function normalizeHex(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '#000000'
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function expandShortHex(hex: string): string {
  const m = hex.match(/^#([0-9a-f]{3})$/i)
  if (!m) return HEX_RE.test(hex) ? hex : '#000000'
  const [r, g, b] = m[1].split('')
  return `#${r}${r}${g}${g}${b}${b}`
}

function commitHex(raw: string) {
  const normalized = normalizeHex(raw)
  if (!HEX_RE.test(normalized)) return
  const expanded = expandShortHex(normalized)
  hexDraft.value = expanded
  emit('update:modelValue', expanded)
}

function onHexInput(event: Event) {
  hexDraft.value = (event.target as HTMLInputElement).value
}

function onHexBlur() {
  commitHex(hexDraft.value)
}

function onHexKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitHex(hexDraft.value)
    ;(event.target as HTMLInputElement).blur()
  }
}

function onPickerInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  hexDraft.value = value
  emit('update:modelValue', value)
}

function pickSwatch(color: string) {
  commitHex(color)
}
</script>

<template>
  <div class="theme-color-field">
    <div v-if="swatches.length" class="theme-color-swatches">
      <button
        v-for="color in swatches"
        :key="color"
        type="button"
        class="theme-color-swatch"
        :class="{ active: pickerValue.toLowerCase() === expandShortHex(normalizeHex(color)).toLowerCase() }"
        :style="{ background: color }"
        :aria-label="color"
        :title="color"
        @click="pickSwatch(color)"
      />
    </div>
    <div class="theme-color-row">
      <label class="theme-color-picker-wrap" :for="`${id}-picker`" :title="`Pick ${label}`">
        <span class="theme-color-picker-face" :style="{ background: pickerValue }" aria-hidden="true" />
        <input
          :id="`${id}-picker`"
          class="theme-color-picker-input"
          type="color"
          :value="pickerValue"
          :aria-label="`${label} color picker`"
          @input="onPickerInput"
        />
      </label>
      <input
        :id="`${id}-hex`"
        class="theme-color-hex"
        type="text"
        spellcheck="false"
        autocomplete="off"
        maxlength="7"
        :value="hexDraft"
        :aria-label="`${label} hex code`"
        placeholder="#rrggbb"
        @input="onHexInput"
        @blur="onHexBlur"
        @keydown="onHexKeydown"
      />
    </div>
  </div>
</template>

<style scoped>
.theme-color-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.theme-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.theme-color-swatch {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.theme-color-swatch.active {
  border-color: var(--pckt-text);
  box-shadow: 0 0 0 2px var(--pckt-bg-elevated);
}

.theme-color-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.theme-color-picker-wrap {
  position: relative;
  flex: 0 0 auto;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--pckt-radius-sm);
  border: 1px solid var(--pckt-border);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--pckt-shadow-xs);
}

.theme-color-picker-face {
  display: block;
  width: 100%;
  height: 100%;
}

.theme-color-picker-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  opacity: 0;
  cursor: pointer;
}

.theme-color-hex {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  height: 2.5rem;
  padding: 0 0.65rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg);
  color: var(--pckt-text);
  font-family: var(--pckt-font-mono);
  font-size: 0.875rem;
  letter-spacing: 0.02em;
}

.theme-color-hex:focus {
  outline: 2px solid var(--pckt-blue);
  outline-offset: 1px;
  border-color: transparent;
}
</style>
