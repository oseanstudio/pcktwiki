import { appUrl } from '@/lib/base-url'

export function wikiAtUri(wikiUri: string): string {
  return wikiUri.startsWith('at://') ? wikiUri : `at://${wikiUri.replace(/^at:\/\//, '')}`
}

export function noteAtUri(noteUri: string): string {
  return noteUri.startsWith('at://') ? noteUri : `at://${noteUri.replace(/^at:\/\//, '')}`
}

export async function copyPermalink(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function webUrlForNote(handle: string, wikiSlug: string, noteSlug: string): string {
  return appUrl(`/@${handle}/${wikiSlug}/${noteSlug}`)
}

export function webUrlForWiki(handle: string, wikiSlug: string): string {
  return appUrl(`/@${handle}/${wikiSlug}`)
}

export function parseAtUriParam(atUri: string): {
  did: string
  collection: string
  rkey: string
} | null {
  const normalized = atUri.replace(/^at:\/\//, '')
  const parts = normalized.split('/')
  if (parts.length < 3) return null
  return {
    did: parts[0],
    collection: parts[1],
    rkey: parts.slice(2).join('/'),
  }
}
