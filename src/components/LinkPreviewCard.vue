<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LinkPreviewData } from '@/composables/useLinkPreview'

const props = defineProps<{
  preview: LinkPreviewData
  anchorEl: HTMLAnchorElement
  href: string
  /** Already resolved to a fetchable URL by the caller. */
  imageUrl?: string
}>()

const emit = defineEmits<{
  enter: []
  leave: []
  navigate: [event: MouseEvent]
}>()

const CARD_WIDTH = 320
const GAP = 10
const MARGIN = 12

const cardEl = ref<HTMLElement | null>(null)
const top = ref(0)
const left = ref(0)
const placement = ref<'below' | 'above'>('below')
const ready = ref(false)

function reposition() {
  const card = cardEl.value
  if (!card || !props.anchorEl.isConnected) return

  const rect = props.anchorEl.getBoundingClientRect()
  const height = card.offsetHeight
  const width = Math.min(CARD_WIDTH, window.innerWidth - MARGIN * 2)

  const spaceBelow = window.innerHeight - rect.bottom
  const below = spaceBelow >= height + GAP + MARGIN || spaceBelow >= rect.top
  placement.value = below ? 'below' : 'above'
  top.value = below ? rect.bottom + GAP : Math.max(MARGIN, rect.top - height - GAP)

  const maxLeft = window.innerWidth - width - MARGIN
  left.value = Math.min(Math.max(rect.left, MARGIN), Math.max(MARGIN, maxLeft))
  ready.value = true
}

watch(
  () => [props.preview, props.anchorEl] as const,
  async () => {
    ready.value = false
    await nextTick()
    reposition()
  },
  { immediate: true },
)

onMounted(() => {
  reposition()
  window.addEventListener('resize', reposition)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', reposition)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="cardEl"
      data-link-preview-card
      class="link-preview"
      :class="[`is-${placement}`, { 'is-ready': ready }]"
      :style="{ top: `${top}px`, left: `${left}px`, width: `${CARD_WIDTH}px` }"
      role="tooltip"
      @pointerenter="emit('enter')"
      @pointerleave="emit('leave')"
    >
      <a class="link-preview-body" :href="href" @click="emit('navigate', $event)">
        <img
          v-if="imageUrl"
          class="link-preview-image"
          :src="imageUrl"
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div class="link-preview-text">
          <span class="link-preview-title">{{ preview.title }}</span>
          <p v-if="preview.kind === 'missing'" class="link-preview-extract is-empty">
            This page doesn’t exist yet.
          </p>
          <p v-else-if="preview.text" class="link-preview-extract">{{ preview.text }}</p>
          <p v-else class="link-preview-extract is-empty">No text on this page yet.</p>
        </div>
      </a>
    </div>
  </Teleport>
</template>

<style scoped>
.link-preview {
  position: fixed;
  z-index: 900;
  max-width: calc(100vw - 24px);
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md);
  overflow: hidden;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.link-preview.is-ready {
  opacity: 1;
  transform: none;
}

.link-preview-body {
  display: block;
  color: inherit;
  text-decoration: none;
}

.link-preview-image {
  display: block;
  width: 100%;
  height: 8rem;
  object-fit: cover;
  background: var(--pckt-bg-muted);
}

.link-preview-text {
  padding: 0.75rem 0.875rem 0.875rem;
}

.link-preview-title {
  display: block;
  margin-bottom: 0.3rem;
  font-family: var(--pckt-font-content);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--pckt-text);
}

.link-preview-extract {
  margin: 0;
  font-family: var(--pckt-font-content);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.link-preview-extract.is-empty {
  font-style: italic;
  color: var(--pckt-text-subtle);
}

@media (prefers-reduced-motion: reduce) {
  .link-preview {
    transition: none;
  }
}
</style>
