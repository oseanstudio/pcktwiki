<script setup lang="ts">
import { computed } from 'vue'
import type { StandardSiteDocument, StandardSitePublication, WikiEmbed, WikiPageRecord } from '@/types/wiki'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import BlogListEmbed from '@/components/BlogListEmbed.vue'
import BlogPostEmbed from '@/components/BlogPostEmbed.vue'
import BlogLinkCard from '@/components/BlogLinkCard.vue'

const props = defineProps<{
  page: WikiPageRecord
  blogPosts?: StandardSiteDocument[]
  publications?: StandardSitePublication[]
}>()

const showBlogList = computed(() => {
  return props.page.pageType === 'blog-list' || props.page.embeds?.some((embed) => embed.type === 'blog-list')
})

const postEmbeds = computed(() => {
  return (props.page.embeds ?? []).filter((embed) => embed.type === 'blog-post')
})

const linkEmbeds = computed(() => {
  return (props.page.embeds ?? []).filter((embed) => embed.type === 'link-card' && embed.url)
})

function embedKey(embed: WikiEmbed, index: number): string {
  return embed.atUri ?? embed.url ?? `${embed.type}-${index}`
}
</script>

<template>
  <article class="page-content">
    <header v-if="page.title" class="page-header">
      <h1>{{ page.title }}</h1>
    </header>

    <MarkdownRenderer v-if="page.body" :source="page.body" />

    <BlogListEmbed
      v-if="showBlogList"
      :posts="blogPosts ?? []"
      :publications="publications ?? []"
    />

    <BlogPostEmbed
      v-for="(embed, index) in postEmbeds"
      :key="embedKey(embed, index)"
      :at-uri="embed.atUri"
      :url="embed.url"
      :title="embed.title"
      :publications="publications"
    />

    <BlogLinkCard
      v-for="(embed, index) in linkEmbeds"
      :key="embedKey(embed, index)"
      :url="embed.url!"
      :title="embed.title"
    />
  </article>
</template>

<style scoped>
.page-header h1 {
  margin: 0 0 1.5rem;
  font-family: var(--pckt-font-content);
  font-size: 2rem;
  line-height: 1.2;
}
</style>
