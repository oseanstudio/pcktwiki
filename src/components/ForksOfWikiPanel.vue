<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { listForksOfWiki, type ForkOfWiki } from '@/lib/lichen/fork-discovery'

const props = defineProps<{
  /** AT-URI of the wiki whose forks we are listing. */
  wikiUri: string
}>()

const forks = ref<ForkOfWiki[]>([])
const loading = ref(false)
const loaded = ref(false)

async function load() {
  if (!props.wikiUri) return
  loading.value = true
  try {
    forks.value = await listForksOfWiki(props.wikiUri)
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(() => {
  void load()
})

watch(
  () => props.wikiUri,
  () => {
    loaded.value = false
    forks.value = []
    void load()
  },
)
</script>

<template>
  <section v-if="loading || forks.length" class="forks-panel">
    <h2 class="forks-title">
      Forks
      <span v-if="forks.length" class="forks-count">{{ forks.length }}</span>
    </h2>

    <p v-if="loading" class="muted forks-empty">Checking the network…</p>

    <ul v-else class="forks-list">
      <li v-for="fork in forks" :key="fork.uri">
        <RouterLink class="forks-link" :to="`/@${fork.handle}/${fork.slug}`">
          <span class="forks-handle">@{{ fork.handle }}</span>
          <span class="forks-slug">/{{ fork.slug }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.forks-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
}

.forks-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--pckt-font-content);
  font-size: 0.9375rem;
}

.forks-count {
  padding: 0.0625rem 0.4375rem;
  border-radius: var(--pckt-radius-pill);
  background: var(--pckt-accent-soft);
  color: var(--pckt-accent);
  font-size: 0.75rem;
}

.forks-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.forks-link {
  display: inline-flex;
  gap: 0.125rem;
  font-size: 0.875rem;
  text-decoration: none;
}

.forks-link:hover .forks-handle {
  text-decoration: underline;
}

.forks-handle {
  color: var(--pckt-link);
}

.forks-slug {
  color: var(--pckt-text-muted);
}

.forks-empty {
  margin: 0;
  font-size: 0.8125rem;
}
</style>
