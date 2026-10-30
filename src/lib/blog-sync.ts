import type { LichenNoteWithContent, StandardSiteDocument } from '@/types/lichen'
import { uniqueSlug } from '@/lib/atproto/lichen'
import { parseNoteContent } from '@/lib/lichen/content-meta'

export function blogPathToSlug(path?: string): string | null {
  if (!path) return null
  const normalized = path.replace(/^\/+/, '').replace(/\/+$/, '')
  if (!normalized) return null
  return normalized
    .toLowerCase()
    .replace(/[^\w\s-/]/g, '')
    .replace(/[/\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

export interface BlogStubSuggestion {
  post: StandardSiteDocument
  suggestedSlug: string
  existingNote?: LichenNoteWithContent
  linkedByBlogPath: boolean
}

export function findBlogStubSuggestions(
  posts: StandardSiteDocument[],
  notes: LichenNoteWithContent[],
): BlogStubSuggestion[] {
  const suggestions: BlogStubSuggestion[] = []
  const existingSlugs = new Set(notes.map((note) => note.slug))

  for (const post of posts) {
    const suggestedSlug = blogPathToSlug(post.path) ?? uniqueSlug(post.title ?? 'post', [...existingSlugs])
    const existingBySlug = notes.find((note) => note.slug === suggestedSlug)
    const existingByPath = notes.find((note) => {
      const parsed = parseNoteContent(note.content)
      return parsed.blogPath && parsed.blogPath === post.path
    })
    const existingNote = existingBySlug ?? existingByPath

    if (!existingNote) {
      suggestions.push({
        post,
        suggestedSlug,
        linkedByBlogPath: false,
      })
    }
  }

  return suggestions
}

export function findWikiNoteForBlogPost(
  post: StandardSiteDocument,
  notes: LichenNoteWithContent[],
): LichenNoteWithContent | undefined {
  const slug = blogPathToSlug(post.path)
  if (slug) {
    const bySlug = notes.find((note) => note.slug === slug)
    if (bySlug) return bySlug
  }

  return notes.find((note) => {
    const parsed = parseNoteContent(note.content)
    return parsed.blogPath && post.path && parsed.blogPath === post.path
  })
}

export function defaultBlogStubContent(
  post: StandardSiteDocument,
  blogUrl?: string | null,
): string {
  const title = post.title ?? 'Blog post'
  const path = post.path ?? ''
  const description = post.description ?? ''
  const blogLine = blogUrl ? `\nRead on pckt.blog: ${blogUrl}` : ''

  return `---
blog-path: ${path}
categories:
  - Blog
---

# ${title}

${description ? `${description}\n\n` : ''}This article is linked to a pckt.blog post.${blogLine}

## Summary

Add your wiki articles about this post here. Link related articles with [[wikilinks]].`
}
