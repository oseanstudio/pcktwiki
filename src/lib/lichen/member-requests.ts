import type { Agent } from '@atproto/api'
import {
  deleteMemberRequestRecord,
  getRecord,
  listMemberRequests,
  parseAtUri,
  writeMemberRequestRecord,
  writeMembershipRecord,
} from '@/lib/atproto/lichen'
import { COLLECTIONS } from '@/lib/lichen/collections'
import { fetchBacklinks } from '@/lib/constellation/client'
import type { LichenMemberRequestRecord, MemberRole } from '@/types/lichen'

const DISMISSED_KEY = 'pckt.wiki.member-requests.dismissed'

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeDismissed(ids: Set<string>): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
}

export function isMemberRequestDismissed(uri: string): boolean {
  return readDismissed().has(uri)
}

export function dismissMemberRequest(uri: string): void {
  const ids = readDismissed()
  ids.add(uri)
  writeDismissed(ids)
}

export async function requestWikiMembership(
  agent: Agent,
  wikiRef: string,
): Promise<LichenMemberRequestRecord> {
  const existing = await listMemberRequests(agent, agent.accountDid)
  const prior = existing.find((item) => item.wikiRef === wikiRef)
  if (prior) return prior
  return writeMemberRequestRecord(agent, wikiRef)
}

export async function cancelOwnMemberRequest(
  agent: Agent,
  requestUri: string,
): Promise<void> {
  await deleteMemberRequestRecord(agent, requestUri)
}

export async function findOwnMemberRequest(
  agent: Agent,
  wikiRef: string,
): Promise<LichenMemberRequestRecord | null> {
  const existing = await listMemberRequests(agent, agent.accountDid)
  return existing.find((item) => item.wikiRef === wikiRef) ?? null
}

/** Discover join requests for a wiki via Constellation backlinks to wikiRef. */
export async function listIncomingMemberRequests(
  agent: Agent,
  wikiRef: string,
): Promise<LichenMemberRequestRecord[]> {
  const dismissed = readDismissed()
  const linking = await fetchBacklinks({
    target: wikiRef,
    collection: COLLECTIONS.memberRequest,
    path: '.wikiRef',
    limit: 50,
  }).catch(() => ({ linking_records: [], total: 0, cursor: null }))

  const results: LichenMemberRequestRecord[] = []
  for (const record of linking.linking_records) {
    const uri = `at://${record.did}/${record.collection}/${record.rkey}`
    if (dismissed.has(uri)) continue
    try {
      const value = await getRecord(agent, record.did, COLLECTIONS.memberRequest, record.rkey)
      if (!value) continue
      const createdAt = String(value.createdAt ?? '')
      const ref = String(value.wikiRef ?? '')
      if (ref !== wikiRef) continue
      results.push({
        uri,
        cid: '',
        requesterDid: record.did,
        wikiRef: ref,
        createdAt,
      })
    } catch {
      // skip unreachable requesters
    }
  }

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return results
}

export async function approveMemberRequest(
  agent: Agent,
  request: LichenMemberRequestRecord,
  role: MemberRole,
  wikiOwnerDid: string,
): Promise<import('@/types/lichen').LichenMembershipRecord> {
  const membership = await writeMembershipRecord(
    agent,
    request.requesterDid,
    request.wikiRef,
    role,
    undefined,
    wikiOwnerDid,
  )
  dismissMemberRequest(request.uri)
  return membership
}

export async function denyMemberRequest(request: LichenMemberRequestRecord): Promise<void> {
  dismissMemberRequest(request.uri)
}

export function inviteQueryForWiki(wikiUri: string): Record<string, string> {
  return { invite: wikiUri }
}

export function parseInviteWikiUri(query: unknown): string | null {
  if (typeof query !== 'string' || !query.startsWith('at://')) return null
  return parseAtUri(query) ? query : null
}
