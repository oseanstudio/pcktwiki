import { COLLECTIONS } from '@/lib/lichen/collections'
import { buildNoteContents } from '@/lib/lichen/revisions'
import type { LichenRevisionRecord } from '@/types/lichen'

export interface FirehoseCommit {
  did: string
  collection: string
  rkey: string
  operation: 'create' | 'update' | 'delete'
  record?: Record<string, unknown>
}

export type FirehoseHandler = (commit: FirehoseCommit) => void

const JETSTREAM_URL = 'wss://jetstream2.us-east.bsky.network/subscribe'

export function subscribeFirehose(onCommit: FirehoseHandler): () => void {
  const collections = Object.values(COLLECTIONS)
  const params = collections.map((collection) => `collection=${encodeURIComponent(collection)}`).join('&')
  const url = `${JETSTREAM_URL}?${params}`

  let ws: WebSocket | null = null
  let closed = false
  let retryMs = 1000

  function connect() {
    if (closed) return
    ws = new WebSocket(url)

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          kind?: string
          did?: string
          commit?: {
            collection?: string
            rkey?: string
            operation?: 'create' | 'update' | 'delete'
            record?: Record<string, unknown>
          }
        }

        if (payload.kind !== 'commit' || !payload.did || !payload.commit?.collection) return
        if (!collections.includes(payload.commit.collection as (typeof collections)[number])) return

        onCommit({
          did: payload.did,
          collection: payload.commit.collection,
          rkey: payload.commit.rkey ?? '',
          operation: payload.commit.operation ?? 'update',
          record: payload.commit.operation !== 'delete' ? payload.commit.record : undefined,
        })
      } catch {
        // Ignore malformed events
      }
    }

    ws.onclose = () => {
      if (closed) return
      setTimeout(connect, retryMs)
      retryMs = Math.min(retryMs * 2, 30000)
    }

    ws.onerror = () => {
      ws?.close()
    }

    ws.onopen = () => {
      retryMs = 1000
    }
  }

  connect()

  return () => {
    closed = true
    ws?.close()
  }
}

export function applyFirehoseRevision(
  revisions: LichenRevisionRecord[],
  commit: FirehoseCommit,
  _currentContent: string,
  _latestRevisionUri: string | null,
): {
  revisions: LichenRevisionRecord[]
  content: string
  latestRevisionUri: string | null
  damagedRevisions: number
  damagedRevisionUris: string[]
} | null {
  if (commit.collection !== COLLECTIONS.noteRevision || commit.operation === 'delete') {
    return null
  }

  const record = commit.record
  if (!record) return null

  const uri = `at://${commit.did}/${commit.collection}/${commit.rkey}`
  if (revisions.some((revision) => revision.uri === uri)) {
    return null
  }

  const diffFormat = String(record.diffFormat ?? 'diff-match-patch')
  if (diffFormat !== 'diff-match-patch') return null

  const noteRef = String(record.noteRef ?? '')
  const revision: LichenRevisionRecord = {
    uri,
    cid: '',
    noteRef,
    parentRevision: record.parentRevision as string | undefined,
    diff: String(record.diff ?? ''),
    diffFormat,
    message: record.message as string | undefined,
    snapshot: typeof record.snapshot === 'string' ? record.snapshot : undefined,
    createdAt: String(record.createdAt ?? new Date().toISOString()),
  }

  const nextRevisions = [...revisions, revision]
  const rebuilt = buildNoteContents(nextRevisions).get(noteRef)
  if (!rebuilt) return null

  return {
    revisions: nextRevisions,
    content: rebuilt.content,
    latestRevisionUri: rebuilt.latestRevisionUri,
    damagedRevisions: rebuilt.damaged.length,
    damagedRevisionUris: rebuilt.damaged.map((item) => item.uri),
  }
}
