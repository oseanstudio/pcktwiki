import type { EditorActionId } from '@/lib/editor/actions'

/** Toolbar ids cover the pure text actions plus shell-handled commands. */
export type ToolbarCommand = EditorActionId | 'upload' | 'subheaderLinks'

export interface ToolbarItem {
  id: ToolbarCommand
  /** Accessible name, also used as the menu label. */
  label: string
  /** Longer description shown as a tooltip and menu hint. */
  hint: string
  /** Rendered as text when set, otherwise `icon` is used. */
  glyph?: string
  icon?: string
  shortcut?: string
}

/**
 * Always-visible actions. The row scrolls horizontally on narrow screens, so
 * the order matters: most-used first.
 */
export const PRIMARY_TOOLS: ToolbarItem[][] = [
  [
    { id: 'bold', label: 'Bold', hint: 'Bold', glyph: 'B', shortcut: 'Mod+B' },
    { id: 'italic', label: 'Italic', hint: 'Italic', glyph: 'I', shortcut: 'Mod+I' },
  ],
  [
    { id: 'h1', label: 'Title', hint: 'Title heading', glyph: 'H1', shortcut: 'Mod+1' },
    { id: 'h2', label: 'Heading', hint: 'Section heading', glyph: 'H2', shortcut: 'Mod+2' },
    { id: 'h3', label: 'Subheading', hint: 'Sub-section heading', glyph: 'H3', shortcut: 'Mod+3' },
  ],
  [
    { id: 'bullet', label: 'Bullet list', hint: 'Bullet list', icon: 'bullet' },
    { id: 'numbered', label: 'Numbered list', hint: 'Numbered list', icon: 'numbered' },
    { id: 'task', label: 'Checklist', hint: 'Task checklist', icon: 'task' },
    { id: 'quote', label: 'Quote', hint: 'Block quote', icon: 'quote' },
  ],
  [
    {
      id: 'wikilink',
      label: 'Wiki link',
      hint: 'Link to a page in this wiki',
      icon: 'wikilink',
      shortcut: 'Mod+K',
    },
    {
      id: 'crosslink',
      label: 'Cross-wiki link',
      hint: "Link to a page on someone else's wiki",
      icon: 'crosslink',
    },
    { id: 'link', label: 'Link', hint: 'External link', icon: 'link', shortcut: 'Mod+Shift+K' },
    { id: 'upload', label: 'Upload image', hint: 'Upload an image to your PDS', icon: 'upload' },
    { id: 'imageSizeSm', label: 'Image small', hint: 'Small image width', glyph: 'S' },
    { id: 'imageSizeMd', label: 'Image medium', hint: 'Medium image width', glyph: 'M' },
    { id: 'imageSizeLg', label: 'Image large', hint: 'Large image width', glyph: 'L' },
    { id: 'imageSizeFull', label: 'Image full', hint: 'Full column width', glyph: '↔' },
    { id: 'imageAlignLeft', label: 'Image left', hint: 'Pin image to the left', icon: 'alignLeft' },
    {
      id: 'imageAlignCenter',
      label: 'Image center',
      hint: 'Center image',
      icon: 'alignCenter',
    },
    {
      id: 'imageAlignRight',
      label: 'Image right',
      hint: 'Pin image to the right',
      icon: 'alignRight',
    },
    {
      id: 'imageMasonry',
      label: 'Masonry',
      hint: 'Turn neighboring images into a live masonry gallery',
      glyph: '▦',
    },
    { id: 'imageGapFlush', label: 'Gap flush', hint: 'No space between gallery images', glyph: '0' },
    { id: 'imageGapSm', label: 'Gap tight', hint: 'Tight space between gallery images', glyph: '·' },
    { id: 'imageGapMd', label: 'Gap normal', hint: 'Normal space between gallery images', glyph: '··' },
    { id: 'imageGapLg', label: 'Gap wide', hint: 'Wide space between gallery images', glyph: '···' },
    { id: 'code', label: 'Inline code', hint: 'Inline code', icon: 'code' },
  ],
]

/** Less frequent actions, tucked behind the pinned Insert menu. */
export const INSERT_TOOLS: ToolbarItem[] = [
  {
    id: 'subheaderLinks',
    label: 'Subheader links',
    hint: 'Navigation links under the page title',
    icon: 'outline',
  },
  { id: 'image', label: 'Image by URL', hint: 'Link an image by address', icon: 'image' },
  { id: 'table', label: 'Table', hint: 'Insert a table', icon: 'table' },
  { id: 'codeblock', label: 'Code block', hint: 'Fenced code block', icon: 'codeblock' },
  { id: 'divider', label: 'Divider', hint: 'Horizontal rule', icon: 'divider' },
  { id: 'infobox', label: 'Infobox', hint: 'Sidebar fact box', icon: 'infobox' },
  { id: 'youtube', label: 'YouTube', hint: 'Embed a YouTube video', icon: 'youtube' },
  { id: 'category', label: 'Category', hint: 'Tag this page with a category', icon: 'category' },
  { id: 'strike', label: 'Strikethrough', hint: 'Strikethrough', glyph: 'S' },
]

/**
 * Page-layout sections. Listed under their own heading in the Insert menu
 * because they scaffold a whole band of the page, not an inline mark.
 */
export const SECTION_TOOLS: ToolbarItem[] = [
  { id: 'sectionHero', label: 'Hero', hint: 'Banner with a title and media', icon: 'hero' },
  { id: 'sectionGrid', label: 'Card grid', hint: 'Grid of image cards', icon: 'grid' },
  { id: 'sectionCard', label: 'Card', hint: 'One card, for an existing grid', icon: 'card' },
  { id: 'sectionSplit', label: 'Split band', hint: 'Image one side, text the other', icon: 'split' },
  { id: 'sectionPosts', label: 'Post list', hint: 'Dated updates with read-more links', icon: 'posts' },
  { id: 'sectionPost', label: 'Post', hint: 'One update, for an existing list', icon: 'post' },
  { id: 'sectionMeter', label: 'Goal meter', hint: 'Progress bar toward a target', icon: 'meter' },
  { id: 'sectionColumns', label: 'Columns', hint: 'Side-by-side lists, e.g. credits', icon: 'columns' },
  { id: 'sectionActions', label: 'Button row', hint: 'Row of link buttons', icon: 'actions' },
  { id: 'sectionScroller', label: 'Scroller', hint: 'Horizontal strip of cards', icon: 'scroller' },
]

export const ALL_TOOLS: ToolbarItem[] = [
  ...PRIMARY_TOOLS.flat(),
  ...INSERT_TOOLS,
  ...SECTION_TOOLS,
]

const SHORTCUTS: Record<string, EditorActionId> = {
  b: 'bold',
  i: 'italic',
  e: 'code',
  k: 'wikilink',
  '1': 'h1',
  '2': 'h2',
  '3': 'h3',
}

/** Resolve a keydown to an action id, or `null` when it is not a shortcut. */
export function shortcutAction(event: KeyboardEvent): EditorActionId | null {
  if (!event.metaKey && !event.ctrlKey) return null
  const key = event.key.toLowerCase()

  if (key === 'k') return event.shiftKey ? 'link' : 'wikilink'
  if (event.shiftKey) {
    if (key === 'x') return 'strike'
    if (key === '7') return 'numbered'
    if (key === '8') return 'bullet'
    if (key === '.') return 'quote'
    return null
  }

  return SHORTCUTS[key] ?? null
}

/** Human-readable shortcut label for the current platform. */
export function formatShortcut(shortcut: string | undefined): string {
  if (!shortcut) return ''
  const isApple =
    typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
  return shortcut.replace('Mod', isApple ? '⌘' : 'Ctrl').replace(/\+/g, isApple ? '' : '+')
}
