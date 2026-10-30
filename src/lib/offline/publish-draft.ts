import type { Agent } from '@atproto/api'
import {
  deleteDraftWiki,
  getDraftWiki,
  type DraftWiki,
} from '@/lib/offline/draft-wiki'

export async function publishDraftWiki(agent: Agent, draftId: string): Promise<string> {
  const draft = await getDraftWiki(draftId)
  if (!draft) throw new Error('Draft wiki not found')

  const { useLichenStore } = await import('@/stores/lichen')
  const lichen = useLichenStore()

  const home = draft.notes.find((n) => n.slug === 'home')
  const wiki = await lichen.createWiki(
    agent,
    draft.name,
    draft.language,
    'public',
    '',
    home?.content,
  )

  for (const note of draft.notes) {
    if (note.slug === 'home') continue
    await lichen.createNoteWithSlug(agent, note.slug, note.title, note.content)
  }

  await deleteDraftWiki(draftId)
  return wiki.slug
}

export async function listUnpublishedDrafts(): Promise<DraftWiki[]> {
  const { listDraftWikis } = await import('@/lib/offline/draft-wiki')
  return listDraftWikis()
}

export async function publishAllDrafts(agent: Agent): Promise<string[]> {
  const drafts = await listUnpublishedDrafts()
  const slugs: string[] = []
  for (const draft of drafts) {
    slugs.push(await publishDraftWiki(agent, draft.id))
  }
  return slugs
}
