<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RelationEdge } from '@/lib/lichen/relations'
import { formatRelationType } from '@/lib/lichen/relations'

defineProps<{
  outgoing: RelationEdge[]
  incoming: RelationEdge[]
  ownerHandle: string
  wikiSlug: string
}>()
</script>

<template>
  <section class="relations card">
    <h2>Relationships</h2>
    <div v-if="outgoing.length" class="rel-group">
      <h3>From this note</h3>
      <ul>
        <li v-for="(edge, idx) in outgoing" :key="`out-${idx}-${edge.targetSlug}`">
          <span class="rel-type">{{ formatRelationType(edge.type) }}</span>
          <RouterLink :to="`/@${ownerHandle}/${wikiSlug}/${edge.targetSlug}`">
            {{ edge.label }}
          </RouterLink>
        </li>
      </ul>
    </div>
    <div v-if="incoming.length" class="rel-group">
      <h3>Referenced as</h3>
      <ul>
        <li v-for="(edge, idx) in incoming" :key="`in-${idx}-${edge.sourceSlug}`">
          <RouterLink :to="`/@${ownerHandle}/${wikiSlug}/${edge.sourceSlug}`">
            {{ edge.sourceSlug }}
          </RouterLink>
          <span class="rel-type">{{ formatRelationType(edge.type) }}</span>
          this note
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.relations {
  margin-top: 2rem;
  padding: 1rem 1.25rem;
}

h2 {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pckt-text-muted);
}

h3 {
  margin: 0.75rem 0 0.35rem;
  font-size: 0.8125rem;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
}

li {
  margin: 0.35rem 0;
}

.rel-type {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pckt-text-muted);
  margin-right: 0.35rem;
}
</style>
