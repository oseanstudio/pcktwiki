/**
 * Soft edit presence via localStorage + BroadcastChannel (same browser)
 * and best-effort stamps other clients can read when they poll.
 */

const PRESENCE_PREFIX = 'pckt.wiki.presence:'
const PRESENCE_TTL_MS = 45_000

export interface EditPresence {
  noteSlug: string
  wikiUri: string
  did: string
  handle?: string
  updatedAt: number
}

function storageKey(wikiUri: string, noteSlug: string): string {
  return `${PRESENCE_PREFIX}${wikiUri}:${noteSlug}`
}

export function publishEditPresence(presence: EditPresence): void {
  const key = storageKey(presence.wikiUri, presence.noteSlug)
  const payload = JSON.stringify(presence)
  try {
    localStorage.setItem(key, payload)
  } catch {
    // ignore quota
  }
  try {
    const channel = new BroadcastChannel('pckt-wiki-presence')
    channel.postMessage(presence)
    channel.close()
  } catch {
    // BroadcastChannel unsupported
  }
}

export function clearEditPresence(wikiUri: string, noteSlug: string, did: string): void {
  const key = storageKey(wikiUri, noteSlug)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const parsed = JSON.parse(raw) as EditPresence
    if (parsed.did === did) localStorage.removeItem(key)
  } catch {
    localStorage.removeItem(key)
  }
}

export function readEditPresence(
  wikiUri: string,
  noteSlug: string,
  excludeDid?: string | null,
): EditPresence | null {
  const key = storageKey(wikiUri, noteSlug)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EditPresence
    if (Date.now() - parsed.updatedAt > PRESENCE_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    if (excludeDid && parsed.did === excludeDid) return null
    return parsed
  } catch {
    return null
  }
}

export function startPresenceHeartbeat(
  getPresence: () => EditPresence,
): () => void {
  const tick = () => publishEditPresence({ ...getPresence(), updatedAt: Date.now() })
  tick()
  const id = window.setInterval(tick, 15_000)
  return () => {
    window.clearInterval(id)
    const p = getPresence()
    clearEditPresence(p.wikiUri, p.noteSlug, p.did)
  }
}
