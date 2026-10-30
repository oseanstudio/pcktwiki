const QUEUE_KEY = 'pckt.wiki.offline-queue'
const QUEUE_CHANGE_EVENT = 'pckt:offline-queue-change'

function notifyQueueChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_CHANGE_EVENT))
  }
}

export interface PendingEdit {
  id: string
  handle: string
  wikiSlug: string
  noteSlug: string
  noteUri: string
  title: string
  content: string
  message?: string
  latestRevisionUri: string | null
  createdAt: string
}

function readQueue(): PendingEdit[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items: PendingEdit[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

export function getPendingEdits(): PendingEdit[] {
  return readQueue()
}

export function getPendingEditsForNote(noteUri: string): PendingEdit[] {
  return readQueue().filter((item) => item.noteUri === noteUri)
}

export function queueEdit(edit: Omit<PendingEdit, 'id' | 'createdAt'>): PendingEdit {
  const pending: PendingEdit = {
    ...edit,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  const queue = readQueue()
  queue.push(pending)
  writeQueue(queue)
  notifyQueueChange()
  return pending
}

export function removePendingEdit(id: string): void {
  writeQueue(readQueue().filter((item) => item.id !== id))
  notifyQueueChange()
}

export function clearPendingEditsForNote(noteUri: string): void {
  writeQueue(readQueue().filter((item) => item.noteUri !== noteUri))
  notifyQueueChange()
}

export function onOfflineQueueChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(QUEUE_CHANGE_EVENT, listener)
  return () => window.removeEventListener(QUEUE_CHANGE_EVENT, listener)
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
