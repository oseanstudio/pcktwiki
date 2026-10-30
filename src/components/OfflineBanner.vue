<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getPendingEdits, onOfflineQueueChange } from '@/lib/offline-queue'

const props = defineProps<{
  cachedFrom?: number | null
}>()

const online = ref(true)
const pendingCount = ref(0)

function refresh() {
  online.value = navigator.onLine
  pendingCount.value = getPendingEdits().length
}

let unsubscribeQueue: (() => void) | undefined

onMounted(() => {
  refresh()
  window.addEventListener('online', refresh)
  window.addEventListener('offline', refresh)
  unsubscribeQueue = onOfflineQueueChange(refresh)
})

onUnmounted(() => {
  window.removeEventListener('online', refresh)
  window.removeEventListener('offline', refresh)
  unsubscribeQueue?.()
})

const cachedLabel = computed(() => {
  if (!props.cachedFrom) return null
  return new Date(props.cachedFrom).toLocaleString()
})

const show = computed(
  () => !online.value || pendingCount.value > 0 || Boolean(props.cachedFrom && !online.value),
)
</script>

<template>
  <div v-if="show || cachedLabel" class="offline-banner" :class="{ offline: !online }">
    <template v-if="!online">
      You're offline — reading from cache when available. Edits queue until you're back online.
    </template>
    <template v-else-if="pendingCount > 0">
      Syncing {{ pendingCount }} queued edit{{ pendingCount === 1 ? '' : 's' }}…
    </template>
    <p v-if="cachedLabel && !online" class="cached-note">
      Cached copy from {{ cachedLabel }}
    </p>
  </div>
</template>

<style scoped>
.offline-banner {
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  background: color-mix(in srgb, var(--pckt-yellow) 25%, var(--pckt-bg-elevated));
  border: 1px solid color-mix(in srgb, var(--pckt-yellow) 50%, transparent);
  border-radius: var(--pckt-radius-sm);
  margin-bottom: 1rem;
}

.offline-banner.offline {
  background: color-mix(in srgb, var(--pckt-red) 12%, var(--pckt-bg-elevated));
  border-color: color-mix(in srgb, var(--pckt-red) 30%, transparent);
}

.cached-note {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  opacity: 0.85;
}
</style>
