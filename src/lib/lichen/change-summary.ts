import { computeLineDiff } from '@/lib/lichen/visual-diff'
import { reconstructAtRevision } from '@/lib/lichen/revisions'
import type { LichenNoteWithContent, LichenRevisionRecord } from '@/types/lichen'

export type ChangeAction = 'created' | 'edited'

export interface ChangeSummary {
  action: ChangeAction
  detail: string
}

function cleanLine(text: string): string {
  return text
    .replace(/^#+\s*/, '')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, max = 56): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

function summarizeContentDiff(oldText: string, newText: string): string {
  const old = oldText.trim()
  const next = newText.trim()

  if (!old && next) return 'First version published'
  if (old && !next) return 'Article cleared'

  const lines = computeLineDiff(oldText, newText)
  const added = lines.filter((line) => line.type === 'add').map((line) => line.text.trim()).filter(Boolean)
  const removed = lines.filter((line) => line.type === 'remove').map((line) => line.text.trim()).filter(Boolean)

  const heading = added.find((line) => /^#{1,6}\s+\S/.test(line))
  if (heading) {
    return `Added section: ${truncate(cleanLine(heading))}`
  }

  const wikilink = added.find((line) => /\[\[[^\]]+\]\]/.test(line))
  if (wikilink) {
    const match = wikilink.match(/\[\[([^\]|]+)/)
    if (match?.[1]) return `Linked to ${truncate(cleanLine(match[1]), 40)}`
  }

  const substantive = added
    .map(cleanLine)
    .find((line) => line.length >= 8 && !/^[-*+]\s*$/.test(line))

  if (substantive) {
    return `Added: ${truncate(substantive)}`
  }

  if (removed.length === 1 && !added.length) {
    return `Removed: ${truncate(cleanLine(removed[0]!))}`
  }

  if (added.length && removed.length) {
    const total = added.length + removed.length
    return `Changed ${total} line${total === 1 ? '' : 's'}`
  }

  if (added.length) {
    return `Added ${added.length} line${added.length === 1 ? '' : 's'}`
  }

  if (removed.length) {
    return `Removed ${removed.length} line${removed.length === 1 ? '' : 's'}`
  }

  return 'Updated content'
}

export function summarizeRevisionChange(
  revision: LichenRevisionRecord,
  note: LichenNoteWithContent,
  revisions: LichenRevisionRecord[],
): ChangeSummary {
  const message = revision.message?.trim()

  if (!revision.parentRevision) {
    return {
      action: 'created',
      detail: message || 'First version published',
    }
  }

  if (message && message.length >= 4) {
    return { action: 'edited', detail: message }
  }

  const oldContent = reconstructAtRevision(note.uri, revision.parentRevision, revisions)
  const newContent = reconstructAtRevision(note.uri, revision.uri, revisions)

  return {
    action: 'edited',
    detail: summarizeContentDiff(oldContent, newContent),
  }
}

export function changeActionLabel(action: ChangeAction): string {
  return action === 'created' ? 'New article' : 'Edited'
}
