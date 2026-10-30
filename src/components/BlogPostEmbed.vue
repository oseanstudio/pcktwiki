<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { StandardSiteDocument, StandardSitePublication } from '@/types/lichen'
import { getPublicAgent } from '@/lib/atproto/auth'
import {
  documentToPcktBlogUrl,
  formatDocumentDate,
  getStandardDocumentByUri,
} from '@/lib/standardsite/blog'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import BlogLinkCard from '@/components/BlogLinkCard.vue'

const props = defineProps<{
  atUri?: string
  url?: string
  title?: string
  publications?: StandardSitePublication[]
}>()

const post = ref<StandardSiteDocument | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  if (!props.atUri) return
  loading.value = true
  try {
    const agent = getPublicAgent()
    post.value = await getStandardDocumentByUri(agent, props.atUri)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load post'
  } finally {
    loading.value = false
  }
})

function externalUrl(): string | null {
  if (props.url && /^https?:\/\//i.test(props.url)) return props.url
  if (post.value) return documentToPcktBlogUrl(post.value, props.publications?.[0]?.url)
  return null
}
</script>

<template>
  <section class="blog-post-embed card">
    <div v-if="loading" class="muted">Loading post…</div>
    <div v-else-if="error" class="error-text">{{ error }}</div>
    <template v-else-if="post">
      <header>
        <p class="label-tag">From pckt.blog</p>
        <h3>{{ post.title ?? title ?? 'Blog post' }}</h3>
        <time v-if="post.publishedAt || post.updatedAt" class="date">
          {{ formatDocumentDate(post.publishedAt ?? post.updatedAt) }}
        </time>
      </header>
      <MarkdownRenderer v-if="post.content" :source="post.content" />
      <a
        v-if="externalUrl()"
        :href="externalUrl()!"
        target="_blank"
        rel="noopener noreferrer"
        class="read-more"
      >
        Read full post on pckt.blog →
      </a>
    </template>
    <BlogLinkCard v-else-if="url" :url="url" :title="title" />
  </section>
</template>

<style scoped>
.blog-post-embed {
  padding: 1.25rem;
  margin: 1.5rem 0;
}

.label-tag {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pckt-red);
  font-weight: 700;
}

h3 {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.date {
  font-size: 0.8125rem;
  color: var(--pckt-text-subtle);
}

.read-more {
  display: inline-block;
  margin-top: 1rem;
  font-weight: 600;
}
</style>
