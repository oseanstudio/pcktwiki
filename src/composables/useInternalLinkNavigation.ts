import { useRouter } from 'vue-router'
import { navigateFromAnchor, setupInternalLinkNavigation } from '@/lib/internal-link-navigation'

/**
 * Per-container click handler for v-html markdown (global handler also runs at startup).
 */
export function useInternalLinkNavigation() {
  const router = useRouter()

  function onMarkdownClick(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const anchor = (event.target as Element).closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return

    if (navigateFromAnchor(router, anchor)) {
      event.preventDefault()
    }
  }

  return { onMarkdownClick }
}

export { setupInternalLinkNavigation }
