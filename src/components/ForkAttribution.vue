<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { parseAtUri } from '@/lib/atproto/lichen'
import { getPublicAgent } from '@/lib/atproto/auth'
import { getCachedHandle, setCachedHandle } from '@/lib/atproto/handle-cache'
import { getActorProfile } from '@/lib/standardsite/blog'

const props = defineProps<{
  forkedFrom: string
}>()

const sourceHandle = ref<string | null>(null)
const sourceSlug = ref<string | null>(null)

const parsed = computed(() => parseAtUri(props.forkedFrom))

const linkPath = computed(() => {
  if (!sourceHandle.value || !sourceSlug.value) return null
  return `/@${sourceHandle.value}/${sourceSlug.value}`
})

const label = computed(() => {
  if (!sourceHandle.value || !sourceSlug.value) return null
  return `@${sourceHandle.value}/${sourceSlug.value}`
})

async function resolveSource() {
  const info = parsed.value
  if (!info || info.collection !== 'wiki.lichen.wiki') {
    sourceHandle.value = null
    sourceSlug.value = null
    return
  }

  sourceSlug.value = info.rkey

  const cached = getCachedHandle(info.did)
  if (cached) {
    sourceHandle.value = cached
    return
  }

  try {
    const profile = await getActorProfile(getPublicAgent(), info.did)
    if (profile.handle) {
      setCachedHandle(info.did, profile.handle)
      sourceHandle.value = profile.handle
    }
  } catch {
    sourceHandle.value = null
  }
}

onMounted(() => {
  void resolveSource()
})

watch(() => props.forkedFrom, () => {
  void resolveSource()
})
</script>

<template>
  <RouterLink v-if="linkPath && label" :to="linkPath" class="fork-attribution badge">
    Forked from {{ label }}
  </RouterLink>
  <span v-else-if="sourceSlug" class="fork-attribution badge badge-muted">
    Forked from {{ sourceSlug }}
  </span>
</template>

<style scoped>
.fork-attribution {
  text-decoration: none;
}

.fork-attribution:hover {
  text-decoration: underline;
}
</style>
