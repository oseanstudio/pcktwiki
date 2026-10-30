<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { WikiGraphEdge } from '@/lib/lichen/guest-feed'
import { wikiPath } from '@/data/featured-wikis'

defineProps<{
  edges: WikiGraphEdge[]
  compact?: boolean
}>()

function edgeBadgeLabel(source: WikiGraphEdge['source']): string {
  if (source === 'curated') return 'Suggested'
  if (source === 'network') return 'Linked'
  return 'Wikilink'
}

function edgeBadgeClass(source: WikiGraphEdge['source']): string {
  if (source === 'curated') return 'badge-curated'
  if (source === 'network') return 'badge-network'
  return 'badge-link'
}
</script>

<template>
  <ul v-if="edges.length" class="connections" :class="{ compact }">
    <li v-for="(edge, index) in edges" :key="`${edge.from.slug}-${edge.to.slug}-${index}`">
      <article class="connection-card">
        <span class="connection-badge" :class="edgeBadgeClass(edge.source)">
          {{ edgeBadgeLabel(edge.source) }}
        </span>
        <div class="connection-endpoints">
          <RouterLink :to="wikiPath(edge.from.handle, edge.from.slug)" class="connection-wiki">
            {{ edge.from.name }}
          </RouterLink>
          <span class="connection-arrow" aria-hidden="true">↔</span>
          <RouterLink :to="wikiPath(edge.to.handle, edge.to.slug)" class="connection-wiki">
            {{ edge.to.name }}
          </RouterLink>
        </div>
        <p class="connection-label">{{ edge.label }}</p>
        <p v-if="!compact" class="connection-hosts muted">
          {{ edge.from.pdsHost }} → {{ edge.to.pdsHost }}
        </p>
        <p v-if="!compact && edge.viaNote" class="connection-via muted">
          Via
          <RouterLink :to="`${wikiPath(edge.from.handle, edge.from.slug)}/${edge.viaNote.slug}`">
            {{ edge.viaNote.title }}
          </RouterLink>
        </p>
      </article>
    </li>
  </ul>
  <p v-else class="connections-empty muted">No cross-wiki links in this topic yet.</p>
</template>

<style scoped>
.connections {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.connections.compact {
  gap: 0.5rem;
}

.connections.compact .connection-card {
  padding: 0.625rem 0.75rem;
}

.connections.compact .connection-label {
  margin-bottom: 0;
}

.connection-card {
  display: flex;
  flex-direction: column;
  padding: 0.875rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg);
}

.connection-endpoints {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.5rem;
  margin-bottom: 0.375rem;
}

.connection-wiki {
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 800;
  color: inherit;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.connection-wiki:hover {
  color: var(--pckt-red);
}

.connection-arrow {
  color: var(--pckt-blue);
  font-weight: 900;
  flex-shrink: 0;
}

.connection-label {
  margin: 0 0 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--pckt-text);
}

.connection-hosts {
  margin: 0;
  font-size: 0.6875rem;
}

.connection-via {
  margin: 0.375rem 0 0;
  font-size: 0.75rem;
}

.connection-via a {
  color: var(--pckt-red);
  font-weight: 600;
}

.connection-badge {
  align-self: flex-end;
  margin: -0.125rem 0 0.25rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.125rem 0.375rem;
  border-radius: var(--pckt-radius-pill);
}

.connections.compact .connection-badge {
  margin-bottom: 0.375rem;
}

.badge-curated {
  background: color-mix(in srgb, var(--pckt-blue) 12%, transparent);
  color: var(--pckt-blue);
}

.badge-link {
  background: color-mix(in srgb, var(--pckt-green) 12%, transparent);
  color: var(--pckt-green-active);
}

.badge-network {
  background: color-mix(in srgb, var(--pckt-red) 12%, transparent);
  color: var(--pckt-red);
}

.connections-empty {
  margin: 0;
  font-size: 0.875rem;
}
</style>
