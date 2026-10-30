<script setup lang="ts">
import { computed, ref } from 'vue'
import WikiAvatar from '@/components/WikiAvatar.vue'
import { sizedAvatarUrl } from '@/lib/media/avatar-cdn'

const props = withDefaults(
  defineProps<{
    imageUrl?: string
    alt: string
    handle: string
    name: string
    seed: string
    accentColor: string
    size?: number
  }>(),
  { size: 40 },
)

const imageFailed = ref(false)

const displayUrl = computed(() => sizedAvatarUrl(props.imageUrl, props.size) ?? props.imageUrl)
</script>

<template>
  <div
    class="search-suggestion-thumb"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="displayUrl && !imageFailed"
      :src="displayUrl"
      :alt="alt"
      class="search-suggestion-thumb-image"
      loading="lazy"
      decoding="async"
      @error="imageFailed = true"
    />
    <WikiAvatar
      v-else
      :handle="handle"
      :name="name"
      :seed="seed"
      :accent-color="accentColor"
      :size="size"
    />
  </div>
</template>

<style scoped>
.search-suggestion-thumb {
  flex-shrink: 0;
}

.search-suggestion-thumb-image {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  object-fit: cover;
  background: var(--pckt-bg-subtle);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
