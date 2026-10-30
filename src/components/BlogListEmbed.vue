<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { LichenNoteWithContent, StandardSiteDocument, StandardSitePublication } from '@/types/lichen'
import { documentToPcktBlogUrl, formatDocumentDate } from '@/lib/standardsite/blog'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const props = defineProps<{
  posts: StandardSiteDocument[]
  publications: StandardSitePublication[]
  wikiNoteLinks?: Map<string, LichenNoteWithContent>
  ownerHandle?: string
  wikiSlug?: string
}>()
</script>

<template>
  <section class="blog-list">
    <div v-if="posts.length === 0" class="empty card">
      <p class="muted">No pckt.blog posts found on this account yet.</p>
      <p class="muted">
        Connect your blog on
        <a href="https://pckt.blog" target="_blank" rel="noopener noreferrer">pckt.blog</a>
        and sync to AT Protocol to see posts here.
      </p>
    </div>

    <article v-for="post in posts" :key="post.uri" class="post-card card">
      <header>
        <h3>{{ post.title ?? 'Untitled post' }}</h3>
        <time v-if="post.publishedAt || post.updatedAt" class="date">
          {{ formatDocumentDate(post.publishedAt ?? post.updatedAt) }}
        </time>
      </header>
      <p v-if="post.description" class="description">{{ post.description }}</p>
      <MarkdownRenderer
        v-if="post.content"
        :source="post.content.slice(0, 600) + (post.content.length > 600 ? '…' : '')"
      />
      <footer class="post-footer">
        <RouterLink
          v-if="wikiNoteLinks?.get(post.uri) && ownerHandle && wikiSlug"
          :to="`/@${ownerHandle}/${wikiSlug}/${wikiNoteLinks.get(post.uri)!.slug}`"
          class="wiki-link"
        >
          Wiki articles →
        </RouterLink>
        <a
          v-if="documentToPcktBlogUrl(post, publications[0]?.url)"
          :href="documentToPcktBlogUrl(post, publications[0]?.url)!"
          target="_blank"
          rel="noopener noreferrer"
          class="read-more"
        >
          Read on pckt.blog →
        </a>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.blog-list {
  display: grid;
  gap: 1rem;
}

.empty {
  padding: 1.5rem;
}

.post-card {
  padding: 1.25rem;
}

.post-card header {
  margin-bottom: 0.75rem;
}

.post-card h3 {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-content);
  font-size: 1.25rem;
}

.date {
  font-size: 0.8125rem;
  color: var(--pckt-text-subtle);
}

.description {
  color: var(--pckt-text-muted);
  margin: 0 0 0.75rem;
}

.post-footer {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.read-more,
.wiki-link {
  font-weight: 600;
  font-size: 0.9375rem;
}
</style>
