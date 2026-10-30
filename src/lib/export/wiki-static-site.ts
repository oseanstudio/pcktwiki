import { assetUrl } from '@/lib/base-url'
import type { LichenNoteWithContent, LichenWikiRecord } from '@/types/lichen'
import { renderMarkdown, type MarkdownRenderEnv } from '@/lib/markdown'
import type { WikilinkTarget } from '@/lib/lichen/wikilinks'
import { slugifyHeading } from '@/lib/lichen/wikilinks'
import { orderNotesForSidebar, noteNavLabel } from '@/lib/lichen/sidebar-order'
import {
  computeWikiCategories,
  getNotesInCategory,
} from '@/lib/lichen/categories'
import { scanWikiMedia } from '@/lib/lichen/media-index'
import { isBlobUrl, resolveBlobDisplayUrl } from '@/lib/atproto/blobs'
import { getMediaBlob } from '@/lib/offline/wiki-store'
import {
  accentHover,
  adjustColor,
  contentFontStack,
  hexToRgba,
  LAYOUT_WIDTHS,
  safeHexColor,
} from '@/lib/theme-colors'

/** Exported sites link back to wherever this build is deployed, not to a fixed host. */
const LIVE_ORIGIN = __SITE_URL__.replace(/\/+$/, '')

const FONT_ASSETS = [
  { path: 'fonts/lora-400700-latin.woff2', url: assetUrl('fonts/lora/lora-400700-latin.woff2') },
  {
    path: 'fonts/lora-400700-italic-latin.woff2',
    url: assetUrl('fonts/lora/lora-400700-italic-latin.woff2'),
  },
  {
    path: 'fonts/atkinson-hyperlegible-400-latin.woff2',
    url: assetUrl('fonts/legible/atkinson-hyperlegible-400-latin.woff2'),
  },
  {
    path: 'fonts/atkinson-hyperlegible-700-latin.woff2',
    url: assetUrl('fonts/legible/atkinson-hyperlegible-700-latin.woff2'),
  },
] as const

export interface StaticSiteOptions {
  ownerHandle?: string
  /** Origin for links that leave this wiki (default https://pckt.wiki). */
  liveOrigin?: string
}

export interface StaticSiteBuild {
  /** Paths relative to `site/` → file bytes. */
  files: Record<string, Uint8Array>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pageFilename(slug: string): string {
  return slug === 'home' ? 'index.html' : `${slug}.html`
}

function pageHref(slug: string, section?: string): string {
  const anchor = section ? `#${slugifyHeading(section)}` : ''
  return `${pageFilename(slug)}${anchor}`
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

function safeMediaName(sourceUrl: string, ext: string): string {
  let base = 'media'
  try {
    if (sourceUrl.startsWith('blob:')) {
      base = sourceUrl.slice('blob:'.length).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'media'
    } else {
      const u = new URL(sourceUrl)
      const cid = u.searchParams.get('cid')
      if (cid) base = cid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)
      else {
        const last = u.pathname.split('/').pop() || 'media'
        base = last.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'media'
      }
    }
  } catch {
    base = 'media'
  }
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
    // ignore cache miss
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

async function bundleMedia(
  wiki: LichenWikiRecord,
  notes: LichenNoteWithContent[],
): Promise<{ files: Record<string, Uint8Array>; urlMap: Map<string, string> }> {
  const files: Record<string, Uint8Array> = {}
  const urlMap = new Map<string, string>()
  const assets = scanWikiMedia(notes)
  const usedNames = new Set<string>()

  for (const asset of assets) {
    for (const original of asset.url === asset.fullUrl ? [asset.fullUrl] : [asset.fullUrl, asset.url]) {
      let fetchUrl = original

      if (isBlobUrl(original) && !original.includes('/xrpc/com.atproto.sync.getBlob')) {
        const resolved = await resolveBlobDisplayUrl(wiki.ownerDid, original)
        if (!resolved) continue
        fetchUrl = resolved
      }

      const fetched = await fetchBytes(fetchUrl)
      if (!fetched) continue

      let name = safeMediaName(original, extFromMime(fetched.mime, fetchUrl))
      if (usedNames.has(name)) {
        const stem = name.replace(/\.[^.]+$/, '')
        const ext = name.slice(stem.length)
        let i = 2
        while (usedNames.has(`${stem}-${i}${ext}`)) i += 1
        name = `${stem}-${i}${ext}`
      }
      usedNames.add(name)
      files[`media/${name}`] = fetched.bytes
      urlMap.set(original, `media/${name}`)
      if (fetchUrl !== original) urlMap.set(fetchUrl, `media/${name}`)
    }
  }

  return { files, urlMap }
}

function rewriteMediaUrls(content: string, urlMap: Map<string, string>): string {
  if (urlMap.size === 0) return content
  let next = content
  for (const [from, to] of urlMap) {
    next = next.split(from).join(to)
  }
  return next
}

async function bundleFonts(): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {}
  await Promise.all(
    FONT_ASSETS.map(async (font) => {
      try {
        const res = await fetch(font.url)
        if (!res.ok) return
        files[`assets/${font.path}`] = new Uint8Array(await res.arrayBuffer())
      } catch {
        // Fonts are optional; system fallbacks still work.
      }
    }),
  )
  return files
}

const LIGHT_VARS = `  --pckt-red: #ff5d5b;
  --pckt-blue: #58a7ff;
  --pckt-blue-active: #3d87d9;
  --pckt-bg: #f9fafb;
  --pckt-bg-elevated: #ffffff;
  --pckt-bg-muted: #f3f4f6;
  --pckt-bg-subtle: #e5e7eb;
  --pckt-text: #1f2937;
  --pckt-text-muted: #6b7280;
  --pckt-text-subtle: #9ca3af;
  --pckt-border: #e5e7eb;
  --pckt-border-strong: #d1d5db;
  --pckt-accent: #ff5d5b;
  --pckt-accent-hover: #f44c4a;
  --pckt-accent-soft: rgba(255, 93, 91, 0.12);
  --pckt-link: #ff5d5b;
  --pckt-font-ui: 'Atkinson Hyperlegible', system-ui, sans-serif;
  --pckt-font-serif: Lora, Georgia, serif;
  --pckt-font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --pckt-font-content: var(--pckt-font-serif);
  --pckt-tracking-wide: 0.05em;
  --pckt-radius-sm: 10px;
  --pckt-radius-pill: 9999px;
  --pckt-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
  --pckt-width-medium: 960px;
  --pckt-sidebar-width: 13.75rem;
  --pckt-page-gutter: 1.25rem;`

const DARK_VARS = `  --pckt-bg: #111827;
  --pckt-bg-elevated: #1f2937;
  --pckt-bg-muted: #1f2937;
  --pckt-bg-subtle: #374151;
  --pckt-text: #f3f4f6;
  --pckt-text-muted: rgba(255, 255, 255, 0.8);
  --pckt-text-subtle: #9ca3af;
  --pckt-border: #374151;
  --pckt-border-strong: #4b5563;
  --pckt-accent-soft: rgba(255, 93, 91, 0.18);
  --pckt-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);`

/**
 * Emit the owner's accent/font/width choices as a trailing `:root` block so it
 * overrides both the light defaults and the dark-mode block above it.
 */
export function buildThemeOverrides(wiki: LichenWikiRecord): string {
  const lines: string[] = []
  const accent = safeHexColor(wiki.accentColor)
  if (accent) {
    lines.push(`  --pckt-accent: ${accent};`)
    lines.push(`  --pckt-accent-hover: ${accentHover(accent)};`)
    lines.push(`  --pckt-accent-soft: ${hexToRgba(accent, 0.12)};`)
    lines.push(`  --pckt-link: ${accent};`)
  }
  const bg = safeHexColor(wiki.bgColor)
  if (bg) lines.push(`  --pckt-bg: ${bg};`)
  const card = safeHexColor(wiki.cardColor)
  if (card) lines.push(`  --pckt-bg-elevated: ${card};`)
  const sidebar = safeHexColor(wiki.sidebarColor)
  if (sidebar) {
    lines.push(`  --pckt-bg-muted: ${sidebar};`)
    lines.push(`  --pckt-bg-subtle: ${adjustColor(sidebar, -12)};`)
  }
  const header = safeHexColor(wiki.headerColor)
  if (header) lines.push(`  --pckt-header-bg: ${header};`)
  if (wiki.fontFamily) {
    lines.push(`  --pckt-font-content: ${contentFontStack(wiki.fontFamily)};`)
    lines.push(`  --pckt-font-serif: ${contentFontStack(wiki.fontFamily)};`)
  }
  if (wiki.layoutWidth) {
    lines.push(`  --pckt-width-medium: ${LAYOUT_WIDTHS[wiki.layoutWidth]};`)
  }
  if (!lines.length) return ''
  return `\n:root {\n${lines.join('\n')}\n}\n`
}

function buildSiteCss(wiki: LichenWikiRecord): string {
  const theme = wiki.theme
  const themeBlock =
    theme === 'dark'
      ? `html { color-scheme: dark; }
:root {
${LIGHT_VARS}
${DARK_VARS}
}
`
      : theme === 'light'
        ? `html { color-scheme: light; }
:root {
${LIGHT_VARS}
}
`
        : `html { color-scheme: light dark; }
:root {
${LIGHT_VARS}
}
@media (prefers-color-scheme: dark) {
  :root {
${DARK_VARS}
  }
}
`

  return `@font-face {
  font-family: Lora;
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/lora-400700-latin.woff2') format('woff2');
}
@font-face {
  font-family: Lora;
  font-style: italic;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/lora-400700-italic-latin.woff2') format('woff2');
}
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./fonts/atkinson-hyperlegible-400-latin.woff2') format('woff2');
}
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./fonts/atkinson-hyperlegible-700-latin.woff2') format('woff2');
}

${themeBlock}${buildThemeOverrides(wiki)}

*, *::before, *::after { box-sizing: border-box; }

html {
  font-size: 17px;
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  min-height: 100dvh;
  font-family: var(--pckt-font-serif);
  letter-spacing: var(--pckt-tracking-wide);
  background: var(--pckt-bg);
  color: var(--pckt-text);
  line-height: 1.5;
}

a {
  color: var(--pckt-link);
  text-decoration: none;
}

a:hover {
  color: var(--pckt-accent-hover);
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
}

.site-shell {
  display: grid;
  grid-template-columns: var(--pckt-sidebar-width) minmax(0, 1fr);
  gap: 2rem;
  width: min(var(--pckt-width-medium), calc(100% - 2 * var(--pckt-page-gutter)));
  margin: 0 auto;
  padding: 1.5rem var(--pckt-page-gutter) 3rem;
}

.site-brand {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--pckt-border);
  margin-bottom: 0.5rem;
}

.site-brand h1 {
  margin: 0;
  font-size: 1.5rem;
  font-family: var(--pckt-font-ui);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.site-brand h1 a {
  color: inherit;
  text-decoration: none;
}

.site-meta {
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  color: var(--pckt-text-muted);
}

.site-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-self: start;
  position: sticky;
  top: 1rem;
  max-height: calc(100dvh - 2rem);
  overflow: auto;
  padding: 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow);
}

.site-nav-label {
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pckt-text-subtle);
  margin: 0 0 0.35rem;
}

.site-nav a {
  display: block;
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  color: var(--pckt-text-muted);
  text-decoration: none;
}

.site-nav a:hover {
  background: color-mix(in srgb, var(--pckt-blue) 10%, var(--pckt-bg-elevated));
  color: var(--pckt-blue-active);
  text-decoration: none;
}

.site-nav a.active {
  background: var(--pckt-accent-soft);
  color: var(--pckt-accent);
  font-weight: 600;
}

.site-main {
  min-width: 0;
}

.page-header {
  margin-bottom: 1.25rem;
}

.page-header h1 {
  margin: 0 0 0.35rem;
  font-size: 2.25rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.page-desc {
  margin: 0;
  color: var(--pckt-text-muted);
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
}

.prose {
  font-family: var(--pckt-font-content);
  font-size: 1.0625rem;
  line-height: 1.75;
  color: var(--pckt-text);
}

.prose h1, .prose h2, .prose h3, .prose h4 {
  line-height: 1.25;
  margin: 1.75em 0 0.75em;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.prose h1 { font-size: 2.25rem; margin-top: 0; }
.prose h2 { font-size: 1.625rem; }
.prose h3 { font-size: 1.3125rem; }

.prose p, .prose ul, .prose ol, .prose blockquote, .prose pre {
  margin: 0 0 1em;
}

.prose ul, .prose ol { padding-left: 1.5em; }

.prose blockquote {
  border-left: 3px solid var(--pckt-red);
  padding-left: 1em;
  color: var(--pckt-text-muted);
}

.prose pre {
  background: var(--pckt-bg-subtle);
  border-radius: var(--pckt-radius-sm);
  padding: 1em;
  overflow-x: auto;
  font-family: var(--pckt-font-mono);
  font-size: 0.875rem;
}

.prose code {
  font-family: var(--pckt-font-mono);
  font-size: 0.875em;
  background: var(--pckt-bg-subtle);
  padding: 0.15em 0.35em;
  border-radius: 4px;
}

.prose pre code { background: none; padding: 0; }

.prose img { max-width: 100%; height: auto; }

.prose .md-img-frame {
  position: relative;
  display: block;
  max-width: 100%;
  margin: 0.75em 0;
  overflow: visible;
  background: transparent;
  line-height: 0;
}
.prose .md-img-frame.md-img--center { margin-inline: auto; }
.prose .md-img-frame.md-img--left {
  float: left;
  margin: 0.25rem 1rem 0.75rem 0;
  max-width: min(100%, 20rem);
}
.prose .md-img-frame.md-img--right {
  float: right;
  margin: 0.25rem 0 0.75rem 1rem;
  max-width: min(100%, 20rem);
}
.prose .md-img-frame.md-img-crop--rounded,
.prose img.md-img-solo.md-img-crop--rounded {
  border-radius: var(--pckt-radius-sm);
  overflow: hidden;
}
.prose .md-img-frame.md-img-crop--square,
.prose .md-img-frame.md-img-crop--circle,
.prose .md-img-frame.md-img-crop--wide,
.prose .md-img-frame.md-img-crop--tall {
  overflow: hidden;
}
.prose .md-img-frame.md-img-crop--square,
.prose .md-img-frame.md-img-crop--circle { aspect-ratio: 1; }
.prose .md-img-frame.md-img-crop--wide { aspect-ratio: 16 / 9; }
.prose .md-img-frame.md-img-crop--tall { aspect-ratio: 3 / 4; }
.prose .md-img-frame.md-img-crop--circle { border-radius: 50%; }
.prose .md-img-frame.md-img-crop--square > .md-img-full,
.prose .md-img-frame.md-img-crop--circle > .md-img-full,
.prose .md-img-frame.md-img-crop--wide > .md-img-full,
.prose .md-img-frame.md-img-crop--tall > .md-img-full {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.prose .md-img-frame > .md-img-full {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
}
.prose .md-img-frame > .md-img-lqip {
  display: none;
}

.prose img.md-img--center {
  display: block;
  margin-inline: auto;
}

.prose img.md-img--left {
  float: left;
  margin: 0.25rem 1rem 0.75rem 0;
  max-width: min(100%, 20rem);
}

.prose img.md-img--right {
  float: right;
  margin: 0.25rem 0 0.75rem 1rem;
  max-width: min(100%, 20rem);
}

@media (max-width: 640px) {
  .prose .md-img-frame.md-img--left,
  .prose .md-img-frame.md-img--right,
  .prose img.md-img--left,
  .prose img.md-img--right {
    float: none;
    display: block;
    margin-inline: auto;
    max-width: 100%;
  }
}

.prose hr {
  border: none;
  border-top: 1px solid var(--pckt-border);
  margin: 2em 0;
}

.prose .wikilink-missing {
  color: var(--pckt-text-subtle);
  border-bottom: 1px dashed var(--pckt-border-strong);
}

.markdown-body .infobox {
  float: right;
  clear: right;
  width: min(280px, 100%);
  margin: 0 0 1rem 1.5rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: color-mix(in srgb, var(--pckt-blue) 6%, var(--pckt-bg-elevated));
  overflow: hidden;
}

.markdown-body .infobox-title {
  padding: 0.5rem 0.75rem;
  font-weight: 700;
  font-size: 0.9375rem;
  background: color-mix(in srgb, var(--pckt-blue) 14%, var(--pckt-bg-elevated));
  border-bottom: 1px solid var(--pckt-border);
}

.markdown-body .infobox-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.markdown-body .infobox-table th {
  text-align: left;
  padding: 0.35rem 0.75rem;
  color: var(--pckt-text-muted);
  font-weight: 600;
  vertical-align: top;
  width: 38%;
}

.markdown-body .infobox-table td {
  padding: 0.35rem 0.75rem;
  vertical-align: top;
}

.markdown-body .category-link {
  color: var(--pckt-blue-active);
  font-weight: 600;
}

.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-list a {
  font-family: var(--pckt-font-ui);
}

.site-footer {
  grid-column: 1 / -1;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pckt-border);
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  color: var(--pckt-text-subtle);
}

@media (max-width: 768px) {
  .site-shell {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .site-nav {
    position: static;
    max-height: none;
  }

  .markdown-body .infobox {
    float: none;
    clear: both;
    width: 100%;
    margin: 0 0 1rem;
  }
}
`
}

function makeResolveHref(
  wiki: LichenWikiRecord,
  ownerHandle: string | undefined,
  existingSlugs: Set<string>,
  liveOrigin: string,
): MarkdownRenderEnv['resolveHref'] {
  return (target) => {
    if ('kind' in target && target.kind === 'category') {
      return `category-${target.slug}.html`
    }

    const t = target as WikilinkTarget
    if (!t.wikiSlug && !t.noteSlug && t.section) {
      return `#${slugifyHeading(t.section)}`
    }

    const isLocal =
      (!t.ownerHandle || t.ownerHandle === ownerHandle) &&
      (!t.wikiSlug || t.wikiSlug === wiki.slug)

    if (isLocal) {
      const slug = t.noteSlug || 'home'
      if (!existingSlugs.has(slug) && t.noteSlug) {
        return pageHref(slug, t.section)
      }
      return pageHref(slug || 'home', t.section)
    }

    const handle = t.ownerHandle ?? ownerHandle
    const wikiSlug = t.wikiSlug ?? wiki.slug
    const noteSlug = t.noteSlug || 'home'
    if (!handle) return null
    return `${liveOrigin}/@${encodeURIComponent(handle)}/${encodeURIComponent(wikiSlug)}/${encodeURIComponent(noteSlug)}${t.section ? `#${slugifyHeading(t.section)}` : ''}`
  }
}

function renderNav(
  notes: LichenNoteWithContent[],
  activeSlug: string,
  categories: ReturnType<typeof computeWikiCategories>,
  sidebarOrder?: string[],
): string {
  const pages = orderNotesForSidebar(notes, sidebarOrder)

  const pageLinks = pages
    .map(
      (n) =>
        `<a href="${escapeHtml(pageHref(n.slug))}" class="${n.slug === activeSlug ? 'active' : ''}">${escapeHtml(noteNavLabel(n))}</a>`,
    )
    .join('\n')

  const categoryLinks =
    categories.length > 0
      ? `<p class="site-nav-label">Categories</p>
${categories
  .map(
    (c) =>
      `<a href="${escapeHtml(`category-${c.slug}.html`)}" class="${activeSlug === `category:${c.slug}` ? 'active' : ''}">${escapeHtml(c.name)} <span>(${c.count})</span></a>`,
  )
  .join('\n')}`
      : ''

  return `<nav class="site-nav" aria-label="Pages">
<p class="site-nav-label">Pages</p>
${pageLinks}
${categoryLinks}
</nav>`
}

function wrapPage(opts: {
  wiki: LichenWikiRecord
  ownerHandle?: string
  title: string
  activeSlug: string
  description?: string
  bodyHtml: string
  navHtml: string
  exportedAt: string
}): string {
  const { wiki, ownerHandle, title, description, bodyHtml, navHtml, exportedAt } = opts
  const themeAttr = wiki.theme === 'dark' || wiki.theme === 'light' ? ` data-theme="${wiki.theme}"` : ''
  const handleBit = ownerHandle ? `@${ownerHandle}` : ''
  const docTitle = title === wiki.name ? wiki.name : `${title} · ${wiki.name}`

  return `<!DOCTYPE html>
<html lang="${escapeHtml(wiki.language || 'en')}"${themeAttr}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(docTitle)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ''}
  <link rel="stylesheet" href="assets/site.css" />
</head>
<body>
  <div class="site-shell">
    <header class="site-brand">
      <h1><a href="index.html">${escapeHtml(wiki.name)}</a></h1>
      <p class="site-meta">${escapeHtml([handleBit, wiki.slug].filter(Boolean).join(' / '))}</p>
    </header>
    ${navHtml}
    <main class="site-main">
      <header class="page-header">
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p class="page-desc">${escapeHtml(description)}</p>` : ''}
      </header>
      <article class="prose markdown-body">
        ${bodyHtml}
      </article>
    </main>
    <footer class="site-footer">
      Static export from pckt.wiki · ${escapeHtml(exportedAt.slice(0, 10))}
    </footer>
  </div>
</body>
</html>
`
}

function buildReadme(wiki: LichenWikiRecord): string {
  return `Static website export: ${wiki.name}
================================

This folder is a self-contained copy of the wiki.

Open it
--------
1. Unzip the .pcktwiki.zip archive.
2. Open site/index.html in a browser,
   or serve the site/ folder with any static file server:

     npx serve site
     python3 -m http.server --directory site

Contents
--------
- index.html and *.html — one page per wiki note
- category-*.html — category indexes (when used)
- assets/site.css — styles
- assets/fonts/ — self-hosted fonts (when available)
- media/ — images referenced by notes (when downloadable)

The parent zip also includes notes/*.md for re-import into pckt.wiki.
`
}

/**
 * Build a portable static website for a wiki: HTML pages, CSS, fonts, and media.
 * Paths in the returned map are relative to a `site/` directory.
 */
export async function buildStaticWikiSite(
  wiki: LichenWikiRecord,
  notes: LichenNoteWithContent[],
  options: StaticSiteOptions = {},
): Promise<StaticSiteBuild> {
  const ownerHandle = options.ownerHandle
  const liveOrigin = (options.liveOrigin ?? LIVE_ORIGIN).replace(/\/+$/, '')
  const exportedAt = new Date().toISOString()
  const existingSlugs = new Set(notes.map((n) => n.slug))
  const categories = computeWikiCategories(notes)

  const [{ files: mediaFiles, urlMap }, fontFiles] = await Promise.all([
    bundleMedia(wiki, notes),
    bundleFonts(),
  ])

  const rewrittenNotes: LichenNoteWithContent[] = notes.map((note) => ({
    ...note,
    content: rewriteMediaUrls(note.content, urlMap),
  }))

  const resolveHref = makeResolveHref(wiki, ownerHandle, existingSlugs, liveOrigin)
  const files: Record<string, Uint8Array> = {
    ...mediaFiles,
    ...fontFiles,
    'assets/site.css': new TextEncoder().encode(buildSiteCss(wiki)),
    'README.txt': new TextEncoder().encode(buildReadme(wiki)),
  }

  const navFor = (activeSlug: string) =>
    renderNav(rewrittenNotes, activeSlug, categories, wiki.sidebarOrder)

  for (const note of rewrittenNotes) {
    const html = renderMarkdown(note.content, {
      wikiSlug: wiki.slug,
      ownerHandle,
      existingSlugs,
      wikiNotes: rewrittenNotes,
      resolveHref,
    })
    const page = wrapPage({
      wiki,
      ownerHandle,
      title: note.title,
      activeSlug: note.slug,
      bodyHtml: html,
      navHtml: navFor(note.slug),
      exportedAt,
    })
    files[pageFilename(note.slug)] = new TextEncoder().encode(page)
  }

  // Ensure index.html exists even if there is no home note.
  if (!files['index.html']) {
    const listing = orderNotesForSidebar(rewrittenNotes, wiki.sidebarOrder)
      .map((n) => `<li><a href="${escapeHtml(pageHref(n.slug))}">${escapeHtml(n.title)}</a></li>`)
      .join('\n')
    files['index.html'] = new TextEncoder().encode(
      wrapPage({
        wiki,
        ownerHandle,
        title: wiki.name,
        activeSlug: 'home',
        description: wiki.description,
        bodyHtml: `<p>Pages in this wiki:</p><ul>${listing}</ul>`,
        navHtml: navFor('home'),
        exportedAt,
      }),
    )
  }

  for (const category of categories) {
    const inCat = getNotesInCategory(rewrittenNotes, category.slug)
    const list = inCat
      .map((n) => `<li><a href="${escapeHtml(pageHref(n.slug))}">${escapeHtml(n.title)}</a></li>`)
      .join('\n')
    files[`category-${category.slug}.html`] = new TextEncoder().encode(
      wrapPage({
        wiki,
        ownerHandle,
        title: category.name,
        activeSlug: `category:${category.slug}`,
        description: `${inCat.length} page${inCat.length === 1 ? '' : 's'}`,
        bodyHtml: `<ul class="category-list">${list}</ul>`,
        navHtml: navFor(`category:${category.slug}`),
        exportedAt,
      }),
    )
  }

  return { files }
}
