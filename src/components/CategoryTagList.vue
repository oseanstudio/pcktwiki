<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { WikiCategory } from '@/lib/lichen/categories'
import { categorySlug } from '@/lib/lichen/content-meta'

defineProps<{
  categories: WikiCategory[]
  ownerHandle: string
  wikiSlug: string
  noteCategories?: string[]
}>()
</script>

<template>
  <div v-if="categories.length || (noteCategories && noteCategories.length)" class="category-tags">
    <RouterLink
      v-for="name in noteCategories ?? []"
      :key="name"
      :to="`/@${ownerHandle}/${wikiSlug}/category/${categorySlug(name)}`"
      class="category-tag"
    >
      {{ name }}
    </RouterLink>
    <template v-if="!noteCategories">
      <RouterLink
        v-for="cat in categories"
        :key="cat.slug"
        :to="`/@${ownerHandle}/${wikiSlug}/category/${cat.slug}`"
        class="category-tag"
      >
        {{ cat.name }} ({{ cat.count }})
      </RouterLink>
    </template>
  </div>
</template>

<style scoped>
.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.category-tag {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--pckt-radius-pill);
  background: color-mix(in srgb, var(--pckt-blue) 12%, var(--pckt-bg-elevated));
  color: var(--pckt-blue-active);
  text-decoration: none;
  font-weight: 600;
}

.category-tag:hover {
  background: color-mix(in srgb, var(--pckt-blue) 20%, var(--pckt-bg-elevated));
  text-decoration: none;
}
</style>
