import type { Agent } from '@atproto/api'
import { getReadAgentForRepo, resolveHandleToDid } from '@/lib/atproto/auth'
import { getCachedDid } from '@/lib/atproto/handle-cache'
import { loadPublicWikiCache } from '@/lib/lichen/wiki-cache'
import { isOnline } from '@/lib/offline-queue'
import { toUserFacingNetworkError } from '@/lib/http-retry'
import router from '@/router'
import type { useLichenStore } from '@/stores/lichen'

type LichenStore = ReturnType<typeof useLichenStore>

async function resolveDidOfflineAware(handle: string, wikiSlug: string): Promise<string | null> {
  const cached = getCachedDid(handle)
  if (cached) return cached

  if (!isOnline()) {
    const stored = await loadPublicWikiCache(handle, wikiSlug, { allowStale: true })
    return stored?.did ?? null
  }

  try {
    return await resolveHandleToDid(handle)
  } catch {
    const stored = await loadPublicWikiCache(handle, wikiSlug, { allowStale: true })
    return stored?.did ?? null
  }
}

async function followWikiRedirect(
  lichen: LichenStore,
  agent: Agent,
  did: string,
  opts: {
    handle: string
    viewerDid: string | null
  },
): Promise<void> {
  const consume =
    typeof lichen.consumeWikiRedirectSlug === 'function'
      ? lichen.consumeWikiRedirectSlug.bind(lichen)
      : null
  if (!consume) return

  const redirectSlug = consume()
  if (!redirectSlug) return

  const route = router.currentRoute.value
  await router.replace({
    name: route.name ?? undefined,
    params: { ...route.params, wikiSlug: redirectSlug },
    query: route.query,
    hash: route.hash,
  })
  await lichen.loadWiki(agent, did, redirectSlug, opts.viewerDid, opts.handle)
  // Nested redirects (A→B→C) are unlikely; follow one more hop if needed.
  const nested = consume()
  if (nested && nested !== redirectSlug) {
    await router.replace({
      name: route.name ?? undefined,
      params: { ...router.currentRoute.value.params, wikiSlug: nested },
      query: router.currentRoute.value.query,
      hash: router.currentRoute.value.hash,
    })
    await lichen.loadWiki(agent, did, nested, opts.viewerDid, opts.handle)
  }
}

export async function loadWikiByHandle(
  lichen: LichenStore,
  opts: {
    handle: string
    wikiSlug: string
    viewerDid: string | null
    authAgent: Agent | null
  },
): Promise<string | null> {
  try {
    const did = await resolveDidOfflineAware(opts.handle, opts.wikiSlug)
    if (!did) {
      lichen.failLoad('Could not resolve wiki owner offline')
      return null
    }

    let agent: Agent
    if (!isOnline()) {
      const stored = await loadPublicWikiCache(opts.handle, opts.wikiSlug, { allowStale: true })
      if (stored?.pdsUrl) {
        const { Agent: AtAgent } = await import('@atproto/api')
        agent = new AtAgent({ service: stored.pdsUrl })
      } else if (opts.authAgent && opts.viewerDid === did) {
        agent = opts.authAgent
      } else {
        agent = await getReadAgentForRepo(did, opts.authAgent, opts.viewerDid)
      }
    } else {
      agent = await getReadAgentForRepo(did, opts.authAgent, opts.viewerDid)
    }

    await lichen.loadWiki(agent, did, opts.wikiSlug, opts.viewerDid, opts.handle)
    await followWikiRedirect(lichen, agent, did, {
      handle: opts.handle,
      viewerDid: opts.viewerDid,
    })
    return did
  } catch (err) {
    if (!lichen.error) {
      lichen.failLoad(toUserFacingNetworkError(err))
    }
    return null
  }
}
