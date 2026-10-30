import { getPublicAgent } from '@/lib/atproto/auth'

export type HandleSuggestion = {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

export async function searchHandleSuggestions(
  query: string,
  limit = 8,
): Promise<HandleSuggestion[]> {
  const q = query.trim().replace(/^@/, '')
  if (q.length < 2) return []

  const agent = getPublicAgent()
  const result = await agent.searchActorsTypeahead({ q, limit })

  return result.data.actors.map((actor) => ({
    did: actor.did,
    handle: actor.handle,
    displayName: actor.displayName,
    avatar: actor.avatar,
  }))
}
