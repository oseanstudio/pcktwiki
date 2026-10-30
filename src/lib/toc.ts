import { slugifyHeading } from '@/lib/lichen/wikilinks'

export interface TocEntry {
  id: string
  text: string
  level: number
}

export function extractTocFromMarkdown(source: string): TocEntry[] {
  const body = source.replace(/^---[\s\S]*?---\s*/, '')
  const entries: TocEntry[] = []
  const seen = new Set<string>()

  for (const line of body.split('\n')) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*$/)
    if (!match) continue

    const level = match[1].length
    const text = match[2].replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/#+\s*$/, '').trim()
    const baseId = slugifyHeading(text)
    let id = baseId
    let counter = 2
    while (seen.has(id)) {
      id = `${baseId}-${counter}`
      counter += 1
    }
    seen.add(id)

    entries.push({ id, text, level })
  }

  return entries
}
