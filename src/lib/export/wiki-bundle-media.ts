import type {
  LichenBlobRef,
  LichenHeaderLink,
  LichenNavLink,
  LichenNoteWithContent,
  LichenWikiRecord,
} from '@/types/lichen'
import { scanWikiMedia } from '@/lib/lichen/media-index'
import {
  blobCid,
  blobRefToJson,
  isBlobUrl,
  resolveBlobDisplayUrl,
  uploadBlob,
} from '@/lib/atproto/blobs'
import { prepareImageUpload } from '@/lib/media/prepare-image-upload'
import { getMediaBlob } from '@/lib/offline/wiki-store'
import type { Agent } from '@atproto/api'

export interface BundleMediaRef {
  path: string
  sourceCid?: string
  mimeType?: string
}

export interface BundleHeaderLink {
  label: string
  url: string
  image?: BundleMediaRef
}

export interface WikiBundleChrome {
  theme?: 'light' | 'dark'
  /** Accent colour as a CSS hex value. */
  accentColor?: string
  bgColor?: string
  cardColor?: string
  sidebarColor?: string
  headerColor?: string
  /** Content font family name. */
  fontFamily?: string
  /** Reading column width. */
  layoutWidth?: 'narrow' | 'medium' | 'wide'
  headerLinks?: BundleHeaderLink[]
  navbarLinks?: LichenNavLink[]
  /** Ordered note slugs for the left sidebar page list. */
  sidebarOrder?: string[]
  headerImage?: BundleMediaRef | null
}

function extFromMime(mime: string | null, url: string): string {
  if (mime?.includes('png')) return 'png'
  if (mime?.includes('webp')) return 'webp'
  if (mime?.includes('gif')) return 'gif'
  if (mime?.includes('svg')) return 'svg'
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg'
  const fromUrl = url.match(/\.(png|jpe?g|gif|webp|svg)(?:\?|$)/i)?.[1]
  if (fromUrl) return fromUrl.toLowerCase() === 'jpeg' ? 'jpg' : fromUrl.toLowerCase()
  return 'bin'
}

function safeMediaName(sourceKey: string, ext: string): string {
  let base = sourceKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'media'
  return `${base}.${ext}`
}

async function fetchBytes(url: string): Promise<{ bytes: Uint8Array; mime: string | null } | null> {
  try {
    const cached = await getMediaBlob(url)
    if (cached) {
      return {
        bytes: new Uint8Array(await cached.arrayBuffer()),
        mime: cached.type || null,
      }
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      mime: res.headers.get('content-type'),
    }
  } catch {
    return null
  }
}

async function resolveFetchUrl(ownerDid: string, imageOrUrl: unknown): Promise<string | null> {
  if (typeof imageOrUrl === 'string') {
    if (/^https?:\/\//i.test(imageOrUrl)) return imageOrUrl
    if (isBlobUrl(imageOrUrl)) return resolveBlobDisplayUrl(ownerDid, imageOrUrl)
    return null
  }
  return resolveBlobDisplayUrl(ownerDid, imageOrUrl)
}

export interface PackedMedia {
  files: Record<string, Uint8Array>
  /** Original blob:cid / getBlob URL / https URL → media/… path */
  urlMap: Map<string, string>
  /** Source CID → media/… path */
  cidMap: Map<string, string>
}

/**
 * Pack note markdown images + wiki/note chrome blobs into `media/` files.
 */
export async function packWikiMedia(
  wiki: LichenWikiRecord,
  notes: LichenNoteWithContent[],
): Promise<PackedMedia> {
  const files: Record<string, Uint8Array> = {}
  const urlMap = new Map<string, string>()
  const cidMap = new Map<string, string>()
  const usedNames = new Set<string>()

  async function packOne(key: string, imageOrUrl: unknown): Promise<string | null> {
    const cid = typeof imageOrUrl === 'string' && imageOrUrl.startsWith('blob:')
      ? imageOrUrl.slice('blob:'.length)
      : blobCid(imageOrUrl)
    if (cid && cidMap.has(cid)) {
      const path = cidMap.get(cid)!
      if (typeof imageOrUrl === 'string') urlMap.set(imageOrUrl, path)
      return path
    }

    const fetchUrl = await resolveFetchUrl(wiki.ownerDid, imageOrUrl)
    if (!fetchUrl) return null
    if (urlMap.has(fetchUrl)) return urlMap.get(fetchUrl)!

    const fetched = await fetchBytes(fetchUrl)
    if (!fetched) return null

    const sourceKey = cid || key
    let name = safeMediaName(sourceKey, extFromMime(fetched.mime, fetchUrl))
    if (usedNames.has(name)) {
      const stem = name.replace(/\.[^.]+$/, '')
      const ext = name.slice(stem.length)
      let i = 2
      while (usedNames.has(`${stem}-${i}${ext}`)) i += 1
      name = `${stem}-${i}${ext}`
    }
    usedNames.add(name)
    const path = `media/${name}`
    files[path] = fetched.bytes

    if (typeof imageOrUrl === 'string') urlMap.set(imageOrUrl, path)
    urlMap.set(fetchUrl, path)
    if (cid) {
      cidMap.set(cid, path)
      urlMap.set(`blob:${cid}`, path)
    }
    return path
  }

  for (const asset of scanWikiMedia(notes)) {
    await packOne(asset.fullUrl, asset.fullUrl)
    if (asset.url !== asset.fullUrl) await packOne(asset.url, asset.url)
  }

  if (wiki.headerImage) {
    await packOne('header-image', wiki.headerImage)
  }
  for (const [index, link] of (wiki.headerLinks ?? []).entries()) {
    if (link.image) await packOne(`header-link-${index}`, link.image)
  }
  for (const note of notes) {
    for (const [index, link] of (note.subheaderLinks ?? []).entries()) {
      if (link.image) await packOne(`subheader-${note.slug}-${index}`, link.image)
    }
  }

  return { files, urlMap, cidMap }
}

export function rewriteContentUrls(content: string, urlMap: Map<string, string>): string {
  if (!urlMap.size) return content
  let next = content
  // Longer keys first so getBlob URLs rewrite before shorter fragments.
  const entries = [...urlMap.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [from, to] of entries) {
    if (!from) continue
    next = next.split(from).join(to)
  }
  return next
}

export function toBundleMediaRef(
  image: unknown,
  cidMap: Map<string, string>,
  urlMap: Map<string, string>,
): BundleMediaRef | undefined {
  const cid = blobCid(image)
  if (cid && cidMap.has(cid)) {
    return { path: cidMap.get(cid)!, sourceCid: cid }
  }
  if (typeof image === 'string' && urlMap.has(image)) {
    return { path: urlMap.get(image)!, sourceCid: cid ?? undefined }
  }
  return undefined
}

export function serializeHeaderLinks(
  links: LichenHeaderLink[] | undefined,
  cidMap: Map<string, string>,
  urlMap: Map<string, string>,
): BundleHeaderLink[] | undefined {
  if (!links?.length) return undefined
  return links.map((link) => ({
    label: link.label,
    url: link.url,
    image: link.image ? toBundleMediaRef(link.image, cidMap, urlMap) : undefined,
  }))
}

export function buildBundleChrome(
  wiki: LichenWikiRecord,
  cidMap: Map<string, string>,
  urlMap: Map<string, string>,
): WikiBundleChrome {
  return {
    theme: wiki.theme,
    accentColor: wiki.accentColor,
    bgColor: wiki.bgColor,
    cardColor: wiki.cardColor,
    sidebarColor: wiki.sidebarColor,
    headerColor: wiki.headerColor,
    fontFamily: wiki.fontFamily,
    layoutWidth: wiki.layoutWidth,
    headerLinks: serializeHeaderLinks(wiki.headerLinks, cidMap, urlMap),
    navbarLinks: wiki.navbarLinks?.length ? wiki.navbarLinks.map((l) => ({ ...l })) : undefined,
    sidebarOrder: wiki.sidebarOrder !== undefined ? [...wiki.sidebarOrder] : undefined,
    headerImage: wiki.headerImage
      ? toBundleMediaRef(wiki.headerImage, cidMap, urlMap) ?? null
      : undefined,
  }
}

export type MediaUploadMap = Map<string, { blobUrl: string; blobJson: LichenBlobRef }>

/** Upload packed media files; keys are `media/…` paths. */
export async function uploadBundleMedia(
  agent: Agent,
  mediaFiles: Record<string, Uint8Array>,
): Promise<MediaUploadMap> {
  const map: MediaUploadMap = new Map()
  for (const [path, bytes] of Object.entries(mediaFiles)) {
    const ext = path.split('.').pop()?.toLowerCase() ?? 'bin'
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'svg'
                ? 'image/svg+xml'
                : 'application/octet-stream'
    const file = new File([new Uint8Array(bytes)], path.split('/').pop() || 'media', {
      type: mime,
    })
    const prepared = await prepareImageUpload(file, 'article')
    const uploaded = await uploadBlob(agent, prepared)
    const blobJson = blobRefToJson(uploaded.blob) ?? uploaded.blob
    map.set(path, { blobUrl: uploaded.url, blobJson: blobJson as LichenBlobRef })
  }
  return map
}

export function remapContentMedia(content: string, mediaMap: MediaUploadMap): string {
  if (!mediaMap.size) return content
  let next = content
  const entries = [...mediaMap.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [path, uploaded] of entries) {
    next = next.split(path).join(uploaded.blobUrl)
  }
  return next
}

export function remapHeaderLinks(
  links: BundleHeaderLink[] | undefined,
  mediaMap: MediaUploadMap,
): LichenHeaderLink[] | undefined {
  if (!links?.length) return undefined
  return links.map((link) => ({
    label: link.label,
    url: link.url,
    image: link.image ? mediaMap.get(link.image.path)?.blobJson : undefined,
  }))
}

export function remapChromeHeaderImage(
  chrome: WikiBundleChrome | undefined,
  mediaMap: MediaUploadMap,
): LichenBlobRef | undefined {
  const path = chrome?.headerImage?.path
  if (!path) return undefined
  return mediaMap.get(path)?.blobJson
}
