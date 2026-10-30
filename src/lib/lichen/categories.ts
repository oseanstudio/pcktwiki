import type { LichenNoteWithContent } from '@/types/lichen'
import { categorySlug, parseNoteContent } from '@/lib/lichen/content-meta'

export interface WikiCategory {
  name: string
  slug: string
  count: number
}

export function computeWikiCategories(notes: LichenNoteWithContent[]): WikiCategory[] {
  const counts = new Map<string, number>()

  for (const note of notes) {
    const { categories, status } = parseNoteContent(note.content)
    if (status === 'draft') continue
    for (const name of categories) {
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: categorySlug(name), count }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getNotesInCategory(
  notes: LichenNoteWithContent[],
  categorySlugValue: string,
): LichenNoteWithContent[] {
  return notes.filter((note) => {
    const parsed = parseNoteContent(note.content)
    if (parsed.status === 'draft') return false
    return parsed.categories.some((name) => categorySlug(name) === categorySlugValue)
  })
}

export function findCategoryBySlug(
  categories: WikiCategory[],
  slug: string,
): WikiCategory | undefined {
  return categories.find((cat) => cat.slug === slug)
}
