<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useDoubleActivation } from '@/composables/useDoubleActivation'
import { useWikiLike } from '@/composables/useWikiLike'
import PcktSparkLogomark from '@/components/PcktSparkLogomark.vue'

const props = defineProps<{
  to: string
  handle: string
  wikiSlug: string
  wikiName: string
}>()

const router = useRouter()
const { liked, burstVisible, toggleLike } = useWikiLike(props.handle, props.wikiSlug, props.wikiName)

const { onClick, onDblclick, onTouchEnd } = useDoubleActivation({
  onSingle: () => {
    void router.push(props.to)
  },
  onDouble: () => {
    void toggleLike()
  },
})
</script>

<template>
  <a
    :href="to"
    class="feed-like-surface"
    :class="{ liked }"
    :aria-label="liked ? `${wikiName} — watching. Double-click to unwatch.` : `${wikiName}. Double-click to watch.`"
    @click="onClick"
    @dblclick="onDblclick"
    @touchend="onTouchEnd"
  >
    <slot />
    <span v-if="burstVisible" class="feed-like-burst" aria-hidden="true">
      <PcktSparkLogomark class="feed-like-burst-mark" />
    </span>
  </a>
</template>

<style scoped>
.feed-like-surface {
  position: relative;
  display: flex;
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
}

.feed-like-surface:hover {
  text-decoration: none;
}

.feed-like-surface.liked {
  background: color-mix(in srgb, var(--pckt-red) 6%, transparent);
}

.feed-like-burst {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  animation: feed-like-burst 650ms ease-out forwards;
}

.feed-like-burst-mark {
  width: 2.75rem;
  height: auto;
  filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--pckt-red) 35%, transparent));
}

@keyframes feed-like-burst {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  20% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}
</style>
