import type { Router } from 'vue-router'
import { stripBase } from '@/lib/base-url'

function shouldHandleLinkClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  return true
}

function isInternalAppPath(href: string): boolean {
  if (
    href.startsWith('http:') ||
    href.startsWith('https:') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return false
  }
  if (href.startsWith('#')) return false
  return true
}

/** Plain `<a href>` tags inside rendered markdown (v-html). RouterLink is handled by vue-router. */
function isMarkdownAnchor(anchor: HTMLAnchorElement): boolean {
  return Boolean(anchor.closest('.markdown-body, .prose'))
}

export function navigateFromAnchor(router: Router, anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute('href')
  if (!href || !isInternalAppPath(href)) return false

  const url = new URL(href, window.location.origin)
  if (url.origin !== window.location.origin) return false

  const target = anchor.getAttribute('target')
  if (target && /\b_blank\b/i.test(target)) return false

  const resolved = router.resolve({
    // The href carries the deployment base; router paths do not.
    path: stripBase(url.pathname),
    hash: url.hash || undefined,
    query: Object.fromEntries(url.searchParams),
  })
  if (resolved.matched.length === 0) return false

  void router.push(resolved)
  return true
}

/**
 * Route markdown anchor clicks through Vue Router instead of full page loads.
 * RouterLink and other app navigation are left to vue-router.
 */
export function setupInternalLinkNavigation(router: Router): void {
  document.addEventListener(
    'click',
    (event: MouseEvent) => {
      if (!shouldHandleLinkClick(event)) return

      const anchor = (event.target as Element).closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isMarkdownAnchor(anchor)) return

      if (navigateFromAnchor(router, anchor)) {
        event.preventDefault()
      }
    },
    true,
  )
}
