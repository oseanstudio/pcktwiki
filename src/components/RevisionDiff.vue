<script setup lang="ts">
import { computed } from 'vue'
import { computeLineDiff } from '@/lib/lichen/visual-diff'

const props = defineProps<{
  oldText: string
  newText: string
}>()

const lines = computed(() => computeLineDiff(props.oldText, props.newText))
</script>

<template>
  <div class="revision-diff" role="region" aria-label="Revision diff">
    <pre class="diff-pre"><code
      v-for="(line, index) in lines"
      :key="index"
      :class="`diff-line diff-${line.type}`"
    >{{ line.text }}{{ index < lines.length - 1 ? '\n' : '' }}</code></pre>
  </div>
</template>

<style scoped>
.revision-diff {
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  overflow: auto;
  background: var(--pckt-bg-muted);
}

.diff-pre {
  margin: 0;
  font-family: var(--pckt-font-mono);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.diff-line {
  display: block;
  padding: 0 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-context {
  color: var(--pckt-text-muted);
}

.diff-add {
  background: color-mix(in srgb, var(--pckt-green) 18%, transparent);
  color: var(--pckt-text);
}

.diff-remove {
  background: color-mix(in srgb, var(--pckt-red) 15%, transparent);
  color: var(--pckt-text);
}
</style>
