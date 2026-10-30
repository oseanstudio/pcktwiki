export type EditorInsertAction =
  | 'heading'
  | 'subheading'
  | 'bullet'
  | 'numbered'
  | 'quote'
  | 'wikilink'
  | 'fork'
  | 'category'
  | 'source'
  | 'image'
  | 'infobox'
  | 'bold'
  | 'italic'

export interface EditorInsertResult {
  text: string
  selectionStart: number
  selectionEnd: number
}

export interface EditorToolbarAction {
  id: EditorInsertAction
  label: string
  title: string
  group: 'structure' | 'wiki' | 'format'
}

export const EDITOR_TOOLBAR_ACTIONS: EditorToolbarAction[] = [
  {
    id: 'heading',
    label: 'Heading',
    title: 'Section heading (##)',
    group: 'structure',
  },
  {
    id: 'bullet',
    label: 'Bullets',
    title: 'Bullet list (-)',
    group: 'structure',
  },
  {
    id: 'numbered',
    label: 'Numbered',
    title: 'Numbered list (1.)',
    group: 'structure',
  },
  {
    id: 'quote',
    label: 'Quote',
    title: 'Block quote (>)',
    group: 'structure',
  },
  {
    id: 'wikilink',
    label: 'Wikilink',
    title: 'Link to an article in this wiki ([[note]])',
    group: 'wiki',
  },
  {
    id: 'fork',
    label: 'Fork',
    title: "Link to someone else's wiki ([[@handle/wiki/note]])",
    group: 'wiki',
  },
  {
    id: 'category',
    label: 'Category',
    title: 'Tag with [[Category:Name]]',
    group: 'wiki',
  },
  {
    id: 'infobox',
    label: 'Infobox',
    title: 'Sidebar infobox ({{infobox key=value}})',
    group: 'wiki',
  },
  {
    id: 'bold',
    label: 'Bold',
    title: 'Bold text (**)',
    group: 'format',
  },
  {
    id: 'italic',
    label: 'Italic',
    title: 'Italic text (*)',
    group: 'format',
  },
  {
    id: 'source',
    label: 'Source',
    title: 'External link or citation ([text](url))',
    group: 'format',
  },
]

function expandToLines(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  let lineEnd = end

  if (end > start) {
    const nextNl = text.indexOf('\n', end)
    lineEnd = nextNl === -1 ? text.length : nextNl
  } else {
    const nextNl = text.indexOf('\n', start)
    lineEnd = nextNl === -1 ? text.length : nextNl
  }

  return { lineStart, lineEnd }
}

function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): EditorInsertResult {
  const selected = text.slice(start, end) || placeholder
  const next = text.slice(0, start) + before + selected + after + text.slice(end)
  const selectionStart = start + before.length
  const selectionEnd = selectionStart + selected.length
  return { text: next, selectionStart, selectionEnd }
}

function insertAt(
  text: string,
  start: number,
  end: number,
  insertion: string,
  selectOffset: number,
  selectLength: number,
): EditorInsertResult {
  const next = text.slice(0, start) + insertion + text.slice(end)
  const selectionStart = start + selectOffset
  const selectionEnd = selectionStart + selectLength
  return { text: next, selectionStart, selectionEnd }
}

function applyLinePrefix(
  text: string,
  start: number,
  end: number,
  prefix: string | ((lineIndex: number) => string),
): EditorInsertResult {
  const { lineStart, lineEnd } = expandToLines(text, start, end)
  const block = text.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const prefixed = lines
    .map((line, index) => {
      const value = typeof prefix === 'function' ? prefix(index) : prefix
      return `${value}${line}`
    })
    .join('\n')

  const next = text.slice(0, lineStart) + prefixed + text.slice(lineEnd)
  return {
    text: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  }
}

export function applyEditorInsert(
  text: string,
  start: number,
  end: number,
  action: EditorInsertAction,
): EditorInsertResult {
  const selected = text.slice(start, end)

  switch (action) {
    case 'heading':
      if (selected) {
        return wrapSelection(text, start, end, '## ', '', selected)
      }
      return insertAt(text, start, end, '## Heading\n\n', 3, 7)

    case 'subheading':
      if (selected) {
        return wrapSelection(text, start, end, '### ', '', selected)
      }
      return insertAt(text, start, end, '### Sub-heading\n\n', 4, 11)

    case 'bullet':
      return applyLinePrefix(text, start, end, '- ')

    case 'numbered':
      return applyLinePrefix(text, start, end, (index) => `${index + 1}. `)

    case 'quote':
      return applyLinePrefix(text, start, end, '> ')

    case 'wikilink':
      return wrapSelection(text, start, end, '[[', ']]', 'article-slug')

    case 'fork':
      return wrapSelection(text, start, end, '[[', ']]', '@handle/wiki/note')

    case 'category':
      return wrapSelection(text, start, end, '[[Category:', ']]', 'Topic')

    case 'source':
      return wrapSelection(text, start, end, '[', '](https://example.com)', 'Source')

    case 'image':
      if (selected) {
        return wrapSelection(text, start, end, '![', '](https://example.com/image.jpg)', 'alt text')
      }
      return insertAt(text, start, end, '![alt text](https://example.com/image.jpg)\n\n', 2, 8)

    case 'infobox':
      return insertAt(text, start, end, '\n{{infobox name=Title|type=Topic}}\n', 16, 5)

    case 'bold':
      return wrapSelection(text, start, end, '**', '**', 'bold text')

    case 'italic':
      return wrapSelection(text, start, end, '*', '*', 'italic text')

    default:
      return { text, selectionStart: start, selectionEnd: end }
  }
}

export function applyEditorInsertToTextarea(
  textarea: HTMLTextAreaElement,
  action: EditorInsertAction,
): EditorInsertResult {
  const result = applyEditorInsert(
    textarea.value,
    textarea.selectionStart,
    textarea.selectionEnd,
    action,
  )

  textarea.value = result.text
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
  textarea.focus()
  textarea.dispatchEvent(new Event('input', { bubbles: true }))

  return result
}
