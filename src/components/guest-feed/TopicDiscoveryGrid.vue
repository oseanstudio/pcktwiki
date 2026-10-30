<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { GuestFeedTopic } from '@/data/guest-feed'
import { useAuthStore } from '@/stores/auth'
import {
  allTopicsCardDescription,
  prioritizeGuestFeedTopics,
} from '@/lib/guest-feed-topics'
import { getWatchlist } from '@/lib/watchlist'

const props = defineProps<{
  topics: GuestFeedTopic[]
  activeTopic: string | null
  wikiCounts: Record<string, number>
  totalWikiCount: number
}>()

const auth = useAuthStore()

const emit = defineEmits<{
  select: [topicId: string | null]
}>()

interface TopicEntry {
  id: string
  label: string
  description: string
  count: number
}

const discoveryRef = ref<HTMLElement | null>(null)
const slotsForTopics = ref(0)

const watchlist = computed(() => (auth.isAuthenticated ? getWatchlist() : []))

const displayTopics = computed(() =>
  auth.isAuthenticated && watchlist.value.length > 0
    ? prioritizeGuestFeedTopics(props.topics, watchlist.value)
    : props.topics,
)

const allTopicsEntry = computed(() => ({
  label: 'All topics',
  description: allTopicsCardDescription(watchlist.value),
  count: props.totalWikiCount,
}))

const topicEntries = computed<TopicEntry[]>(() =>
  displayTopics.value.map((topic) => ({
    id: topic.id,
    label: topic.label,
    description: topic.description,
    count: props.wikiCounts[topic.id] ?? 0,
  })),
)

const visibleTopics = computed(() => {
  const topics = topicEntries.value
  const slots = slotsForTopics.value

  if (topics.length <= slots) {
    return topics
  }

  const overflow = topics.slice(slots)
  let visible = topics.slice(0, slots)

  const activeInOverflow = overflow.find((entry) => entry.id === props.activeTopic)
  if (activeInOverflow && visible.length > 0) {
    visible = [...visible.slice(0, -1), activeInOverflow]
  }

  return visible
})

function minCardWidthPx(el: HTMLElement): number {
  const raw = getComputedStyle(el).getPropertyValue('--topic-card-min-width').trim()
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  if (raw.endsWith('rem')) return parseFloat(raw) * rootSize
  if (raw.endsWith('px')) return parseFloat(raw)
  return parseFloat(raw) || 168
}

function gapPx(el: HTMLElement): number {
  const style = getComputedStyle(el)
  const raw = style.columnGap || style.gap || '0.625rem'
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  if (raw.endsWith('rem')) return parseFloat(raw) * rootSize
  return parseFloat(raw) || 10
}

function rowWidthForTopics(topicCount: number, cardWidth: number, gap: number): number {
  return (topicCount + 1) * cardWidth + topicCount * gap
}

function updateLayout() {
  const el = discoveryRef.value
  if (!el) return

  const width = el.getBoundingClientRect().width
  if (width <= 0) return

  const cardWidth = minCardWidthPx(el)
  const gap = gapPx(el)
  const topics = topicEntries.value

  let slots = 0
  while (slots < topics.length) {
    const needed = rowWidthForTopics(slots + 1, cardWidth, gap)
    if (needed <= width + 0.5) slots++
    else break
  }

  slotsForTopics.value = slots
}

let resizeObserver: ResizeObserver | null = null

watch(topicEntries, () => {
  void nextTick(updateLayout)
})

onMounted(async () => {
  await nextTick()
  updateLayout()
  resizeObserver = new ResizeObserver(() => updateLayout())
  if (discoveryRef.value) resizeObserver.observe(discoveryRef.value)
  window.addEventListener('resize', updateLayout, { passive: true })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateLayout)
})
</script>

<template>
  <div
    ref="discoveryRef"
    class="topic-discovery"
    role="tablist"
    aria-label="Browse by topic"
  >
    <button
      v-for="entry in visibleTopics"
      :key="entry.id"
      type="button"
      class="topic-card"
      :class="{ active: activeTopic === entry.id }"
      role="tab"
      :aria-selected="activeTopic === entry.id"
      @click="emit('select', entry.id)"
    >
      <span class="topic-card-label">{{ entry.label }}</span>
      <span class="topic-card-desc">{{ entry.description }}</span>
      <span class="topic-card-count">{{ entry.count }} wikis</span>
    </button>

    <button
      type="button"
      class="topic-card topic-card-all"
      :class="{ active: !activeTopic }"
      role="tab"
      :aria-selected="!activeTopic"
      @click="emit('select', null)"
    >
      <span class="topic-card-label">{{ allTopicsEntry.label }}</span>
      <span class="topic-card-desc">{{ allTopicsEntry.description }}</span>
      <span class="topic-card-count">{{ allTopicsEntry.count }} wikis</span>
    </button>
  </div>
</template>

<style scoped>
.topic-discovery {
  --topic-card-basis: 14.9375rem; /* ~239px preferred */
  --topic-card-min-width: 10.5rem; /* ~168px */
  --topic-card-max-width: 18rem; /* ~288px */
  --topic-card-min-height: 7.375rem; /* ~118px */

  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 0.625rem;
  width: 100%;
  min-width: 0;
  margin-bottom: 1.5rem;
}

.topic-card {
  flex: 0 1 var(--topic-card-basis);
  min-width: var(--topic-card-min-width);
  max-width: var(--topic-card-max-width);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  min-height: var(--topic-card-min-height);
  padding: 0.875rem 1rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius);
  background: var(--pckt-bg-elevated);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.topic-card:hover {
  border-color: var(--pckt-border-strong);
  transform: translateY(-1px);
  box-shadow: var(--pckt-shadow-xs);
}

.topic-card.active {
  border-color: color-mix(in srgb, var(--pckt-blue) 45%, var(--pckt-border));
  background: color-mix(in srgb, var(--pckt-blue) 8%, var(--pckt-bg-elevated));
  box-shadow: var(--pckt-shadow-xs);
}

.topic-card-label {
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 800;
  line-height: 1.25;
}

.topic-card.active .topic-card-label {
  color: var(--pckt-blue);
}

.topic-card-desc {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--pckt-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-card-count {
  margin-top: 0.25rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pckt-text-subtle);
}

.topic-card.active .topic-card-count {
  color: var(--pckt-blue);
}

.topic-card:not(.topic-card-all) {
  flex-grow: 1;
}

.topic-card-all {
  flex-grow: 0;
  margin-left: auto;
}
</style>
