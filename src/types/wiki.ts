export interface WikiTheme {
  accentColor?: string
  fontFamily?: string
  mode?: 'light' | 'dark' | 'auto'
  layoutWidth?: 'narrow' | 'medium' | 'wide'
}

export interface WikiSpace {
  title: string
  description?: string
  homeSlug?: string
  navOrder?: string[]
  theme?: WikiTheme
  createdAt: string
  updatedAt?: string
}

export interface WikiEmbed {
  type: 'blog-post' | 'blog-list' | 'link-card'
  atUri?: string
  url?: string
  title?: string
}

export interface WikiPage {
  title: string
  slug: string
  body: string
  order?: number
  parent?: string
  pageType?: 'page' | 'blog-list' | 'blog-post'
  embeds?: WikiEmbed[]
  createdAt: string
  updatedAt?: string
}

export interface WikiPageRecord extends WikiPage {
  uri: string
  cid: string
}

export interface StandardSiteDocument {
  uri: string
  cid: string
  title?: string
  path?: string
  description?: string
  content?: string
  publishedAt?: string
  updatedAt?: string
}

export interface StandardSitePublication {
  uri: string
  name?: string
  description?: string
  url?: string
}

export interface ActorProfile {
  displayName?: string
  description?: string
  avatar?: string
  handle?: string
}

export const WIKI_SPACE_COLLECTION = 'wiki.pckt.space'
export const WIKI_PAGE_COLLECTION = 'wiki.pckt.page'
export const WIKI_SPACE_RKEY = 'self'
export const STANDARD_PUBLICATION = 'site.standard.publication'
export const STANDARD_DOCUMENT = 'site.standard.document'

export const DEFAULT_THEME: WikiTheme = {
  accentColor: '#2d5016',
  fontFamily: 'Literata',
  mode: 'light',
  layoutWidth: 'medium',
}

export const FONT_OPTIONS = [
  'Literata',
  'Newsreader',
  'Space Mono',
  'Georgia',
  'system-ui',
] as const

export const ACCENT_PRESETS = [
  '#2d5016',
  '#1a365d',
  '#7c2d12',
  '#581c87',
  '#0f766e',
  '#b45309',
] as const
