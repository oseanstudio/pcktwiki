<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Backlink } from '@/lib/lichen/backlinks'

defineProps<{
  backlinks: Backlink[]
  ownerHandle: string
  wikiSlug: string
}>()
</script>

<template>
  <section v-if="backlinks.length" class="backlinks card">
    <h2>Backlinks</h2>
    <ul>
      <li v-for="link in backlinks" :key="`${link.sourceNoteUri}-${link.targetNoteSlug}`">
        <RouterLink :to="`/@${ownerHandle}/${wikiSlug}/${link.sourceSlug}`">
          {{ link.sourceTitle }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.backlinks {
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

ul {
  margin: 0;
  padding-left: 1.25rem;
}

li {
  margin: 0.375rem 0;
}
</style>
