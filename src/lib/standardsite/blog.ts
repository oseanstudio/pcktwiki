import type { Agent } from '@atproto/api'
import type {
  ActorProfile,
  StandardSiteDocument,
  StandardSitePublication,
} from '@/types/lichen'

export const STANDARD_PUBLICATION = 'site.standard.publication'
export const STANDARD_DOCUMENT = 'site.standard.document'

export async function getActorProfile(agent: Agent, did: string): Promise<ActorProfile> {
  try {
    const response = await agent.getProfile({ actor: did })
    return {
      displayName: response.data.displayName,
      description: response.data.description,
      avatar: response.data.avatar,
      handle: response.data.handle,
    }
  } catch {
    return {}
  }
}

export async function listStandardPublications(
  agent: Agent,
  did: string,
): Promise<StandardSitePublication[]> {
  const publications: StandardSitePublication[] = []
  let cursor: string | undefined

  do {
    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: STANDARD_PUBLICATION,
      limit: 50,
      cursor,
    })

    for (const record of response.data.records) {
      const value = record.value as Record<string, unknown>
      publications.push({
        uri: record.uri,
        name: value.name as string | undefined,
        description: value.description as string | undefined,
        url: value.url as string | undefined,
      })
    }

    cursor = response.data.cursor
  } while (cursor)

  return publications
}

export async function listStandardDocuments(
  agent: Agent,
  did: string,
): Promise<StandardSiteDocument[]> {
  const documents: StandardSiteDocument[] = []
  let cursor: string | undefined

  do {
    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: STANDARD_DOCUMENT,
      limit: 100,
      cursor,
    })

    for (const record of response.data.records) {
      const value = record.value as Record<string, unknown>
      documents.push({
        uri: record.uri,
        cid: record.cid,
        title: value.title as string | undefined,
        path: value.path as string | undefined,
        description: value.description as string | undefined,
        content: value.content as string | undefined,
        publishedAt: value.publishedAt as string | undefined,
        updatedAt: value.updatedAt as string | undefined,
      })
    }

    cursor = response.data.cursor
  } while (cursor)

  return documents.sort((a, b) => {
    const aDate = a.publishedAt ?? a.updatedAt ?? ''
    const bDate = b.publishedAt ?? b.updatedAt ?? ''
    return bDate.localeCompare(aDate)
  })
}

export async function getStandardDocumentByUri(
  agent: Agent,
  atUri: string,
): Promise<StandardSiteDocument | null> {
  try {
    const match = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/)
    if (!match) return null

    const [, did, collection, rkey] = match
    if (!did || !collection || !rkey) return null
    if (collection !== STANDARD_DOCUMENT) return null

    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection,
      rkey,
    })

    const value = response.data.value as Record<string, unknown>
    return {
      uri: response.data.uri,
      cid: response.data.cid ?? '',
      title: value.title as string | undefined,
      path: value.path as string | undefined,
      description: value.description as string | undefined,
      content: value.content as string | undefined,
      publishedAt: value.publishedAt as string | undefined,
      updatedAt: value.updatedAt as string | undefined,
    }
  } catch {
    return null
  }
}

export function documentToPcktBlogUrl(document: StandardSiteDocument, publicationUrl?: string): string | null {
  // Publication URLs are wiki-owner records — only http(s) may become a link.
  if (publicationUrl && /^https?:\/\//i.test(publicationUrl) && document.path) {
    const base = publicationUrl.replace(/\/$/, '')
    const path = document.path.startsWith('/') ? document.path : `/${document.path}`
    return `${base}${path}`
  }
  return null
}

export function formatDocumentDate(value?: string): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
