import type { EditorInsertAction } from '@/lib/editor-insert'

export interface EditorToolbarMenuItem {
  id: EditorInsertAction | 'paragraph'
  label: string
  title?: string
}

export interface EditorToolbarGroup {
  id: string
  label: string
  type: 'buttons' | 'menu'
  items: EditorToolbarMenuItem[]
}

export const VISUAL_EDITOR_TOOLBAR_GROUPS: EditorToolbarGroup[] = [
  {
    id: 'history',
    label: 'History',
    type: 'buttons',
    items: [],
  },
  {
    id: 'paragraph',
    label: 'Paragraph',
    type: 'menu',
    items: [
      { id: 'paragraph', label: 'Paragraph', title: 'Normal paragraph text' },
      { id: 'heading', label: 'Heading', title: 'Section heading (##)' },
      { id: 'subheading', label: 'Sub-heading', title: 'Sub-section heading (###)' },
      { id: 'quote', label: 'Block quote', title: 'Indented quotation (>)' },
    ],
  },
  {
    id: 'style',
    label: 'Style text',
    type: 'menu',
    items: [
      { id: 'bold', label: 'Bold', title: 'Bold text (**)' },
      { id: 'italic', label: 'Italic', title: 'Italic text (*)' },
    ],
  },
  {
    id: 'cite',
    label: 'Cite',
    type: 'menu',
    items: [
      { id: 'source', label: 'External link', title: 'Link to an external source' },
      { id: 'wikilink', label: 'Wikilink', title: 'Link to an article in this wiki' },
    ],
  },
  {
    id: 'structure',
    label: 'Structure',
    type: 'menu',
    items: [
      { id: 'bullet', label: 'Bullet list', title: 'Unordered list (-)' },
      { id: 'numbered', label: 'Numbered list', title: 'Ordered list (1.)' },
    ],
  },
  {
    id: 'insert',
    label: 'Insert',
    type: 'menu',
    items: [
      { id: 'wikilink', label: 'Wikilink', title: 'Link to an article ([[note]])' },
      { id: 'fork', label: 'Fork link', title: 'Cross-wiki link ([[@handle/wiki/note]])' },
      { id: 'category', label: 'Category', title: 'Add [[Category:Name]]' },
      { id: 'infobox', label: 'Infobox', title: 'Sidebar infobox template' },
    ],
  },
]

export const PAGE_OPTIONS_ITEMS: EditorToolbarMenuItem[] = [
  { id: 'category', label: 'Categories', title: 'Add or edit categories' },
]
