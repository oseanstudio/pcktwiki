<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useGuestFeed } from '@/composables/useGuestFeed'

const feed = useGuestFeed()
const root = ref<HTMLElement | null>(null)

let observer: IntersectionObserver | null = null

onMounted(() => {
  const el = root.value
  if (!el) return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void feed.loadNetworkEdges()
        observer?.disconnect()
        observer = null
      }
    },
    { rootMargin: '240px 0px' },
  )

  observer.observe(el)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div ref="root" class="deferred-guest-feed-network">
    <slot :loading="feed.networkEdgesLoading.value" />
  </div>
</template>
