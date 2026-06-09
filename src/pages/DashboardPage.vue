<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWikiStore } from '@/stores/wiki'
import { handleToWikiPath } from '@/lib/config'
import { applyWikiTheme } from '@/lib/theme'

const auth = useAuthStore()
const wiki = useWikiStore()
const initializing = ref(true)

const wikiPath = computed(() => (auth.handle ? handleToWikiPath(auth.handle) : null))

onMounted(async () => {
  if (!auth.agent) return
  try {
    await wiki.loadOwnWiki(auth.agent)
    await wiki.ensureInitialized(auth.agent, auth.handle ?? undefined)
    if (wiki.space?.theme) applyWikiTheme(wiki.space.theme)
  } finally {
    initializing.value = false
  }
})

async function createPage() {
  if (!auth.agent) return
  const title = window.prompt('Page title')
  if (!title) return
  const page = await wiki.createPage(auth.agent, title)
  window.location.href = `/edit/${page.slug}`
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-inner">
      <header class="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">Manage your wiki for @{{ auth.handle }}</p>
        </div>
        <div class="actions">
          <RouterLink v-if="wikiPath" :to="wikiPath" class="btn btn-secondary">View wiki</RouterLink>
          <RouterLink to="/settings" class="btn btn-secondary">Settings</RouterLink>
          <button type="button" class="btn btn-primary" @click="createPage">New page</button>
        </div>
      </header>

      <div v-if="initializing || wiki.loading" class="muted">Loading your wiki…</div>
      <div v-else-if="wiki.error" class="error-text">{{ wiki.error }}</div>

      <template v-else>
        <section class="stats">
          <div class="stat card">
            <span class="stat-value">{{ wiki.pages.length }}</span>
            <span class="stat-label">Pages</span>
          </div>
          <div class="stat card">
            <span class="stat-value">{{ wiki.blogPosts.length }}</span>
            <span class="stat-label">Blog posts imported</span>
          </div>
          <div class="stat card">
            <span class="stat-value">{{ wiki.publications.length }}</span>
            <span class="stat-label">Publications</span>
          </div>
        </section>

        <section class="pages-section card">
          <h2>Pages</h2>
          <ul v-if="wiki.pages.length" class="page-list">
            <li v-for="page in wiki.pages" :key="page.slug" class="page-item">
              <div>
                <strong>{{ page.title }}</strong>
                <span class="slug">/{{ page.slug }}</span>
                <span v-if="page.pageType === 'blog-list'" class="badge">Blog</span>
              </div>
              <div class="page-actions">
                <RouterLink :to="`/edit/${page.slug}`" class="btn btn-ghost">Edit</RouterLink>
                <button
                  v-if="page.slug !== 'home'"
                  type="button"
                  class="btn btn-ghost"
                  @click="wiki.removePage(auth.agent!, page)"
                >
                  Delete
                </button>
              </div>
            </li>
          </ul>
          <p v-else class="muted">No pages yet.</p>
        </section>

        <section v-if="wiki.blogPosts.length" class="import-section card">
          <h2>Imported from pckt.blog</h2>
          <p class="muted">These posts are read from your AT Protocol records and can be embedded in wiki pages.</p>
          <ul class="import-list">
            <li v-for="post in wiki.blogPosts.slice(0, 5)" :key="post.uri">
              {{ post.title ?? 'Untitled' }}
            </li>
          </ul>
          <p v-if="wiki.blogPosts.length > 5" class="muted">
            + {{ wiki.blogPosts.length - 5 }} more posts
          </p>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem 1.25rem 4rem;
}

.dashboard-inner {
  max-width: 900px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.dashboard-header h1 {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat {
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--pckt-accent);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--pckt-text-muted);
}

.pages-section,
.import-section {
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.pages-section h2,
.import-section h2 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.page-list,
.import-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.page-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--pckt-border);
}

.page-item:last-child {
  border-bottom: none;
}

.slug {
  margin-left: 0.5rem;
  color: var(--pckt-text-subtle);
  font-size: 0.875rem;
}

.badge {
  margin-left: 0.5rem;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--pckt-accent-soft);
  color: var(--pckt-accent);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 700;
}

.page-actions {
  display: flex;
  gap: 0.25rem;
}

.import-list li {
  padding: 0.375rem 0;
  color: var(--pckt-text-muted);
}
</style>
