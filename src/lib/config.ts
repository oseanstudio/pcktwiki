const PRODUCTION_CLIENT_ID = 'https://pckt.wiki/client-metadata.json'
const PRODUCTION_REDIRECT_URI = 'https://pckt.wiki/'

export function getOAuthConfig() {
  const isDev = import.meta.env.DEV
  if (isDev) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5173'
    return {
      clientId: origin,
      redirectUri: `${origin}/`,
      handleResolver: 'https://bsky.app',
    }
  }

  return {
    clientId: PRODUCTION_CLIENT_ID,
    redirectUri: PRODUCTION_REDIRECT_URI,
    handleResolver: 'https://bsky.app',
  }
}

export function normalizeHandle(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('@')) return trimmed.slice(1)
  return trimmed
}

export function handleToWikiPath(handle: string): string {
  const normalized = normalizeHandle(handle)
  return `/@${encodeURIComponent(normalized)}`
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

export function atUriToPath(atUri: string): { did: string; collection: string; rkey: string } | null {
  const match = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/)
  if (!match) return null
  return { did: match[1], collection: match[2], rkey: match[3] }
}

export function parsePcktBlogUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('pckt.blog')) return null
    return parsed.toString()
  } catch {
    return null
  }
}
