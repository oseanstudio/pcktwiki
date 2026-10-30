import type {
  LichenNoteWithContent,
  LichenRevisionRecord,
  LichenWikiRecord,
} from '@/types/lichen'
import { buildStaticWikiSite } from '@/lib/export/wiki-static-site'
import { noteToMarkdown, parseNoteMarkdown } from '@/lib/export/bundle-frontmatter'
import {
  joinFrontmatter,
  parseFrontmatter,
  splitFrontmatter,
  type NoteFrontmatter,
} from '@/lib/lichen/frontmatter'
import {
  sitePageToMarkdown,
  slugFromSiteFilename,
  type ParsedSitePage,
} from '@/lib/export/html-to-markdown'
import {
  buildBundleChrome,
  packWikiMedia,
  rewriteContentUrls,
  serializeHeaderLinks,
  type BundleHeaderLink,
  type WikiBundleChrome,
} from '@/lib/export/wiki-bundle-media'

export interface WikiBundleManifest {
  version: 1 | 2 | 3
  exportedAt: string
  wiki: {
    name: string
    slug: string
    language: string
    visibility: LichenWikiRecord['visibility']
    description?: string
    uri?: string
    ownerDid?: string
  }
  noteCount: number
  includesChrome?: boolean
  includesMedia?: boolean
  /** True when the zip includes a browsable `site/` static website. */
  includesStaticSite?: boolean
}

export interface WikiBundleNote {
  slug: string
  title: string
  content: string
  /** Original note creation time, preserved so a restore is not backdated to now. */
  createdAt?: string
  /**
   * The note's own frontmatter, parsed for consumers that want to reason about
   * redirects, categories or draft status without re-parsing `content`.
   * Authoritative data stays in `content`.
   */
  frontmatter?: NoteFrontmatter
  navTitle?: string
  subheaderLinks?: BundleHeaderLink[]
}

export interface WikiBundleData {
  manifest: WikiBundleManifest
  notes: WikiBundleNote[]
  chrome?: WikiBundleChrome
  /** Packed binary media keyed by `media/…` path. */
  mediaFiles?: Record<string, Uint8Array>
  revisions?: Record<string, LichenRevisionRecord[]>
}

export interface WikiExportOptions {
  ownerHandle?: string
  /** Include wiki chrome (header/nav/header image). Default true. */
  includeChrome?: boolean
  /** Include and remap images. Default true. */
  includeMedia?: boolean
  /** Include a self-contained HTML/CSS website under `site/` (default true). */
  includeStaticSite?: boolean
}

export function wikiToBundleData(
  wiki: LichenWikiRecord,
  notes: LichenNoteWithContent[],
  revisions?: LichenRevisionRecord[],
  options: WikiExportOptions = {},
): WikiBundleData {
  const includeChrome = options.includeChrome !== false
  const includeMedia = options.includeMedia !== false
  return {
    manifest: {
      version: 2,
      exportedAt: new Date().toISOString(),
      wiki: {
        name: wiki.name,
        slug: wiki.slug,
        language: wiki.language,
        visibility: wiki.visibility,
        description: wiki.description,
        uri: wiki.uri,
        ownerDid: wiki.ownerDid,
      },
      noteCount: notes.length,
      includesChrome: includeChrome,
      includesMedia: includeMedia,
      includesStaticSite: options.includeStaticSite !== false,
    },
    notes: notes.map((note) => ({
      slug: note.slug,
      title: note.title,
      content: note.content,
      navTitle: note.navTitle,
      subheaderLinks: note.subheaderLinks?.map((link) => ({
        label: link.label,
        url: link.url,
      })),
    })),
    revisions: revisions
      ? Object.fromEntries(
          notes.map((note) => [
            note.slug,
            revisions.filter((r) => r.noteRef === note.uri),
          ]),
        )
      : undefined,
  }
}

export async function exportWikiZip(
  data: WikiBundleData,
  options: WikiExportOptions & {
    wiki?: LichenWikiRecord
    notesWithContent?: LichenNoteWithContent[]
  } = {},
): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate')
  const includeChrome = options.includeChrome !== false
  const includeMedia = options.includeMedia !== false

  let notes = data.notes
  let chrome = data.chrome
  let mediaFiles = data.mediaFiles ?? {}

  if (options.wiki && options.notesWithContent && (includeChrome || includeMedia)) {
    const packed = includeMedia
      ? await packWikiMedia(options.wiki, options.notesWithContent)
      : { files: {}, urlMap: new Map<string, string>(), cidMap: new Map<string, string>() }

    mediaFiles = packed.files
    notes = options.notesWithContent.map((note) => ({
      slug: note.slug,
      title: note.title,
      createdAt: note.createdAt,
      content: includeMedia
        ? rewriteContentUrls(note.content, packed.urlMap)
        : note.content,
      navTitle: note.navTitle,
      subheaderLinks: includeChrome
        ? serializeHeaderLinks(note.subheaderLinks, packed.cidMap, packed.urlMap)
        : undefined,
    }))
    if (includeChrome) {
      chrome = buildBundleChrome(options.wiki, packed.cidMap, packed.urlMap)
    }
  }

  const manifest: WikiBundleManifest = {
    ...data.manifest,
    version: 3,
    noteCount: notes.length,
    includesChrome: Boolean(chrome),
    includesMedia: Object.keys(mediaFiles).length > 0,
    includesStaticSite: options.includeStaticSite !== false,
  }

  const files: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
  }

  if (chrome) {
    files['wiki.json'] = strToU8(JSON.stringify(chrome, null, 2))
  }

  for (const note of notes) {
    // Metadata rides in the note's own frontmatter block, so each `.md` is a
    // self-describing document rather than a file plus a JSON shadow.
    files[`notes/${note.slug}.md`] = strToU8(
      noteToMarkdown(
        {
          slug: note.slug,
          title: note.title,
          createdAt: note.createdAt,
          navTitle: note.navTitle,
          subheaderLinks: note.subheaderLinks,
        },
        note.content,
      ),
    )
    if (data.revisions?.[note.slug]?.length) {
      files[`revisions/${note.slug}.json`] = strToU8(
        JSON.stringify(data.revisions[note.slug], null, 2),
      )
    }
  }

  for (const [path, bytes] of Object.entries(mediaFiles)) {
    files[path] = bytes
  }

  const includeSite = options.includeStaticSite !== false
  if (includeSite && options.wiki && options.notesWithContent) {
    const { files: siteFiles } = await buildStaticWikiSite(
      options.wiki,
      options.notesWithContent,
      { ownerHandle: options.ownerHandle },
    )
    for (const [path, bytes] of Object.entries(siteFiles)) {
      files[`site/${path}`] = bytes
    }
  }

  const zipped = zipSync(files)
  return new Blob([zipped], { type: 'application/zip' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download a portable zip including notes, chrome, images, and optional static site. */
export async function downloadWikiExport(
  wiki: LichenWikiRecord,
  notes: LichenNoteWithContent[],
  revisions?: LichenRevisionRecord[],
  options: WikiExportOptions = {},
): Promise<void> {
  const data = wikiToBundleData(wiki, notes, revisions, options)
  const blob = await exportWikiZip(data, {
    ...options,
    wiki,
    notesWithContent: notes,
  })
  downloadBlob(blob, `${wiki.slug}.pcktwiki.zip`)
}

export interface ParseWikiZipOptions {
  /**
   * Take page bodies from the exported `site/*.html` instead of `notes/*.md`,
   * for bundles whose HTML was hand-edited. Frontmatter still comes from the
   * markdown, since the renderer strips it before producing HTML.
   */
  preferSiteHtml?: boolean
}

/** Page bodies recovered from an exported static site, keyed by slug. */
export function notesFromSiteHtml(
  unzipped: Record<string, Uint8Array>,
  strFromU8: (bytes: Uint8Array) => string,
  knownSlugs: Set<string>,
): Map<string, ParsedSitePage> {
  const pages = new Map<string, ParsedSitePage>()
  for (const [path, data] of Object.entries(unzipped)) {
    if (!path.startsWith('site/') || !path.endsWith('.html')) continue
    const slug = slugFromSiteFilename(path)
    if (!slug) continue
    const parsed = sitePageToMarkdown(strFromU8(data), { knownSlugs })
    if (parsed) pages.set(slug, parsed)
  }
  return pages
}

export async function parseWikiZip(
  file: File,
  options: ParseWikiZipOptions = {},
): Promise<WikiBundleData> {
  const { unzipSync, strFromU8 } = await import('fflate')
  const buffer = new Uint8Array(await file.arrayBuffer())
  const unzipped = unzipSync(buffer)

  const manifestRaw = unzipped['manifest.json']
  if (!manifestRaw) throw new Error('Invalid bundle: missing manifest.json')
  const manifest = JSON.parse(strFromU8(manifestRaw)) as WikiBundleManifest

  const chromeRaw = unzipped['wiki.json']
  const chrome = chromeRaw
    ? (JSON.parse(strFromU8(chromeRaw)) as WikiBundleChrome)
    : undefined

  const mediaFiles: Record<string, Uint8Array> = {}
  for (const [path, data] of Object.entries(unzipped)) {
    if (!path.startsWith('media/') || path.endsWith('/')) continue
    mediaFiles[path] = data
  }

  const notes: WikiBundleNote[] = []
  for (const [path, data] of Object.entries(unzipped)) {
    if (!path.startsWith('notes/') || !path.endsWith('.md')) continue
    const pathSlug = path.slice('notes/'.length, -3)
    const parsed = parseNoteMarkdown(strFromU8(data))

    // v2 bundles kept subheader links in a sidecar; still honour it when the
    // frontmatter does not carry them.
    let subheaderLinks = parsed.subheaderLinks
    if (!subheaderLinks) {
      const metaRaw = unzipped[`notes/${pathSlug}.meta.json`]
      if (metaRaw) {
        try {
          const meta = JSON.parse(strFromU8(metaRaw)) as { subheaderLinks?: BundleHeaderLink[] }
          subheaderLinks = meta.subheaderLinks
        } catch {
          subheaderLinks = undefined
        }
      }
    }

    notes.push({
      slug: parsed.slug || pathSlug,
      title: parsed.title || pathSlug,
      content: parsed.content,
      createdAt: parsed.createdAt,
      navTitle: parsed.navTitle,
      frontmatter: parseFrontmatter(parsed.content).frontmatter,
      subheaderLinks,
    })
  }

  if (options.preferSiteHtml) {
    const knownSlugs = new Set(notes.map((note) => note.slug))
    const pages = notesFromSiteHtml(unzipped, strFromU8, knownSlugs)
    for (const note of notes) {
      const page = pages.get(note.slug)
      if (!page) continue
      // The renderer strips frontmatter before emitting HTML, so keep the
      // markdown's frontmatter and swap in only the edited body.
      const { raw } = splitFrontmatter(note.content)
      note.content = joinFrontmatter(raw, page.content)
      if (page.title) note.title = page.title
    }
  }

  const revisions: Record<string, LichenRevisionRecord[]> = {}
  for (const [path, data] of Object.entries(unzipped)) {
    if (!path.startsWith('revisions/') || !path.endsWith('.json')) continue
    const slug = path.slice('revisions/'.length, -5)
    try {
      const parsed = JSON.parse(strFromU8(data)) as LichenRevisionRecord[]
      if (Array.isArray(parsed) && parsed.length) revisions[slug] = parsed
    } catch {
      // A corrupt history file must not sink the rest of the restore.
    }
  }

  return {
    manifest,
    notes,
    chrome,
    mediaFiles: Object.keys(mediaFiles).length ? mediaFiles : undefined,
    revisions: Object.keys(revisions).length ? revisions : undefined,
  }
}
