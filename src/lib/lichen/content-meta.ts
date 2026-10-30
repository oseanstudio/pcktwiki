import type { LichenNoteWithContent } from '@/types/lichen'
import { parseFrontmatter } from '@/lib/lichen/frontmatter'
import { slugifyHeading } from '@/lib/lichen/wikilinks'
import { isBranchSlug } from '@/lib/lichen/branches'

export const TALK_PREFIX = 'talk:'
export const CATEGORY_PREFIX = 'Category:'

const REDIRECT_LINE_RE = /^(?:#\s*)?redirect:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/im
const CATEGORY_WIKILINK_RE = /\[\[Category:([^\]|#]+?)(?:\|[^\]]+)?\]\]/gi
const INFOBOX_RE = /\{\{infobox\s*([^}]+)\}\}/gi

export interface InfoboxField {
  key: string
  value: string
}

export interface ParsedNoteContent {
  body: string
  redirect?: string
  categories: string[]
  status?: 'draft' | 'stub'
  blogPath?: string
  template?: string
  canon?: 'main' | 'au' | 'spoilers'
  date?: string
  era?: string
  mapX?: number
  mapY?: number
  mapImage?: string
  mapReveal?: number
  mapLocked?: boolean
  mapUnlockAt?: string
  mapTeaser?: string
  mapFog?: string
  /** Off-wiki records an admin approved for the network-references panel. */
  references: string[]
  infoboxes: InfoboxField[]
}

export function parseNoteContent(raw: string): ParsedNoteContent {
  const { frontmatter, body: afterFm } = parseFrontmatter(raw)
  let body = afterFm.trimStart()

  let redirect = frontmatter.redirect
  const redirectMatch = body.match(REDIRECT_LINE_RE)
  if (redirectMatch) {
    redirect = redirectMatch[1]
    body = body.replace(REDIRECT_LINE_RE, '').trimStart()
  }

  const categories = new Set<string>(frontmatter.categories ?? [])
  let match: RegExpExecArray | null
  const categoryRe = new RegExp(CATEGORY_WIKILINK_RE.source, 'gi')
  while ((match = categoryRe.exec(body)) !== null) {
    categories.add(match[1].trim())
  }

  const infoboxes: InfoboxField[] = []
  const infoboxRe = new RegExp(INFOBOX_RE.source, 'gi')
  while ((match = infoboxRe.exec(body)) !== null) {
    const fields = parseInfoboxFields(match[1])
    infoboxes.push(...fields)
  }

  return {
    body,
    redirect,
    categories: [...categories],
    status: frontmatter.status,
    blogPath: frontmatter.blogPath,
    template: frontmatter.template,
    canon: frontmatter.canon,
    date: frontmatter.date,
    era: frontmatter.era,
    mapX: frontmatter.mapX,
    mapY: frontmatter.mapY,
    mapImage: frontmatter.mapImage,
    mapReveal: frontmatter.mapReveal,
    mapLocked: frontmatter.mapLocked,
    mapUnlockAt: frontmatter.mapUnlockAt,
    mapTeaser: frontmatter.mapTeaser,
    mapFog: frontmatter.mapFog,
    references: frontmatter.references ?? [],
    infoboxes,
  }
}

function parseInfoboxFields(raw: string): InfoboxField[] {
  const fields: InfoboxField[] = []
  const parts = raw.split(/[|\n]/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim().toLowerCase()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (key && value) fields.push({ key, value })
  }
  return fields
}

export function talkSlugFor(noteSlug: string): string {
  return `${TALK_PREFIX}${noteSlug}`
}

export function isTalkSlug(slug: string): boolean {
  return slug.startsWith(TALK_PREFIX)
}

export function subjectSlugFromTalk(talkSlug: string): string | null {
  if (!isTalkSlug(talkSlug)) return null
  return talkSlug.slice(TALK_PREFIX.length) || null
}

export type NoteKind = 'article' | 'discussion' | 'branch'

/**
 * What a note is, from the reader's point of view. Slug prefixes are an
 * implementation detail — anything user-facing should name the kind, so an
 * action on an ordinary page reads "article" rather than the internal "note".
 */
export function noteKind(slug: string): NoteKind {
  if (isTalkSlug(slug)) return 'discussion'
  if (isBranchSlug(slug)) return 'branch'
  return 'article'
}

export function categorySlug(name: string): string {
  return slugifyHeading(name)
}

export function noteDisplayContent(note: LichenNoteWithContent): ParsedNoteContent {
  return parseNoteContent(note.content)
}

export function resolveRedirectTarget(
  note: LichenNoteWithContent,
  notes: LichenNoteWithContent[],
  depth = 0,
): LichenNoteWithContent | null {
  if (depth > 5) return null
  const parsed = parseNoteContent(note.content)
  if (!parsed.redirect) return note

  const target = notes.find((item) => item.slug === parsed.redirect)
  if (!target) return null
  return resolveRedirectTarget(target, notes, depth + 1)
}
