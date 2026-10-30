import { Agent } from '@atproto/api'
import {
  getCachedHandle,
  getCachedPdsUrl,
  setCachedDid,
  setCachedPdsUrl,
} from '@/lib/atproto/handle-cache'
import { createRetryFetch, fetchWithRetry, toUserFacingNetworkError } from '@/lib/http-retry'

const pdsUrlCache = new Map<string, string>()
const readAgentCache = new Map<string, Agent>()

export interface ResolvedDidDoc {
  pdsUrl: string
  /** Absent when the document declares no `at://` alias. */
  handle: string | null
}

interface DidDocument {
  alsoKnownAs?: string[]
  service?: Array<{ id: string; serviceEndpoint: string }>
}

function didDocUrl(did: string): string {
  // did:web encodes its host in the identifier and serves the document itself;
  // everything else in practice is did:plc, which the directory answers for.
  if (did.startsWith('did:web:')) {
    const host = decodeURIComponent(did.slice('did:web:'.length)).replace(/:/g, '/')
    return `https://${host}/.well-known/did.json`
  }
  return `https://plc.directory/${encodeURIComponent(did)}`
}

function handleFromDoc(doc: DidDocument): string | null {
  const alias = doc.alsoKnownAs?.find((entry) => entry.startsWith('at://'))
  return alias ? alias.slice('at://'.length).toLowerCase() : null
}

/**
 * One document fetch yields both of the things callers need about an unknown
 * repo — where to read it and what to call it — so resolving them together
 * halves the request count when walking a list of DIDs.
 */
export async function resolveDidDoc(did: string): Promise<ResolvedDidDoc> {
  const cachedPds = pdsUrlCache.get(did) ?? getCachedPdsUrl(did)
  const cachedHandle = getCachedHandle(did)
  if (cachedPds && cachedHandle) {
    pdsUrlCache.set(did, cachedPds)
    return { pdsUrl: cachedPds, handle: cachedHandle }
  }

  const response = await fetchWithRetry(didDocUrl(did), {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? toUserFacingNetworkError({ status: 429 })
        : `Failed to resolve DID document for ${did}`,
    )
  }

  const doc = (await response.json()) as DidDocument

  const pdsUrl = doc.service?.find((service) => service.id === '#atproto_pds')?.serviceEndpoint
  if (!pdsUrl) {
    throw new Error(`No PDS endpoint found for ${did}`)
  }

  pdsUrlCache.set(did, pdsUrl)
  setCachedPdsUrl(did, pdsUrl)

  const handle = handleFromDoc(doc)
  // setCachedDid populates both directions, so a later handle → DID lookup for
  // a wiki discovered this way is already warm.
  if (handle) setCachedDid(handle, did)

  return { pdsUrl, handle }
}

export async function resolvePdsUrl(did: string): Promise<string> {
  const cached = pdsUrlCache.get(did) ?? getCachedPdsUrl(did)
  if (cached) {
    pdsUrlCache.set(did, cached)
    return cached
  }

  const { pdsUrl } = await resolveDidDoc(did)
  return pdsUrl
}

/** Read repo records directly from the account's PDS (works without login). */
export async function getRepoReadAgent(did: string): Promise<Agent> {
  const cached = readAgentCache.get(did)
  if (cached) return cached

  const pdsUrl = await resolvePdsUrl(did)
  const agent = new Agent({ service: pdsUrl, fetch: createRetryFetch() })
  readAgentCache.set(did, agent)
  return agent
}
