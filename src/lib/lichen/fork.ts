const FORKS_KEY = 'pckt.wiki.forks'
const FORKS_EVENT = 'pckt-forks-change'

/**
 * Baseline of a single note as it existed in the source wiki at the last sync.
 * Used as the common ancestor for 3-way merges when checking for upstream updates.
 */
export interface ForkNoteBaseline {
  /** Source content at the last successful sync (the merge base). */
  sourceContent: string
  /** Source note's latest revision URI at the last sync (fast change check). */
  sourceRevisionUri: string | null
}

export interface ForkRecord {
  /** AT-URI of the user's forked wiki (registry key). */
  forkWikiUri: string
  forkSlug: string
  forkHandle: string
  /** Source wiki provenance. */
  sourceDid: string
  sourceHandle: string
  sourceSlug: string
  sourceWikiUri: string
  createdAt: string
  /** Auto-apply non-conflicting upstream changes when checking for updates. */
  autoSync: boolean
  lastCheckedAt: string | null
  /** Per-note merge base, keyed by note slug (slugs are permanent). */
  baselines: Record<string, ForkNoteBaseline>
}

function emitChange(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(FORKS_EVENT))
}

function readForks(): ForkRecord[] {
  try {
    const raw = localStorage.getItem(FORKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ForkRecord[]) : []
  } catch {
    return []
  }
}

function writeForks(items: ForkRecord[]): void {
  localStorage.setItem(FORKS_KEY, JSON.stringify(items))
  emitChange()
}

export function getForks(): ForkRecord[] {
  return readForks()
}

export function getForkByWikiUri(forkWikiUri: string): ForkRecord | undefined {
  return readForks().find((item) => item.forkWikiUri === forkWikiUri)
}

export function isForkedWiki(forkWikiUri: string): boolean {
  return getForkByWikiUri(forkWikiUri) !== undefined
}

/** Has the current user already forked this particular source wiki? */
export function findForkOfSource(sourceWikiUri: string): ForkRecord | undefined {
  return readForks().find((item) => item.sourceWikiUri === sourceWikiUri)
}

export function saveFork(record: ForkRecord): void {
  const list = readForks().filter((item) => item.forkWikiUri !== record.forkWikiUri)
  writeForks([...list, record])
}

export function updateFork(
  forkWikiUri: string,
  patch: Partial<Omit<ForkRecord, 'forkWikiUri'>>,
): void {
  const list = readForks()
  const index = list.findIndex((item) => item.forkWikiUri === forkWikiUri)
  if (index === -1) return
  list[index] = { ...list[index], ...patch }
  writeForks(list)
}

export function setForkBaseline(
  forkWikiUri: string,
  slug: string,
  baseline: ForkNoteBaseline,
): void {
  const list = readForks()
  const index = list.findIndex((item) => item.forkWikiUri === forkWikiUri)
  if (index === -1) return
  list[index] = {
    ...list[index],
    baselines: { ...list[index].baselines, [slug]: baseline },
  }
  writeForks(list)
}

export function removeForkBaseline(forkWikiUri: string, slug: string): void {
  const list = readForks()
  const index = list.findIndex((item) => item.forkWikiUri === forkWikiUri)
  if (index === -1) return
  const baselines = { ...list[index].baselines }
  delete baselines[slug]
  list[index] = { ...list[index], baselines }
  writeForks(list)
}

export function removeFork(forkWikiUri: string): void {
  writeForks(readForks().filter((item) => item.forkWikiUri !== forkWikiUri))
}

export function remapForkWikiRefs(
  oldUri: string,
  next: { wikiUri: string; slug: string },
): void {
  const list = readForks()
  let changed = false
  const nextList = list.map((item) => {
    let updated = item
    if (item.forkWikiUri === oldUri) {
      changed = true
      updated = { ...updated, forkWikiUri: next.wikiUri, forkSlug: next.slug }
    }
    if (item.sourceWikiUri === oldUri) {
      changed = true
      updated = { ...updated, sourceWikiUri: next.wikiUri, sourceSlug: next.slug }
    }
    return updated
  })
  if (changed) writeForks(nextList)
}

export function setForkAutoSync(forkWikiUri: string, autoSync: boolean): void {
  updateFork(forkWikiUri, { autoSync })
}

export function subscribeForks(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === FORKS_KEY) onChange()
  }
  window.addEventListener(FORKS_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(FORKS_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}
