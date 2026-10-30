import type { Agent } from '@atproto/api'
import type { WikiBundleData, WikiBundleNote } from '@/lib/export/wiki-bundle'
import { uniqueSlug, updateNoteCreatedAt } from '@/lib/atproto/lichen'
import {
  hasRestorableHistory,
  replayRevisionsOnto,
  restoreNoteWithHistory,
} from '@/lib/export/wiki-restore'
import { trackImportAsFork } from '@/lib/export/bundle-fork'
import {
  remapChromeHeaderImage,
  remapContentMedia,
  remapHeaderLinks,
  uploadBundleMedia,
  type MediaUploadMap,
} from '@/lib/export/wiki-bundle-media'

export type ImportConflictMode = 'overwrite' | 'skip' | 'rename'

export interface ImportIntoWikiResult {
  imported: number
  overwritten: number
  skipped: number
  chromeApplied?: boolean
  mediaUploaded?: number
}

export interface ImportNotesOptions {
  selectedSlugs: string[]
  conflictMode: ImportConflictMode
  /** Apply wiki header/nav/header image from the backup. Default true when present. */
  includeChrome?: boolean
  /** Upload packed images and rewrite markdown / link icons. Default true when present. */
  includeMedia?: boolean
  /** Apply per-note subheader links from the backup. Default true when present. */
  includeSubheaderLinks?: boolean
  /**
   * Replay recorded revisions and keep original note creation times, so the
   * result is a restore rather than a fresh copy. Default true when the bundle
   * carries history.
   */
  restoreHistory?: boolean
  /**
   * Record the imported wiki as a fork of the wiki the bundle came from, so it
   * can track and merge upstream changes. Off by default: a plain restore of
   * your own backup should not gain an upstream.
   */
  trackAsFork?: boolean
  /** Auto-apply non-conflicting upstream changes, when tracking as a fork. */
  forkAutoSync?: boolean
}

async function prepareMediaMap(
  agent: Agent,
  bundle: WikiBundleData,
  includeMedia: boolean,
): Promise<MediaUploadMap> {
  if (!includeMedia || !bundle.mediaFiles || !Object.keys(bundle.mediaFiles).length) {
    return new Map()
  }
  return uploadBundleMedia(agent, bundle.mediaFiles)
}

function remapNote(
  note: WikiBundleNote,
  mediaMap: MediaUploadMap,
  includeSubheaderLinks: boolean,
): WikiBundleNote {
  return {
    ...note,
    content: remapContentMedia(note.content, mediaMap),
    subheaderLinks: includeSubheaderLinks ? note.subheaderLinks : undefined,
  }
}

async function applyChrome(
  agent: Agent,
  bundle: WikiBundleData,
  mediaMap: MediaUploadMap,
): Promise<boolean> {
  if (!bundle.chrome) return false
  const { useLichenStore } = await import('@/stores/lichen')
  const lichen = useLichenStore()
  if (!lichen.currentWiki) return false

  const headerImage = remapChromeHeaderImage(bundle.chrome, mediaMap)
  const headerLinks = remapHeaderLinks(bundle.chrome.headerLinks, mediaMap)
  const navbarLinks = bundle.chrome.navbarLinks
  const sidebarOrder = bundle.chrome.sidebarOrder

  if (headerLinks) {
    await lichen.setWikiHeaderLinks(agent, headerLinks)
  }
  if (navbarLinks) {
    await lichen.setWikiNavbarLinks(agent, navbarLinks)
  }
  if (Array.isArray(sidebarOrder)) {
    await lichen.setWikiSidebarOrder(agent, sidebarOrder)
  }
  if (headerImage !== undefined) {
    await lichen.setWikiHeaderImage(agent, headerImage)
  } else if (bundle.chrome.headerImage === null) {
    await lichen.setWikiHeaderImage(agent, undefined)
  }
  const theme = bundle.chrome.theme === 'light' || bundle.chrome.theme === 'dark'
    ? bundle.chrome.theme
    : undefined
  const { accentColor, bgColor, cardColor, sidebarColor, headerColor, fontFamily, layoutWidth } =
    bundle.chrome
  if (
    theme ||
    accentColor ||
    bgColor ||
    cardColor ||
    sidebarColor ||
    headerColor ||
    fontFamily ||
    layoutWidth
  ) {
    await lichen.setWikiTheme(agent, {
      theme,
      accentColor,
      bgColor,
      cardColor,
      sidebarColor,
      headerColor,
      fontFamily,
      layoutWidth,
    })
  }
  return true
}

async function applyNoteSubheaderLinks(
  agent: Agent,
  noteSlug: string,
  bundleNote: WikiBundleNote,
  mediaMap: MediaUploadMap,
): Promise<void> {
  if (!bundleNote.subheaderLinks?.length) return
  const { useLichenStore } = await import('@/stores/lichen')
  const lichen = useLichenStore()
  const note = lichen.getNoteBySlug(noteSlug)
  if (!note) return
  const links = remapHeaderLinks(bundleNote.subheaderLinks, mediaMap) ?? []
  await lichen.setNoteSubheaderLinks(agent, note, links)
}

async function applyNoteNavTitle(
  agent: Agent,
  noteSlug: string,
  bundleNote: WikiBundleNote,
): Promise<void> {
  const navTitle = bundleNote.navTitle?.trim()
  if (!navTitle) return
  const { useLichenStore } = await import('@/stores/lichen')
  const lichen = useLichenStore()
  const note = lichen.getNoteBySlug(noteSlug)
  if (!note) return
  await lichen.setNoteNavTitle(agent, note, navTitle)
}

export async function importWikiBundle(
  agent: Agent,
  bundle: WikiBundleData,
  existingWikiSlugs: string[],
  options: Omit<ImportNotesOptions, 'selectedSlugs' | 'conflictMode'> = {},
): Promise<{ slug: string; noteCount: number; forkedFrom?: string }> {
  const { useLichenStore } = await import('@/stores/lichen')
  const lichen = useLichenStore()

  const includeMedia = options.includeMedia !== false
  const includeChrome = options.includeChrome !== false
  const includeSubheaderLinks = options.includeSubheaderLinks !== false

  const mediaMap = await prepareMediaMap(agent, bundle, includeMedia)
  const remappedNotes = bundle.notes.map((note) =>
    remapNote(note, mediaMap, includeSubheaderLinks),
  )

  const home = remappedNotes.find((n) => n.slug === 'home')
  const preferredSlug = uniqueSlug(
    bundle.manifest.wiki.slug || bundle.manifest.wiki.name,
    existingWikiSlugs,
  )

  const wiki = await lichen.createWiki(
    agent,
    bundle.manifest.wiki.name,
    bundle.manifest.wiki.language,
    bundle.manifest.wiki.visibility,
    bundle.manifest.wiki.description ?? '',
    home?.content,
    preferredSlug,
  )

  let handle: string | undefined
  try {
    const profile = await agent.getProfile({ actor: agent.accountDid })
    handle = profile.data.handle ?? undefined
  } catch {
    handle = undefined
  }

  await lichen.loadWiki(agent, agent.accountDid, wiki.slug, agent.accountDid, handle)

  if (includeChrome) {
    await applyChrome(agent, bundle, mediaMap)
  }

  if (home && includeSubheaderLinks) {
    await applyNoteSubheaderLinks(agent, 'home', home, mediaMap)
  }
  if (home) {
    await applyNoteNavTitle(agent, 'home', home)
  }

  const restoreHistory =
    options.restoreHistory !== false && hasRestorableHistory(bundle.revisions)

  // The create flow already made `home`; replay its history onto that record
  // rather than creating a second one.
  if (restoreHistory && home) {
    const homeNote = lichen.getNoteBySlug('home')
    if (homeNote) {
      await replayRevisionsOnto(agent, homeNote.uri, bundle.revisions?.[home.slug])
      if (home.createdAt) {
        await updateNoteCreatedAt(agent, homeNote, home.createdAt).catch(() => {})
      }
    }
  }

  const occupiedNoteSlugs = new Set(lichen.notes.map((n) => n.slug))
  const written: Array<{ slug: string; note: WikiBundleNote }> = []

  for (const note of remappedNotes) {
    if (note.slug === 'home') continue
    const slug = uniqueSlug(note.slug, [...occupiedNoteSlugs])
    occupiedNoteSlugs.add(slug)

    if (restoreHistory) {
      await restoreNoteWithHistory(agent, wiki.uri, slug, note, bundle.revisions?.[note.slug])
    } else {
      await lichen.createNoteWithSlug(agent, slug, note.title, note.content, 'Imported')
    }
    written.push({ slug, note })
  }

  if (restoreHistory) {
    // Restored notes were written straight to the repo, so the store has to
    // catch up before anything looks them up by slug.
    await lichen.loadWiki(agent, agent.accountDid, wiki.slug, agent.accountDid, handle)
  }

  if (includeSubheaderLinks) {
    for (const entry of written) {
      await applyNoteSubheaderLinks(agent, entry.slug, entry.note, mediaMap)
    }
  }
  for (const entry of written) {
    await applyNoteNavTitle(agent, entry.slug, entry.note)
  }

  let forkedFrom: string | undefined
  if (options.trackAsFork && handle) {
    const record = await trackImportAsFork(agent, bundle, wiki, {
      forkHandle: handle,
      autoSync: options.forkAutoSync,
    }).catch(() => null)
    forkedFrom = record?.sourceWikiUri
  }

  return { slug: wiki.slug, noteCount: remappedNotes.length, forkedFrom }
}

/** Import selected notes from a backup into the currently loaded wiki. */
export async function importNotesIntoCurrentWiki(
  agent: Agent,
  bundle: WikiBundleData,
  options: ImportNotesOptions,
): Promise<ImportIntoWikiResult> {
  const { useLichenStore } = await import('@/stores/lichen')
  const lichen = useLichenStore()
  if (!lichen.currentWiki) throw new Error('No wiki selected')

  const includeMedia = options.includeMedia !== false
  const includeChrome = options.includeChrome === true
  const includeSubheaderLinks = options.includeSubheaderLinks !== false

  const selected = new Set(options.selectedSlugs)
  const notes = bundle.notes.filter((note) => selected.has(note.slug))
  if (!notes.length && !includeChrome) {
    throw new Error('Select at least one page to import')
  }

  const mediaMap = await prepareMediaMap(agent, bundle, includeMedia)
  const remappedNotes = notes.map((note) =>
    remapNote(note, mediaMap, includeSubheaderLinks),
  )

  const restoreHistory =
    options.restoreHistory !== false && hasRestorableHistory(bundle.revisions)
  const wikiRef = lichen.currentWiki.uri
  const ownerDid = lichen.currentWiki.ownerDid
  const wikiSlug = lichen.currentWiki.slug

  const occupied = new Set(lichen.notes.map((n) => n.slug))
  const pendingLinks: Array<{ slug: string; note: WikiBundleNote }> = []
  let imported = 0
  let overwritten = 0
  let skipped = 0

  /** Restore with history when the backup has it, otherwise a plain create. */
  async function addNote(slug: string, note: WikiBundleNote): Promise<void> {
    if (restoreHistory) {
      await restoreNoteWithHistory(agent, wikiRef, slug, note, bundle.revisions?.[note.slug])
      return
    }
    await lichen.createNoteWithSlug(agent, slug, note.title, note.content, 'Imported from backup')
  }

  for (const note of remappedNotes) {
    const existing = lichen.getNoteBySlug(note.slug)
    if (existing) {
      if (options.conflictMode === 'skip') {
        skipped += 1
        continue
      }
      if (options.conflictMode === 'overwrite') {
        await lichen.saveNoteEdit(
          agent,
          existing,
          note.title,
          note.content,
          'Imported from backup',
        )
        if (includeSubheaderLinks) {
          await applyNoteSubheaderLinks(agent, existing.slug, note, mediaMap)
        }
        await applyNoteNavTitle(agent, existing.slug, note)
        overwritten += 1
        continue
      }
      const slug = uniqueSlug(note.slug, [...occupied])
      occupied.add(slug)
      await addNote(slug, note)
      pendingLinks.push({ slug, note })
      imported += 1
      continue
    }

    const slug = note.slug.includes(':') ? note.slug : uniqueSlug(note.slug, [...occupied])
    occupied.add(slug)
    await addNote(slug, note)
    pendingLinks.push({ slug, note })
    imported += 1
  }

  if (restoreHistory && pendingLinks.length) {
    // Restored notes bypassed the store, so refresh before looking them up.
    await lichen.loadWiki(agent, ownerDid, wikiSlug, agent.accountDid)
  }

  if (includeSubheaderLinks) {
    for (const entry of pendingLinks) {
      await applyNoteSubheaderLinks(agent, entry.slug, entry.note, mediaMap)
    }
  }
  for (const entry of pendingLinks) {
    await applyNoteNavTitle(agent, entry.slug, entry.note)
  }

  let chromeApplied = false
  if (includeChrome) {
    chromeApplied = await applyChrome(agent, bundle, mediaMap)
  }

  return {
    imported,
    overwritten,
    skipped,
    chromeApplied,
    mediaUploaded: mediaMap.size,
  }
}

export function bundleNoteLabel(note: WikiBundleNote): string {
  if (note.title.trim()) return note.title.trim()
  return note.slug
}
