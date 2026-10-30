import { getPublicAgent } from '@/lib/atproto/auth'
import { COLLECTIONS } from '@/lib/lichen/collections'
import {
  buildAtUri,
  fetchBacklinks,
  fetchLinksAll,
  type ConstellationLinkingRecord,
} from '@/lib/constellation/client'

export type NetworkReferenceKind = 'bookmark' | 'bluesky-post' | 'other'

export interface NetworkReference {
  id: string
  kind: NetworkReferenceKind
  label: string
  authorDid: string
  authorHandle: string | null
  sourceUri: string
  href: string | null
  collection: string
}

interface ReferenceSource {
  collection: string
  path: string
  kind: NetworkReferenceKind
  label: string
}

const REFERENCE_SOURCES: ReferenceSource[] = [
  {
    collection: COLLECTIONS.bookmark,
    path: '.wikiRef',
    kind: 'bookmark',
    label: 'Bookmarked',
  },
  {
    collection: 'app.bsky.feed.post',
    path: '.facets[].features[app.bsky.richtext.facet#link].uri',
    kind: 'bluesky-post',
    label: 'Linked on Bluesky',
  },
  {
    collection: 'app.bsky.feed.post',
    path: '.embed.external.uri',
    kind: 'bluesky-post',
    label: 'Linked on Bluesky',
  },
  {
    collection: 'app.bsky.feed.post',
    path: '.embed.record.uri',
    kind: 'bluesky-post',
    label: 'Quoted on Bluesky',
  },
]

const SKIPPED_SOURCES = new Set([
  `${COLLECTIONS.noteRevision}:.noteRef`,
  `${COLLECTIONS.membership}:.wikiRef`,
  `${COLLECTIONS.note}:.wikiRef`,
])

const handleCache = new Map<string, string | null>()

async function resolveDidToHandle(did: string): Promise<string | null> {
  if (handleCache.has(did)) return handleCache.get(did) ?? null

  try {
    const profile = await getPublicAgent().getProfile({ actor: did })
    const handle = profile.data.handle ?? null
    handleCache.set(did, handle)
    return handle
  } catch {
    handleCache.set(did, null)
    return null
  }
}

function blueskyPostHref(rkey: string, handle: string | null): string | null {
  if (!handle) return null
  return `https://bsky.app/profile/${handle}/post/${rkey}`
}

async function formatReference(
  record: ConstellationLinkingRecord,
  source: ReferenceSource,
): Promise<NetworkReference> {
  const authorHandle = await resolveDidToHandle(record.did)
  const sourceUri = buildAtUri(record.did, record.collection, record.rkey)
  const authorLabel = authorHandle ? `@${authorHandle}` : record.did.slice(0, 20)

  let href: string | null = null
  if (source.kind === 'bluesky-post') {
    href = blueskyPostHref(record.rkey, authorHandle)
  }

  return {
    id: sourceUri,
    kind: source.kind,
    label: `${source.label} by ${authorLabel}`,
    authorDid: record.did,
    authorHandle,
    sourceUri,
    href,
    collection: source.collection,
  }
}

interface ParsedRecordUri {
  did: string
  collection: string
  rkey: string
}

function parseRecordUri(uri: string): ParsedRecordUri | null {
  if (!uri.startsWith('at://')) return null
  const [did, collection, rkey] = uri.slice('at://'.length).split('/')
  if (!did || !collection || !rkey) return null
  return { did, collection, rkey }
}

function kindForCollection(collection: string): { kind: NetworkReferenceKind; label: string } {
  if (collection === COLLECTIONS.bookmark) return { kind: 'bookmark', label: 'Bookmarked' }
  if (collection === 'app.bsky.feed.post') {
    return { kind: 'bluesky-post', label: 'Linked on Bluesky' }
  }
  return { kind: 'other', label: 'Referenced' }
}

/**
 * Build display entries straight from stored AT-URIs, for the references an
 * admin already approved. Reading a page must not depend on Constellation —
 * the approved list is the source of truth once it is saved.
 */
export async function resolveApprovedReferences(uris: string[]): Promise<NetworkReference[]> {
  const parsed = [...new Set(uris.filter(Boolean))]
    .map((uri) => ({ uri, record: parseRecordUri(uri) }))
    .filter((item): item is { uri: string; record: ParsedRecordUri } => !!item.record)

  return Promise.all(
    parsed.map(async ({ uri, record }) => {
      const { kind, label } = kindForCollection(record.collection)
      const authorHandle = await resolveDidToHandle(record.did)
      const authorLabel = authorHandle ? `@${authorHandle}` : record.did.slice(0, 20)

      return {
        id: uri,
        kind,
        label: `${label} by ${authorLabel}`,
        authorDid: record.did,
        authorHandle,
        sourceUri: uri,
        href: kind === 'bluesky-post' ? blueskyPostHref(record.rkey, authorHandle) : null,
        collection: record.collection,
      }
    }),
  )
}

async function referencesForSubject(subject: string, limitPerSource = 8): Promise<NetworkReference[]> {
  const summary = await fetchLinksAll(subject)
  const references: NetworkReference[] = []
  const seen = new Set<string>()

  for (const source of REFERENCE_SOURCES) {
    const sourceKey = `${source.collection}:${source.path}`
    if (SKIPPED_SOURCES.has(sourceKey)) continue

    const stats = summary.links[source.collection]?.[source.path]
    if (!stats?.records) continue

    const backlinks = await fetchBacklinks({
      target: subject,
      collection: source.collection,
      path: source.path,
      limit: limitPerSource,
    })

    for (const record of backlinks.linking_records) {
      const formatted = await formatReference(record, source)
      if (seen.has(formatted.id)) continue
      seen.add(formatted.id)
      references.push(formatted)
    }
  }

  return references
}

export async function fetchNetworkReferences(subjects: string[]): Promise<NetworkReference[]> {
  const uniqueSubjects = [...new Set(subjects.filter(Boolean))]
  if (!uniqueSubjects.length) return []

  const batches = await Promise.allSettled(
    uniqueSubjects.map((subject) => referencesForSubject(subject)),
  )

  const merged: NetworkReference[] = []
  const seen = new Set<string>()

  for (const batch of batches) {
    if (batch.status !== 'fulfilled') continue
    for (const reference of batch.value) {
      if (seen.has(reference.id)) continue
      seen.add(reference.id)
      merged.push(reference)
    }
  }

  return merged
}
