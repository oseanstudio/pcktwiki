import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Agent } from '@atproto/api'
import type {
  ActorProfile,
  StandardSiteDocument,
  StandardSitePublication,
  WikiPageRecord,
  WikiSpace,
} from '@/types/wiki'
import {
  createBlogListPage,
  createDefaultHomePage,
  createDefaultSpace,
  createWikiPage,
  deleteWikiPage,
  getWikiPageBySlug,
  getWikiSpace,
  listWikiPages,
  pageRecordKeyFromUri,
  putWikiSpace,
  putWikiPage,
} from '@/lib/atproto/wiki'
import {
  getActorProfile,
  listStandardDocuments,
  listStandardPublications,
} from '@/lib/standardsite/blog'
import { slugify } from '@/lib/config'
import { generateRecordKey } from '@/lib/atproto/auth'

export const useWikiStore = defineStore('wiki', () => {
  const space = ref<WikiSpace | null>(null)
  const pages = ref<WikiPageRecord[]>([])
  const profile = ref<ActorProfile | null>(null)
  const publications = ref<StandardSitePublication[]>([])
  const blogPosts = ref<StandardSiteDocument[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function loadOwnWiki(agent: Agent): Promise<void> {
    await loadWikiForDid(agent, agent.accountDid)
  }

  async function loadWikiForDid(agent: Agent, did: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [spaceData, pageData, profileData, publicationData, documentData] = await Promise.all([
        getWikiSpace(agent, did),
        listWikiPages(agent, did),
        getActorProfile(agent, did),
        listStandardPublications(agent, did),
        listStandardDocuments(agent, did),
      ])

      space.value = spaceData
      pages.value = pageData
      profile.value = profileData
      publications.value = publicationData
      blogPosts.value = documentData
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load wiki'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureInitialized(agent: Agent, displayName?: string): Promise<void> {
    if (!space.value) {
      const defaultSpace = createDefaultSpace(displayName ?? 'My Wiki')
      await putWikiSpace(agent, defaultSpace)
      space.value = defaultSpace
    }

    if (pages.value.length === 0) {
      const home = await createWikiPage(agent, createDefaultHomePage(), 'home')
      const blog = await createWikiPage(agent, createBlogListPage(), generateRecordKey())
      pages.value = [home, blog]

      if (space.value) {
        space.value.navOrder = ['home', 'blog']
        space.value.updatedAt = new Date().toISOString()
        await putWikiSpace(agent, space.value)
      }
    }
  }

  async function saveSpace(agent: Agent, nextSpace: WikiSpace): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const payload = { ...nextSpace, updatedAt: new Date().toISOString() }
      await putWikiSpace(agent, payload)
      space.value = payload
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save wiki settings'
      throw err
    } finally {
      saving.value = false
    }
  }

  async function savePage(agent: Agent, page: WikiPageRecord): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const rkey = pageRecordKeyFromUri(page.uri) ?? page.slug
      const { uri, cid, ...payload } = page
      const record = { ...payload, updatedAt: new Date().toISOString() }
      const result = await putWikiPage(agent, rkey, record)
      const updated = { ...record, uri: result.uri, cid: result.cid }
      const index = pages.value.findIndex((item) => item.uri === page.uri || item.slug === page.slug)
      if (index >= 0) {
        pages.value[index] = updated
      } else {
        pages.value.push(updated)
      }
      pages.value.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save page'
      throw err
    } finally {
      saving.value = false
    }
  }

  async function createPage(
    agent: Agent,
    title: string,
    body = '',
    pageType: WikiPageRecord['pageType'] = 'page',
  ): Promise<WikiPageRecord> {
    const slug = uniqueSlug(title)
    const now = new Date().toISOString()
    const page = await createWikiPage(agent, {
      title,
      slug,
      body,
      pageType,
      order: pages.value.length,
      createdAt: now,
      updatedAt: now,
    })

    pages.value.push(page)
    pages.value.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    if (space.value) {
      const navOrder = [...(space.value.navOrder ?? []), slug]
      await saveSpace(agent, { ...space.value, navOrder })
    }

    return page
  }

  async function removePage(agent: Agent, page: WikiPageRecord): Promise<void> {
    const rkey = pageRecordKeyFromUri(page.uri)
    if (!rkey) return
    await deleteWikiPage(agent, rkey)
    pages.value = pages.value.filter((item) => item.uri !== page.uri)

    if (space.value) {
      const navOrder = (space.value.navOrder ?? []).filter((slug) => slug !== page.slug)
      await saveSpace(agent, { ...space.value, navOrder })
    }
  }

  function uniqueSlug(title: string): string {
    const base = slugify(title) || 'page'
    let candidate = base
    let counter = 2
    while (pages.value.some((page) => page.slug === candidate)) {
      candidate = `${base}-${counter}`
      counter += 1
    }
    return candidate
  }

  function getPageBySlug(slug: string): WikiPageRecord | undefined {
    return pages.value.find((page) => page.slug === slug)
  }

  async function fetchPageBySlug(agent: Agent, did: string, slug: string): Promise<WikiPageRecord | null> {
    return getWikiPageBySlug(agent, did, slug)
  }

  function reset(): void {
    space.value = null
    pages.value = []
    profile.value = null
    publications.value = []
    blogPosts.value = []
    error.value = null
  }

  return {
    space,
    pages,
    profile,
    publications,
    blogPosts,
    loading,
    saving,
    error,
    loadOwnWiki,
    loadWikiForDid,
    ensureInitialized,
    saveSpace,
    savePage,
    createPage,
    removePage,
    getPageBySlug,
    fetchPageBySlug,
    reset,
  }
})
