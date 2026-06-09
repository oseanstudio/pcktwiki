<script setup lang="ts">
import { computed } from 'vue'
import type { WikiPageRecord } from '@/types/wiki'
import { RouterLink } from 'vue-router'
import { handleToWikiPath } from '@/lib/config'

const props = defineProps<{
  pages: WikiPageRecord[]
  navOrder?: string[]
  handle: string
  activeSlug?: string
}>()

const orderedPages = computed(() => {
  const order = props.navOrder ?? []
  const bySlug = new Map(props.pages.map((page) => [page.slug, page]))
  const ordered = order
    .map((slug) => bySlug.get(slug))
    .filter((page): page is WikiPageRecord => !!page)

  for (const page of props.pages) {
    if (!order.includes(page.slug)) ordered.push(page)
  }

  return ordered
})

const basePath = computed(() => handleToWikiPath(props.handle))
</script>

<template>
  <nav class="wiki-nav" aria-label="Wiki pages">
    <RouterLink
      v-for="page in orderedPages"
      :key="page.slug"
      :to="`${basePath}/${page.slug}`"
      class="wiki-nav-link"
      :class="{ active: page.slug === activeSlug }"
    >
      {{ page.title }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.wiki-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.wiki-nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: var(--pckt-radius-sm);
  color: var(--pckt-text-muted);
  text-decoration: none;
  font-size: 0.9375rem;
}

.wiki-nav-link:hover,
.wiki-nav-link.active {
  background: var(--pckt-accent-soft);
  color: var(--pckt-accent);
  text-decoration: none;
}
</style>
