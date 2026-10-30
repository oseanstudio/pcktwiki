import type { Agent } from '@atproto/api'
import { COLLECTIONS } from '@/lib/lichen/collections'
import { listRecords } from '@/lib/atproto/lichen'

export interface LichenBookmarkRecord {
  uri: string
  wikiRef: string
  createdAt: string
}

export async function listBookmarks(agent: Agent, did: string): Promise<LichenBookmarkRecord[]> {
  return listRecords(agent, did, COLLECTIONS.bookmark, (uri, _cid, _rkey, value) => ({
    uri,
    wikiRef: String(value.wikiRef ?? ''),
    createdAt: String(value.createdAt ?? new Date().toISOString()),
  }))
}

export async function writeBookmark(agent: Agent, wikiRef: string): Promise<LichenBookmarkRecord> {
  const createdAt = new Date().toISOString()
  const response = await agent.com.atproto.repo.createRecord({
    repo: agent.accountDid,
    collection: COLLECTIONS.bookmark,
    record: {
      $type: COLLECTIONS.bookmark,
      wikiRef,
      createdAt,
    },
  })
  return {
    uri: response.data.uri,
    wikiRef,
    createdAt,
  }
}

export async function deleteBookmark(agent: Agent, bookmarkUri: string): Promise<void> {
  const rkey = bookmarkUri.split('/').pop()
  if (!rkey) return
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.accountDid,
    collection: COLLECTIONS.bookmark,
    rkey,
  })
}

export async function findBookmarkForWiki(
  agent: Agent,
  did: string,
  wikiRef: string,
): Promise<LichenBookmarkRecord | null> {
  const bookmarks = await listBookmarks(agent, did)
  return bookmarks.find((b) => b.wikiRef === wikiRef) ?? null
}
