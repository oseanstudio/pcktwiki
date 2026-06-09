<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWikiStore } from '@/stores/wiki'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import { isValidSlug, slugify } from '@/lib/config'
import type { WikiEmbed } from '@/types/wiki'

const auth = useAuthStore()
const wiki = useWikiStore()
const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)
const page = ref(wiki.getPageBySlug(slug.value))
const title = ref(page.value?.title ?? '')
const body = ref(page.value?.body ?? '')
const pageSlug = ref(page.value?.slug ?? slug.value)
const pageType = ref(page.value?.pageType ?? 'page')
const embeds = ref<WikiEmbed[]>(page.value?.embeds ?? [])
const preview = ref(false)
const embedUrl = ref('')
const embedTitle = ref('')
const selectedPostUri = ref('')

onMounted(async () => {
  if (!auth.agent) return
  if (!wiki.pages.length) {
    await wiki.loadOwnWiki(auth.agent)
  }
  page.value = wiki.getPageBySlug(slug.value)
  if (!page.value) {
    router.replace('/dashboard')
    return
  }
  title.value = page.value.title
  body.value = page.value.body
  pageSlug.value = page.value.slug
  pageType.value = page.value.pageType ?? 'page'
  embeds.value = [...(page.value.embeds ?? [])]
})

watch(title, (value) => {
  if (!page.value || page.value.slug === 'home') return
  pageSlug.value = slugify(value) || pageSlug.value
})

async function save() {
  if (!auth.agent || !page.value) return
  if (!isValidSlug(pageSlug.value)) {
    window.alert('Slug must be lowercase letters, numbers, and hyphens.')
    return
  }

  const updated = {
    ...page.value,
    title: title.value,
    body: body.value,
    slug: pageSlug.value,
    pageType: pageType.value,
    embeds: embeds.value,
  }

  await wiki.savePage(auth.agent, updated)
  if (pageSlug.value !== slug.value) {
    router.replace(`/edit/${pageSlug.value}`)
  }
}

function addBlogListEmbed() {
  pageType.value = 'blog-list'
  if (!embeds.value.some((embed) => embed.type === 'blog-list')) {
    embeds.value.push({ type: 'blog-list' })
  }
}

function addPostEmbed() {
  if (!selectedPostUri.value) return
  const post = wiki.blogPosts.find((item) => item.uri === selectedPostUri.value)
  embeds.value.push({
    type: 'blog-post',
    atUri: selectedPostUri.value,
    title: post?.title,
  })
  selectedPostUri.value = ''
}

function addLinkEmbed() {
  if (!embedUrl.value) return
  embeds.value.push({
    type: 'link-card',
    url: embedUrl.value,
    title: embedTitle.value || undefined,
  })
  embedUrl.value = ''
  embedTitle.value = ''
}

function removeEmbed(index: number) {
  embeds.value.splice(index, 1)
}
</script>

<template>
  <div class="edit-page">
    <div class="edit-inner">
      <header class="edit-header">
        <div>
          <h1>Edit page</h1>
          <p class="muted">/{{ pageSlug }}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-secondary" @click="preview = !preview">
            {{ preview ? 'Edit' : 'Preview' }}
          </button>
          <button type="button" class="btn btn-primary" :disabled="wiki.saving" @click="save">
            {{ wiki.saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </header>

      <div v-if="!preview" class="editor-layout">
        <div class="editor-main">
          <div class="field">
            <label class="label" for="title">Title</label>
            <input id="title" v-model="title" class="input" type="text" />
          </div>

          <div class="field">
            <label class="label" for="slug">Slug</label>
            <input
              id="slug"
              v-model="pageSlug"
              class="input"
              type="text"
              :disabled="page?.slug === 'home'"
            />
          </div>

          <div class="field">
            <label class="label" for="body">Body (Markdown)</label>
            <MarkdownEditor id="body" v-model="body" placeholder="Write your page in Markdown…" />
          </div>
        </div>

        <aside class="editor-sidebar card">
          <h2>Embeds</h2>
          <p class="muted">Embed your pckt.blog into this wiki page.</p>

          <button type="button" class="btn btn-secondary embed-btn" @click="addBlogListEmbed">
            Add blog list
          </button>

          <div class="field">
            <label class="label" for="post-select">Embed a blog post</label>
            <select id="post-select" v-model="selectedPostUri" class="select">
              <option value="">Select a post…</option>
              <option v-for="post in wiki.blogPosts" :key="post.uri" :value="post.uri">
                {{ post.title ?? 'Untitled' }}
              </option>
            </select>
            <button
              type="button"
              class="btn btn-secondary embed-btn"
              :disabled="!selectedPostUri"
              @click="addPostEmbed"
            >
              Add post embed
            </button>
          </div>

          <div class="field">
            <label class="label" for="embed-url">pckt.blog URL</label>
            <input id="embed-url" v-model="embedUrl" class="input" type="url" placeholder="https://…pckt.blog/…" />
            <input v-model="embedTitle" class="input" type="text" placeholder="Link title (optional)" />
            <button type="button" class="btn btn-secondary embed-btn" :disabled="!embedUrl" @click="addLinkEmbed">
              Add link card
            </button>
          </div>

          <ul v-if="embeds.length" class="embed-list">
            <li v-for="(embed, index) in embeds" :key="`${embed.type}-${index}`">
              <span>{{ embed.type }}{{ embed.title ? `: ${embed.title}` : '' }}</span>
              <button type="button" class="btn btn-ghost" @click="removeEmbed(index)">Remove</button>
            </li>
          </ul>
        </aside>
      </div>

      <div v-else class="preview card">
        <h2>{{ title }}</h2>
        <MarkdownRenderer :source="body" />
      </div>

      <p v-if="wiki.error" class="error-text">{{ wiki.error }}</p>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  padding: 2rem 1.25rem 4rem;
}

.edit-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.edit-header h1 {
  margin: 0;
  font-family: var(--pckt-font-content);
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 860px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

.editor-sidebar {
  padding: 1rem;
  position: sticky;
  top: 5rem;
}

.editor-sidebar h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.embed-btn {
  width: 100%;
  margin-top: 0.5rem;
}

.embed-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.embed-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-top: 1px solid var(--pckt-border);
  font-size: 0.875rem;
}

.preview {
  padding: 1.5rem;
}

.preview h2 {
  margin: 0 0 1rem;
  font-family: var(--pckt-font-content);
}
</style>
