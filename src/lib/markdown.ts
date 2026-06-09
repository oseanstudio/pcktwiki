import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

export function renderMarkdown(source: string): string {
  const html = md.render(source)
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
  })
}

export function renderInlineMarkdown(source: string): string {
  const html = md.renderInline(source)
  return DOMPurify.sanitize(html)
}
