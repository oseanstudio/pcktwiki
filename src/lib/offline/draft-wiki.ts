import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { uniqueSlug, isValidSlug } from '@/lib/atproto/lichen'

export interface DraftNote {
  slug: string
  title: string
  content: string
  updatedAt: string
}

export interface DraftWiki {
  id: string
  name: string
  slug: string
  language: string
  notes: DraftNote[]
  createdAt: string
  updatedAt: string
}

interface DraftWikiSchema extends DBSchema {
  drafts: {
    key: string
    value: DraftWiki
  }
}

const DB_NAME = 'pckt-wiki-drafts'
const DB_VERSION = 1
const CHANGE_EVENT = 'pckt:draft-wikis-change'

let dbPromise: Promise<IDBPDatabase<DraftWikiSchema>> | null = null

function getDb(): Promise<IDBPDatabase<DraftWikiSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DraftWikiSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('drafts', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

function notifyChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  }
}

function newId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function listDraftWikis(): Promise<DraftWiki[]> {
  try {
    const db = await getDb()
    const drafts = await db.getAll('drafts')
    return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return []
  }
}

export async function getDraftWiki(id: string): Promise<DraftWiki | null> {
  try {
    const db = await getDb()
    return (await db.get('drafts', id)) ?? null
  } catch {
    return null
  }
}

export async function createDraftWiki(name: string, language = 'en'): Promise<DraftWiki> {
  const existing = await listDraftWikis()
  const slug = uniqueSlug(
    name,
    existing.map((w) => w.slug),
  )
  if (!isValidSlug(slug)) throw new Error('Invalid wiki slug')

  const now = new Date().toISOString()
  const draft: DraftWiki = {
    id: newId(),
    name,
    slug,
    language,
    notes: [
      {
        slug: 'home',
        title: 'Home',
        content: `# ${name}\n\nWelcome to your local draft wiki. Sign in to publish to your PDS.`,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  const db = await getDb()
  await db.put('drafts', draft)
  notifyChange()
  return draft
}

export async function updateDraftWiki(draft: DraftWiki): Promise<void> {
  const db = await getDb()
  await db.put('drafts', { ...draft, updatedAt: new Date().toISOString() })
  notifyChange()
}

export async function updateDraftNote(
  wikiId: string,
  slug: string,
  patch: Partial<Pick<DraftNote, 'title' | 'content'>>,
): Promise<DraftWiki | null> {
  const draft = await getDraftWiki(wikiId)
  if (!draft) return null

  const note = draft.notes.find((n) => n.slug === slug)
  if (!note) return null

  if (patch.title !== undefined) note.title = patch.title
  if (patch.content !== undefined) note.content = patch.content
  note.updatedAt = new Date().toISOString()
  draft.updatedAt = note.updatedAt

  await updateDraftWiki(draft)
  return draft
}

export async function addDraftNote(
  wikiId: string,
  title: string,
  content = '',
): Promise<DraftWiki | null> {
  const draft = await getDraftWiki(wikiId)
  if (!draft) return null

  const slug = uniqueSlug(
    title,
    draft.notes.map((n) => n.slug),
  )
  const now = new Date().toISOString()
  draft.notes.push({ slug, title, content, updatedAt: now })
  draft.updatedAt = now
  await updateDraftWiki(draft)
  return draft
}

export async function deleteDraftWiki(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('drafts', id)
  notifyChange()
}

export function subscribeDraftWikis(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}
