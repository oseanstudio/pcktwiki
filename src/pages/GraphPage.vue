<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { loadWikiByHandle } from '@/lib/atproto/wiki-loader'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { normalizeHandle } from '@/lib/config'
import { collectWikiRelations, formatRelationType } from '@/lib/lichen/relations'
import { isBranchSlug } from '@/lib/lichen/branches'
import { isTalkSlug } from '@/lib/lichen/content-meta'

const route = useRoute()
const auth = useAuthStore()
const lichen = useLichenStore()

const handle = computed(() => normalizeHandle(route.params.handle as string))
const wikiSlug = computed(() => route.params.wikiSlug as string)

const edges = computed(() => collectWikiRelations(lichen.notes))

const nodes = computed(() => {
  const slugs = new Set<string>()
  for (const note of lichen.notes) {
    if (isTalkSlug(note.slug) || isBranchSlug(note.slug)) continue
    slugs.add(note.slug)
  }
  for (const edge of edges.value) {
    slugs.add(edge.sourceSlug)
    slugs.add(edge.targetSlug)
  }
  return [...slugs]
})

/** Simple circular layout for overview. */
const layout = computed(() => {
  const list = nodes.value
  const cx = 280
  const cy = 220
  const radius = Math.min(180, 40 + list.length * 8)
  return list.map((slug, index) => {
    const angle = (index / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2
    return {
      slug,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    }
  })
})

const positions = computed(() => {
  const map = new Map<string, { x: number; y: number }>()
  for (const node of layout.value) map.set(node.slug, node)
  return map
})

async function load() {
  await loadWikiByHandle(lichen, {
    handle: handle.value,
    wikiSlug: wikiSlug.value,
    viewerDid: auth.did,
    authAgent: auth.agent,
  })
}

onMounted(load)
watch(() => route.fullPath, load)
</script>

<template>
  <div class="graph-page">
    <div class="inner">
      <header>
        <RouterLink :to="`/@${handle}/${wikiSlug}`" class="muted">← Wiki home</RouterLink>
        <h1>Relationship graph</h1>
        <p class="muted">
          Built from <code>[[rel:type:slug]]</code> wikilinks.
        </p>
      </header>

      <svg v-if="edges.length" class="graph" viewBox="0 0 560 440" role="img" aria-label="Relationship graph">
        <line
          v-for="(edge, idx) in edges"
          :key="idx"
          :x1="positions.get(edge.sourceSlug)?.x ?? 0"
          :y1="positions.get(edge.sourceSlug)?.y ?? 0"
          :x2="positions.get(edge.targetSlug)?.x ?? 0"
          :y2="positions.get(edge.targetSlug)?.y ?? 0"
          class="edge"
        />
        <g v-for="node in layout" :key="node.slug">
          <circle :cx="node.x" :cy="node.y" r="6" class="node" />
          <text :x="node.x" :y="node.y - 10" text-anchor="middle" class="label">{{ node.slug }}</text>
        </g>
      </svg>

      <ul v-if="edges.length" class="edge-list card">
        <li v-for="(edge, idx) in edges" :key="idx">
          <RouterLink :to="`/@${handle}/${wikiSlug}/${edge.sourceSlug}`">{{ edge.sourceSlug }}</RouterLink>
          <span class="type">{{ formatRelationType(edge.type) }}</span>
          <RouterLink :to="`/@${handle}/${wikiSlug}/${edge.targetSlug}`">{{ edge.label }}</RouterLink>
        </li>
      </ul>
      <p v-else class="muted">
        No typed relationships yet. Add links like
        <code>[[rel:allied_with:house-vale|House Vale]]</code>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.graph-page {
  padding: 2rem 1.25rem 4rem;
}

.inner {
  max-width: 800px;
  margin: 0 auto;
}

header h1 {
  margin: 0.5rem 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.graph {
  width: 100%;
  margin: 1rem 0;
  background: var(--pckt-bg-elevated);
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
}

.edge {
  stroke: var(--pckt-border);
  stroke-width: 1.5;
}

.node {
  fill: var(--pckt-red);
}

.label {
  font-size: 10px;
  fill: var(--pckt-text-muted);
}

.edge-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
}

.edge-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--pckt-border);
  font-size: 0.875rem;
}

.type {
  color: var(--pckt-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
}

code {
  font-family: var(--pckt-font-mono);
  font-size: 0.85em;
}
</style>
