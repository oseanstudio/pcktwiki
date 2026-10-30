<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { GuestFeedWikiDisplay, WikiGraphEdge } from '@/lib/lichen/guest-feed'
import { GUEST_FEED_TOPICS } from '@/data/guest-feed'
import { wikiPath } from '@/data/featured-wikis'
import WikiAvatar from '@/components/WikiAvatar.vue'

const props = defineProps<{
  wikis: GuestFeedWikiDisplay[]
  edges: WikiGraphEdge[]
}>()

const topicsWithWikis = computed(() =>
  GUEST_FEED_TOPICS.map((topic) => ({
    ...topic,
    wikis: props.wikis.filter((wiki) => wiki.topics.includes(topic.id)),
  })).filter((topic) => topic.wikis.length > 0),
)

function edgeBadgeLabel(source: WikiGraphEdge['source']): string {
  if (source === 'curated') return 'Suggested'
  if (source === 'network') return 'Linked'
  return 'Wikilink'
}

function edgeBadgeClass(source: WikiGraphEdge['source']): string {
  if (source === 'curated') return 'source-curated'
  if (source === 'network') return 'source-network'
  return 'source-link'
}
</script>

<template>
  <div class="constellation">
    <div class="constellation-topics">
      <section
        v-for="topic in topicsWithWikis"
        :key="topic.id"
        class="constellation-topic"
      >
        <header class="constellation-topic-header">
          <h3>{{ topic.label }}</h3>
          <p class="muted">{{ topic.description }}</p>
        </header>

        <ul class="constellation-nodes">
          <li v-for="wiki in topic.wikis" :key="`${wiki.handle}-${wiki.slug}`">
            <RouterLink :to="wikiPath(wiki.handle, wiki.slug)" class="constellation-node card">
              <WikiAvatar
                :handle="wiki.handle"
                :name="wiki.name"
                :seed="wiki.slug"
                :accent-color="wiki.accentColor"
                :size="40"
              />
              <span class="constellation-node-copy">
                <strong>{{ wiki.name }}</strong>
                <span class="constellation-node-meta muted">@{{ wiki.handle }} · {{ wiki.pdsHost }}</span>
                <span class="constellation-node-blurb">{{ wiki.blurb }}</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>

    <section v-if="edges.length" class="constellation-edges">
      <h3 class="constellation-edges-title">How wikis connect across PDS</h3>
      <ul class="constellation-edge-list">
        <li v-for="(edge, index) in edges" :key="`${edge.from.slug}-${edge.to.slug}-${index}`">
          <div class="constellation-edge card">
            <div class="constellation-edge-from">
              <RouterLink :to="wikiPath(edge.from.handle, edge.from.slug)">
                {{ edge.from.name }}
              </RouterLink>
              <span class="muted">{{ edge.from.pdsHost }}</span>
            </div>
            <div class="constellation-edge-bridge">
              <span class="constellation-edge-arrow" aria-hidden="true">→</span>
              <span class="constellation-edge-label">{{ edge.label }}</span>
              <span class="constellation-edge-source" :class="edgeBadgeClass(edge.source)">
                {{ edgeBadgeLabel(edge.source) }}
              </span>
            </div>
            <div class="constellation-edge-to">
              <RouterLink :to="wikiPath(edge.to.handle, edge.to.slug)">
                {{ edge.to.name }}
              </RouterLink>
              <span class="muted">{{ edge.to.pdsHost }}</span>
            </div>
            <p v-if="edge.viaNote" class="constellation-edge-via muted">
              From article
              <RouterLink :to="`${wikiPath(edge.from.handle, edge.from.slug)}/${edge.viaNote.slug}`">
                {{ edge.viaNote.title }}
              </RouterLink>
            </p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.constellation {
  display: grid;
  gap: 2rem;
}

.constellation-topics {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .constellation-topics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.constellation-topic-header h3 {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-ui);
  font-size: 1rem;
  font-weight: 900;
}

.constellation-topic-header p {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
}

.constellation-nodes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.625rem;
}

.constellation-node {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem;
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.constellation-node:hover {
  transform: translateY(-1px);
  text-decoration: none;
}

.constellation-node-copy {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.constellation-node-copy strong {
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
}

.constellation-node-meta {
  font-size: 0.75rem;
}

.constellation-node-blurb {
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--pckt-text-muted);
}

.constellation-edges-title {
  margin: 0 0 1rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.125rem;
  font-weight: 900;
}

.constellation-edge-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.constellation-edge {
  padding: 1rem;
  display: grid;
  gap: 0.625rem;
}

@media (min-width: 768px) {
  .constellation-edge {
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  }
}

.constellation-edge-from,
.constellation-edge-to {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.875rem;
}

.constellation-edge-from a,
.constellation-edge-to a {
  font-weight: 800;
  color: inherit;
  text-decoration: none;
}

.constellation-edge-from a:hover,
.constellation-edge-to a:hover {
  color: var(--pckt-red);
}

.constellation-edge-bridge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
  padding: 0 0.5rem;
}

.constellation-edge-arrow {
  color: var(--pckt-blue);
  font-size: 1.25rem;
  font-weight: 900;
}

.constellation-edge-label {
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  max-width: 14rem;
}

.constellation-edge-source {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.125rem 0.375rem;
  border-radius: var(--pckt-radius-pill);
}

.source-curated {
  background: color-mix(in srgb, var(--pckt-blue) 12%, transparent);
  color: var(--pckt-blue);
}

.source-link {
  background: color-mix(in srgb, var(--pckt-green) 12%, transparent);
  color: var(--pckt-green-active);
}

.source-network {
  background: color-mix(in srgb, var(--pckt-red) 12%, transparent);
  color: var(--pckt-red);
}

.constellation-edge-via {
  margin: 0;
  grid-column: 1 / -1;
  font-size: 0.8125rem;
}

.constellation-edge-via a {
  color: var(--pckt-red);
  font-weight: 600;
}
</style>
