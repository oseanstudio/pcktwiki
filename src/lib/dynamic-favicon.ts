import { sparkLogomarkSvg } from '@/lib/pckt-spark-logomark'

let faviconBlobUrl: string | null = null

export function setFaviconSparkColor(sparkColor: string): void {
  const nextUrl = URL.createObjectURL(
    new Blob([sparkLogomarkSvg(sparkColor)], { type: 'image/svg+xml' }),
  )

  if (faviconBlobUrl) URL.revokeObjectURL(faviconBlobUrl)
  faviconBlobUrl = nextUrl

  const link =
    document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]') ??
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (link) {
    link.type = 'image/svg+xml'
    link.removeAttribute('sizes')
    link.href = nextUrl
    return
  }

  const created = document.createElement('link')
  created.rel = 'icon'
  created.type = 'image/svg+xml'
  created.href = nextUrl
  document.head.appendChild(created)
}
