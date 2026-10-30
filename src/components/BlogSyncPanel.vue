<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { BlogStubSuggestion } from '@/lib/blog-sync'
import { documentToPcktBlogUrl } from '@/lib/standardsite/blog'
import type { StandardSitePublication } from '@/types/lichen'

const props = defineProps<{
  suggestions: BlogStubSuggestion[]
  ownerHandle: string
  wikiSlug: string
  publications: StandardSitePublication[]
  creating?: boolean
}>()

const emit = defineEmits<{
  createAll: []
  createOne: [suggestion: BlogStubSuggestion]
}>()

const hasSuggestions = computed(() => props.suggestions.length > 0)
</script>

<template>
  <section v-if="hasSuggestions" class="blog-sync card">
    <h2>pckt.blog sync</h2>
    <p class="muted">
      Create wiki stubs for blog posts — linked via <code>blog-path</code> frontmatter (no new lexicon types).
    </p>
    <ul class="sync-list">
      <li v-for="item in suggestions" :key="item.post.uri">
        <div>
          <strong>{{ item.post.title ?? 'Untitled' }}</strong>
          <span class="muted"> → {{ item.suggestedSlug }}</span>
        </div>
        <div class="sync-actions">
          <a
            v-if="documentToPcktBlogUrl(item.post, publications[0]?.url)"
            :href="documentToPcktBlogUrl(item.post, publications[0]?.url)!"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-ghost btn-sm"
          >
            Blog
          </a>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="creating"
            @click="emit('createOne', item)"
          >
            Create stub
          </button>
        </div>
      </li>
    </ul>
    <button
      type="button"
      class="btn btn-primary btn-sm"
      :disabled="creating"
      @click="emit('createAll')"
    >
      {{ creating ? 'Creating…' : `Create all ${suggestions.length} stubs` }}
    </button>
    <p class="muted hint">
      Stubs appear in
      <RouterLink :to="`/@${ownerHandle}/${wikiSlug}/blog`">blog</RouterLink>
      and link back to pckt.blog.
    </p>
  </section>
</template>

<style scoped>
.blog-sync {
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.blog-sync h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.sync-list {
  list-style: none;
  margin: 1rem 0;
  padding: 0;
}

.sync-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--pckt-border);
  flex-wrap: wrap;
}

.sync-actions {
  display: flex;
  gap: 0.35rem;
}

.hint {
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

code {
  font-family: var(--pckt-font-mono);
  font-size: 0.85em;
}
</style>
