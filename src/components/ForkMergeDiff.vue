<script setup lang="ts">
import { computed, ref } from 'vue'
import RevisionDiff from '@/components/RevisionDiff.vue'
import type { ForkChange } from '@/lib/lichen/fork-sync'

const props = defineProps<{
  change: ForkChange
}>()

const tab = ref<'base' | 'theirs' | 'mine' | 'result'>('result')
const mergeContent = ref('')

const resultPreview = computed(() => mergeContent.value || props.change.theirs)

const tabs = [
  { id: 'base' as const, label: 'Base' },
  { id: 'theirs' as const, label: 'Upstream' },
  { id: 'mine' as const, label: 'Yours' },
  { id: 'result' as const, label: 'Result' },
]

defineExpose({
  getMergeContent: () => resultPreview.value,
})
</script>

<template>
  <div class="fork-merge-diff">
    <div class="fork-merge-tabs" role="tablist">
      <button
        v-for="item in tabs"
        :key="item.id"
        type="button"
        class="fork-merge-tab"
        :class="{ active: tab === item.id }"
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="tab === 'base'" class="fork-merge-pane">
      <pre class="fork-merge-text">{{ change.base || '(empty)' }}</pre>
    </div>
    <div v-else-if="tab === 'theirs'" class="fork-merge-pane">
      <RevisionDiff :old-text="change.base" :new-text="change.theirs" />
    </div>
    <div v-else-if="tab === 'mine'" class="fork-merge-pane">
      <RevisionDiff :old-text="change.base" :new-text="change.mine" />
    </div>
    <div v-else class="fork-merge-pane">
      <textarea
        v-if="change.conflicted"
        v-model="mergeContent"
        class="fork-merge-editor textarea"
        rows="12"
        :placeholder="change.theirs"
      />
      <RevisionDiff v-else :old-text="change.mine" :new-text="change.theirs" />
    </div>
  </div>
</template>

<style scoped>
.fork-merge-diff {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fork-merge-tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.fork-merge-tab {
  border: 1px solid var(--pckt-border);
  background: var(--pckt-bg-muted);
  border-radius: var(--pckt-radius-sm);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.fork-merge-tab.active {
  background: var(--pckt-accent);
  color: white;
  border-color: transparent;
}

.fork-merge-text {
  white-space: pre-wrap;
  font-family: var(--pckt-font-mono);
  font-size: 0.8125rem;
  margin: 0;
}

.fork-merge-editor {
  width: 100%;
  font-family: var(--pckt-font-mono);
  font-size: 0.8125rem;
}
</style>
