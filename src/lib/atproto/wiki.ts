import type { Agent } from '@atproto/api'
import type { WikiPage, WikiPageRecord, WikiSpace } from '@/types/wiki'
import {
  WIKI_PAGE_COLLECTION,
  WIKI_SPACE_COLLECTION,
  WIKI_SPACE_RKEY,
} from '@/types/wiki'
import { generateRecordKey } from '@/lib/atproto/auth'

export async function getWikiSpace(agent: Agent, did: string): Promise<WikiSpace | null> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: WIKI_SPACE_COLLECTION,
      rkey: WIKI_SPACE_RKEY,
    })
    return response.data.value as unknown as WikiSpace
  } catch {
    return null
  }
}

export async function putWikiSpace(agent: Agent, space: WikiSpace): Promise<void> {
  await agent.com.atproto.repo.putRecord({
    repo: agent.accountDid,
    collection: WIKI_SPACE_COLLECTION,
    rkey: WIKI_SPACE_RKEY,
    record: space as unknown as Record<string, unknown>,
  })
}

export async function listWikiPages(agent: Agent, did: string): Promise<WikiPageRecord[]> {
  const pages: WikiPageRecord[] = []
  let cursor: string | undefined

  do {
    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: WIKI_PAGE_COLLECTION,
      limit: 100,
      cursor,
    })

    for (const record of response.data.records) {
      pages.push({
        ...(record.value as unknown as WikiPage),
        uri: record.uri,
        cid: record.cid,
      })
    }

    cursor = response.data.cursor
  } while (cursor)

  return pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function getWikiPageBySlug(
  agent: Agent,
  did: string,
  slug: string,
): Promise<WikiPageRecord | null> {
  const pages = await listWikiPages(agent, did)
  return pages.find((page) => page.slug === slug) ?? null
}

export async function putWikiPage(
  agent: Agent,
  rkey: string,
  page: WikiPage,
): Promise<{ uri: string; cid: string }> {
  const response = await agent.com.atproto.repo.putRecord({
    repo: agent.accountDid,
    collection: WIKI_PAGE_COLLECTION,
    rkey,
    record: page as unknown as Record<string, unknown>,
  })
  return { uri: response.data.uri, cid: response.data.cid }
}

export async function deleteWikiPage(agent: Agent, rkey: string): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.accountDid,
    collection: WIKI_PAGE_COLLECTION,
    rkey,
  })
}

export function pageRecordKeyFromUri(uri: string): string | null {
  const parts = uri.split('/')
  return parts[parts.length - 1] ?? null
}

export function createDefaultSpace(title: string): WikiSpace {
  const now = new Date().toISOString()
  return {
    title,
    description: 'My personal wiki on the open social web',
    homeSlug: 'home',
    navOrder: ['home'],
    theme: {
      accentColor: '#2d5016',
      fontFamily: 'Literata',
      mode: 'light',
      layoutWidth: 'medium',
    },
    createdAt: now,
    updatedAt: now,
  }
}

export function createDefaultHomePage(): WikiPage {
  const now = new Date().toISOString()
  return {
    title: 'Home',
    slug: 'home',
    body: `# Welcome to your wiki

This is your home page. Edit it from the dashboard to make it yours.

## What you can do

- Write pages in **Markdown**
- Import your **pckt.blog** posts automatically
- Style your wiki with custom colors and fonts
- Share your wiki at \`/@your-handle\`

Your wiki lives in your AT Protocol account — portable, owned by you.`,
    order: 0,
    pageType: 'page',
    createdAt: now,
    updatedAt: now,
  }
}

export function createBlogListPage(): WikiPage {
  const now = new Date().toISOString()
  return {
    title: 'Blog',
    slug: 'blog',
    body: 'Posts from your pckt.blog, embedded in your wiki.',
    order: 1,
    pageType: 'blog-list',
    embeds: [{ type: 'blog-list' }],
    createdAt: now,
    updatedAt: now,
  }
}

export async function createWikiPage(
  agent: Agent,
  page: WikiPage,
  rkey = generateRecordKey(),
): Promise<WikiPageRecord> {
  const result = await putWikiPage(agent, rkey, page)
  return { ...page, uri: result.uri, cid: result.cid }
}
