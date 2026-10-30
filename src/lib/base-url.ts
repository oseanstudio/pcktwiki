/**
 * The app is not guaranteed to own the root of its origin. On a GitHub Pages
 * project page it is served from `/<repo>/`, so anything that hardcodes a
 * leading `/` — a public asset, a same-origin fetch, an `href` written straight
 * into markup — points outside the deployment and 404s.
 *
 * Vue Router already knows the base, so `RouterLink` and `router.push()` need
 * nothing. These helpers cover everything that bypasses it.
 */
const BASE = import.meta.env.BASE_URL

function withoutLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '')
}

/** A file in `public/`: `assetUrl('favicon.svg')` → `/repo/favicon.svg`. */
export function assetUrl(path: string): string {
  return `${BASE}${withoutLeadingSlash(path)}`
}

/** An in-app route written as a raw `href` rather than a `RouterLink`. */
export function routeHref(path: string): string {
  return `${BASE}${withoutLeadingSlash(path)}`
}

/** Absolute URL for sharing — permalinks, copy-link buttons, Bluesky intents. */
export function appUrl(path: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : null
  if (!origin) return `${__SITE_URL__}${withoutLeadingSlash(path)}`
  return `${origin}${routeHref(path)}`
}

/**
 * Inverse of `routeHref`, for reading a same-origin URL back as an app route
 * (link interception, previewing a link's target).
 */
export function stripBase(pathname: string): string {
  if (BASE !== '/' && pathname.startsWith(BASE)) {
    return `/${pathname.slice(BASE.length)}`
  }
  return pathname
}
