import { onUnmounted, watch, type Ref } from 'vue'

interface ShareMetaOptions {
  title: Ref<string>
  description: Ref<string>
  url?: Ref<string>
}

const DEFAULT_TITLE = 'pckt.wiki'
const DEFAULT_DESCRIPTION = 'Build your personal wiki on the open social web.'

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name'): void {
  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useShareMeta(options: ShareMetaOptions): void {
  const apply = () => {
    const title = options.title.value || DEFAULT_TITLE
    const description = options.description.value || DEFAULT_DESCRIPTION
    const url = options.url?.value ?? (typeof window !== 'undefined' ? window.location.href : '')

    document.title = title
    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    if (url) {
      setMeta('og:url', url, 'property')
    }
  }

  watch([options.title, options.description, options.url ?? { value: '' }], apply, { immediate: true })

  onUnmounted(() => {
    document.title = DEFAULT_TITLE
    setMeta('description', DEFAULT_DESCRIPTION)
    setMeta('og:title', DEFAULT_TITLE, 'property')
    setMeta('og:description', DEFAULT_DESCRIPTION, 'property')
  })
}

export function blueskyShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text: `${text}\n${url}` })
  return `https://bsky.app/intent/compose?${params.toString()}`
}
