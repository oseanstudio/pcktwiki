<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicAgent, resolveHandleToDid } from '@/lib/atproto/auth'
import { getWikiSpace, listWikiPages } from '@/lib/atproto/wiki'
import { getActorProfile, listStandardDocuments, listStandardPublications } from '@/lib/standardsite/blog'
import { applyWikiTheme, resetAppTheme } from '@/lib/theme'
import { normalizeHandle } from '@/lib/config'
import type { ActorProfile, StandardSiteDocument, StandardSitePublication, WikiPageRecord, WikiSpace } from '@/types/wiki'
import WikiHero from '@/components/WikiHero.vue'
import WikiNav from '@/components/WikiNav.vue'
import WikiPageContent from '@/components/WikiPageContent.vue'

const route = useRoute()

const handle = computed(() => normalizeHandle(route.params.handle as string))
const slug = computed(() => route.params.slug as string | undefined)

const space = ref<WikiSpace | null>(null)
const pages = ref<WikiPageRecord[]>([])
const profile = ref<ActorProfile | null>(null)
const publications = ref<StandardSitePublication[]>([])
const blogPosts = ref<StandardSiteDocument[]>([])
const currentPage = ref<WikiPageRecord | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const did = ref<string | null>(null)

async function loadWiki() {
  loading.value = true
  error.value = null
  currentPage.value = null

  try {
    const agent = getPublicAgent()
    did.value = await resolveHandleToDid(handle.value)

    const [spaceData, pageData, profileData, publicationData, documentData] = await Promise.all([
      getWikiSpace(agent, did.value),
      listWikiPages(agent, did.value),
      getActorProfile(agent, did.value),
      listStandardPublications(agent, did.value),
      listStandardDocuments(agent, did.value),
    ])

    space.value = spaceData
    pages.value = pageData
    profile.value = { ...profileData, handle: handle.value }
    publications.value = publicationData
    blogPosts.value = documentData

    if (spaceData?.theme) {
      applyWikiTheme(spaceData.theme)
    } else {
      resetAppTheme()
    }

    const targetSlug = slug.value ?? spaceData?.homeSlug ?? 'home'
    currentPage.value = pageData.find((page) => page.slug === targetSlug) ?? pageData[0] ?? null

    if (!currentPage.value && pageData.length === 0 && !spaceData) {
      error.value = 'This account has not set up a wiki yet.'
    } else if (!currentPage.value && slug.value) {
      error.value = 'Page not found.'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load wiki'
    resetAppTheme()
  } finally {
    loading.value = false
  }
}

onMounted(loadWiki)

watch(() => [route.params.handle, route.params.slug], loadWiki)

const activeSlug = computed(() => currentPage.value?.slug)
</script>

<template>
  <div class="wiki-view">
    <div class="wiki-layout">
      <aside v-if="pages.length" class="wiki-sidebar">
        <WikiNav
          :pages="pages"
          :nav-order="space?.navOrder"
          :handle="handle"
          :active-slug="activeSlug"
        />
      </aside>

      <div class="wiki-main">
        <div v-if="loading" class="state muted">Loading wiki…</div>
        <div v-else-if="error" class="state">
          <WikiHero :space="space" :profile="profile" :handle="handle" />
          <p class="error-text">{{ error }}</p>
          <p v-if="profile?.description" class="muted profile-fallback">{{ profile.description }}</p>
        </div>
        <template v-else>
          <WikiHero :space="space" :profile="profile" :handle="handle" />
          <WikiPageContent
            v-if="currentPage"
            :page="currentPage"
            :blog-posts="blogPosts"
            :publications="publications"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wiki-view {
  padding: 2rem 1.25rem 4rem;
}

.wiki-layout {
  max-width: calc(var(--pckt-content-width) + 240px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2.5rem;
  align-items: start;
}

@media (max-width: 768px) {
  .wiki-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.wiki-sidebar {
  position: sticky;
  top: 5rem;
}

.wiki-main {
  min-width: 0;
  max-width: var(--pckt-content-width);
}

.state {
  padding: 2rem 0;
}

.profile-fallback {
  margin-top: 1rem;
  max-width: 52ch;
}
</style>
