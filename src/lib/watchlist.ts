const WATCHLIST_KEY = 'pckt.wiki.watchlist'
const DISCUSSION_WATCHLIST_KEY = 'pckt.wiki.discussion-watchlist'
const UNSEEN_WIKIS_KEY = 'pckt.wiki.watchlist.unseen.wikis'
const UNSEEN_DISCUSSIONS_KEY = 'pckt.wiki.watchlist.unseen.discussions'
const NOTE_WATCHLIST_KEY = 'pckt.wiki.note-watchlist'
const UNSEEN_NOTES_KEY = 'pckt.wiki.watchlist.unseen.notes'
const WATCHLIST_EVENT = 'pckt-watchlist-change'

export interface WatchEntry {
  wikiUri: string
  handle: string
  wikiSlug: string
  wikiName: string
}

export interface DiscussionWatchEntry {
  wikiUri: string
  handle: string
  wikiSlug: string
  wikiName: string
  noteSlug: string
  noteTitle: string
  subjectSlug: string
}

export interface NoteWatchEntry {
  wikiUri: string
  handle: string
  wikiSlug: string
  wikiName: string
  noteSlug: string
  noteTitle: string
}

function readWatchlist(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeWatchlist(items: WatchEntry[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items))
  emitWatchlistChange()
}

function emitWatchlistChange(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT))
}

function readUnseenWikis(): Set<string> {
  try {
    const raw = localStorage.getItem(UNSEEN_WIKIS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeUnseenWikis(ids: Set<string>): void {
  localStorage.setItem(UNSEEN_WIKIS_KEY, JSON.stringify([...ids]))
  emitWatchlistChange()
}

function readUnseenDiscussions(): Set<string> {
  try {
    const raw = localStorage.getItem(UNSEEN_DISCUSSIONS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeUnseenDiscussions(ids: Set<string>): void {
  localStorage.setItem(UNSEEN_DISCUSSIONS_KEY, JSON.stringify([...ids]))
  emitWatchlistChange()
}

export function isWikiUnseen(wikiUri: string): boolean {
  return readUnseenWikis().has(wikiUri)
}

export function isDiscussionUnseen(wikiUri: string, noteSlug: string): boolean {
  return readUnseenDiscussions().has(discussionKey(wikiUri, noteSlug))
}

export function markWikiSeen(wikiUri: string): void {
  const unseen = readUnseenWikis()
  if (!unseen.has(wikiUri)) return
  unseen.delete(wikiUri)
  writeUnseenWikis(unseen)
}

export function markDiscussionSeen(wikiUri: string, noteSlug: string): void {
  const key = discussionKey(wikiUri, noteSlug)
  const unseen = readUnseenDiscussions()
  if (!unseen.has(key)) return
  unseen.delete(key)
  writeUnseenDiscussions(unseen)
}

export function markAllWatchlistSeen(
  wikis: WatchEntry[],
  discussions: DiscussionWatchEntry[],
  notes: NoteWatchEntry[] = [],
): void {
  const unseenWikis = readUnseenWikis()
  const unseenDiscussions = readUnseenDiscussions()
  const unseenNotes = readUnseenNotes()
  let changed = false

  for (const wiki of wikis) {
    if (unseenWikis.delete(wiki.wikiUri)) changed = true
  }
  for (const discussion of discussions) {
    if (unseenDiscussions.delete(discussionKey(discussion.wikiUri, discussion.noteSlug))) {
      changed = true
    }
  }
  for (const note of notes) {
    if (unseenNotes.delete(noteKey(note.wikiUri, note.noteSlug))) changed = true
  }

  if (!changed) return
  writeUnseenWikis(unseenWikis)
  writeUnseenDiscussions(unseenDiscussions)
  writeUnseenNotes(unseenNotes)
}

export function getUnseenWatchlistCount(
  wikis: WatchEntry[],
  discussions: DiscussionWatchEntry[],
  notes: NoteWatchEntry[] = [],
): number {
  const unseenWikis = readUnseenWikis()
  const unseenDiscussions = readUnseenDiscussions()
  const unseenNotes = readUnseenNotes()
  let count = 0
  for (const wiki of wikis) {
    if (unseenWikis.has(wiki.wikiUri)) count++
  }
  for (const discussion of discussions) {
    if (unseenDiscussions.has(discussionKey(discussion.wikiUri, discussion.noteSlug))) count++
  }
  for (const note of notes) {
    if (unseenNotes.has(noteKey(note.wikiUri, note.noteSlug))) count++
  }
  return count
}

export function subscribeWatchlist(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === WATCHLIST_KEY ||
      event.key === DISCUSSION_WATCHLIST_KEY ||
      event.key === UNSEEN_WIKIS_KEY ||
      event.key === UNSEEN_DISCUSSIONS_KEY ||
      event.key === NOTE_WATCHLIST_KEY ||
      event.key === UNSEEN_NOTES_KEY
    ) {
      onChange()
    }
  }

  window.addEventListener(WATCHLIST_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(WATCHLIST_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function getWatchlist(): WatchEntry[] {
  return readWatchlist()
}

export function isWikiWatched(wikiUri: string): boolean {
  return readWatchlist().some((item) => item.wikiUri === wikiUri)
}

export function findWatchEntry(handle: string, wikiSlug: string): WatchEntry | undefined {
  return readWatchlist().find(
    (item) => item.handle === handle && item.wikiSlug === wikiSlug,
  )
}

export function isWikiWatchedByScope(handle: string, wikiSlug: string): boolean {
  return findWatchEntry(handle, wikiSlug) !== undefined
}

export async function toggleWikiWatchScope(entry: {
  handle: string
  wikiSlug: string
  wikiName: string
  wikiUri?: string
}): Promise<boolean> {
  const existing = findWatchEntry(entry.handle, entry.wikiSlug)
  if (existing) {
    unwatchWiki(existing.wikiUri)
    return false
  }

  let wikiUri = entry.wikiUri
  if (!wikiUri) {
    const { loadPublicWikiData } = await import('@/lib/lichen/load-public-wiki')
    const data = await loadPublicWikiData(entry.handle, entry.wikiSlug)
    wikiUri = data.wiki?.uri
  }

  if (!wikiUri) return false

  watchWiki({
    wikiUri,
    handle: entry.handle,
    wikiSlug: entry.wikiSlug,
    wikiName: entry.wikiName,
  })
  return true
}

export function watchWiki(entry: WatchEntry): void {
  const list = readWatchlist()
  if (list.some((item) => item.wikiUri === entry.wikiUri)) return
  writeWatchlist([...list, entry])
  const unseen = readUnseenWikis()
  unseen.add(entry.wikiUri)
  writeUnseenWikis(unseen)
}

export function unwatchWiki(wikiUri: string): void {
  writeWatchlist(readWatchlist().filter((item) => item.wikiUri !== wikiUri))
  markWikiSeen(wikiUri)
}

function discussionKey(wikiUri: string, noteSlug: string): string {
  return `${wikiUri}::${noteSlug}`
}

function readDiscussionWatchlist(): DiscussionWatchEntry[] {
  try {
    const raw = localStorage.getItem(DISCUSSION_WATCHLIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeDiscussionWatchlist(items: DiscussionWatchEntry[]): void {
  localStorage.setItem(DISCUSSION_WATCHLIST_KEY, JSON.stringify(items))
  emitWatchlistChange()
}

export function getDiscussionWatchlist(): DiscussionWatchEntry[] {
  return readDiscussionWatchlist()
}

export function isDiscussionWatched(wikiUri: string, noteSlug: string): boolean {
  const key = discussionKey(wikiUri, noteSlug)
  return readDiscussionWatchlist().some(
    (item) => discussionKey(item.wikiUri, item.noteSlug) === key,
  )
}

export function watchDiscussion(entry: DiscussionWatchEntry): void {
  const key = discussionKey(entry.wikiUri, entry.noteSlug)
  const list = readDiscussionWatchlist()
  if (list.some((item) => discussionKey(item.wikiUri, item.noteSlug) === key)) return
  writeDiscussionWatchlist([...list, entry])
  const unseen = readUnseenDiscussions()
  unseen.add(key)
  writeUnseenDiscussions(unseen)
}

export function remapWikiWatchRefs(
  oldUri: string,
  next: { wikiUri: string; wikiSlug: string; wikiName?: string },
): void {
  const list = readWatchlist()
  let changed = false
  const nextList = list.map((item) => {
    if (item.wikiUri !== oldUri) return item
    changed = true
    return {
      ...item,
      wikiUri: next.wikiUri,
      wikiSlug: next.wikiSlug,
      wikiName: next.wikiName ?? item.wikiName,
    }
  })
  if (changed) writeWatchlist(nextList)

  const unseen = readUnseenWikis()
  if (unseen.delete(oldUri)) {
    unseen.add(next.wikiUri)
    writeUnseenWikis(unseen)
  }

  const discussions = readDiscussionWatchlist()
  let discussionsChanged = false
  const nextDiscussions = discussions.map((item) => {
    if (item.wikiUri !== oldUri) return item
    discussionsChanged = true
    return {
      ...item,
      wikiUri: next.wikiUri,
      wikiSlug: next.wikiSlug,
      wikiName: next.wikiName ?? item.wikiName,
    }
  })
  if (discussionsChanged) writeDiscussionWatchlist(nextDiscussions)

  const unseenDiscussions = readUnseenDiscussions()
  let unseenDiscussionsChanged = false
  const remappedUnseen = new Set<string>()
  for (const key of unseenDiscussions) {
    if (key.startsWith(`${oldUri}::`)) {
      remappedUnseen.add(`${next.wikiUri}::${key.slice(oldUri.length + 2)}`)
      unseenDiscussionsChanged = true
    } else {
      remappedUnseen.add(key)
    }
  }
  if (unseenDiscussionsChanged) writeUnseenDiscussions(remappedUnseen)

  const notes = readNoteWatchlist()
  let notesChanged = false
  const nextNotes = notes.map((item) => {
    if (item.wikiUri !== oldUri) return item
    notesChanged = true
    return {
      ...item,
      wikiUri: next.wikiUri,
      wikiSlug: next.wikiSlug,
      wikiName: next.wikiName ?? item.wikiName,
    }
  })
  if (notesChanged) writeNoteWatchlist(nextNotes)

  const unseenNotes = readUnseenNotes()
  let unseenNotesChanged = false
  const remappedNotes = new Set<string>()
  for (const key of unseenNotes) {
    if (key.startsWith(`${oldUri}::`)) {
      remappedNotes.add(`${next.wikiUri}::${key.slice(oldUri.length + 2)}`)
      unseenNotesChanged = true
    } else {
      remappedNotes.add(key)
    }
  }
  if (unseenNotesChanged) writeUnseenNotes(remappedNotes)
}

export function unwatchDiscussion(wikiUri: string, noteSlug: string): void {
  const key = discussionKey(wikiUri, noteSlug)
  writeDiscussionWatchlist(
    readDiscussionWatchlist().filter(
      (item) => discussionKey(item.wikiUri, item.noteSlug) !== key,
    ),
  )
  markDiscussionSeen(wikiUri, noteSlug)
}

function noteKey(wikiUri: string, noteSlug: string): string {
  return `${wikiUri}::${noteSlug}`
}

function readNoteWatchlist(): NoteWatchEntry[] {
  try {
    const raw = localStorage.getItem(NOTE_WATCHLIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeNoteWatchlist(items: NoteWatchEntry[]): void {
  localStorage.setItem(NOTE_WATCHLIST_KEY, JSON.stringify(items))
  emitWatchlistChange()
}

function readUnseenNotes(): Set<string> {
  try {
    const raw = localStorage.getItem(UNSEEN_NOTES_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeUnseenNotes(ids: Set<string>): void {
  localStorage.setItem(UNSEEN_NOTES_KEY, JSON.stringify([...ids]))
  emitWatchlistChange()
}

export function getNoteWatchlist(): NoteWatchEntry[] {
  return readNoteWatchlist()
}

export function isNoteWatched(wikiUri: string, noteSlug: string): boolean {
  const key = noteKey(wikiUri, noteSlug)
  return readNoteWatchlist().some((item) => noteKey(item.wikiUri, item.noteSlug) === key)
}

export function isNoteUnseen(wikiUri: string, noteSlug: string): boolean {
  return readUnseenNotes().has(noteKey(wikiUri, noteSlug))
}

export function markNoteSeen(wikiUri: string, noteSlug: string): void {
  const key = noteKey(wikiUri, noteSlug)
  const unseen = readUnseenNotes()
  if (!unseen.has(key)) return
  unseen.delete(key)
  writeUnseenNotes(unseen)
}

export function watchNote(entry: NoteWatchEntry): void {
  const key = noteKey(entry.wikiUri, entry.noteSlug)
  const list = readNoteWatchlist()
  if (list.some((item) => noteKey(item.wikiUri, item.noteSlug) === key)) return
  writeNoteWatchlist([...list, entry])
}

export function unwatchNote(wikiUri: string, noteSlug: string): void {
  const key = noteKey(wikiUri, noteSlug)
  writeNoteWatchlist(
    readNoteWatchlist().filter((item) => noteKey(item.wikiUri, item.noteSlug) !== key),
  )
  markNoteSeen(wikiUri, noteSlug)
}

/** Called when a watched note is renamed so the subscription follows the new slug. */
export function remapNoteWatchRef(
  wikiUri: string,
  oldSlug: string,
  next: { noteSlug: string; noteTitle?: string },
): void {
  const list = readNoteWatchlist()
  let changed = false
  const nextList = list.map((item) => {
    if (item.wikiUri !== wikiUri || item.noteSlug !== oldSlug) return item
    changed = true
    return { ...item, noteSlug: next.noteSlug, noteTitle: next.noteTitle ?? item.noteTitle }
  })
  if (changed) writeNoteWatchlist(nextList)

  const unseen = readUnseenNotes()
  if (unseen.delete(noteKey(wikiUri, oldSlug))) {
    unseen.add(noteKey(wikiUri, next.noteSlug))
    writeUnseenNotes(unseen)
  }
}
