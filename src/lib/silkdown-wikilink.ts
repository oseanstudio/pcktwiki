import { RangeSetBuilder, type Extension, type Text } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type PluginValue,
  type ViewUpdate,
} from '@codemirror/view'
import type { EditorSelection } from '@codemirror/state'
import { CATEGORY_PREFIX } from '@/lib/lichen/content-meta'
import {
  HIDE,
  MUTED_MARK,
  finishDecorationSet,
  selectionTouchesRange,
} from '@/lib/silkdown-decorate'

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

const WIKILINK_MARK = Decoration.mark({ class: 'sd-wikilink' })
const CATEGORY_MARK = Decoration.mark({ class: 'sd-category' })
const FORK_MARK = Decoration.mark({ class: 'sd-fork' })

function decorateWikilinks(doc: Text, sel: EditorSelection): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber)
    const text = line.text
    WIKILINK_RE.lastIndex = 0

    let match = WIKILINK_RE.exec(text)
    while (match) {
      const fullStart = line.from + match.index
      const fullEnd = fullStart + match[0].length
      const innerStart = fullStart + 2
      const innerEnd = fullEnd - 2
      const inner = match[1]
      const revealed = selectionTouchesRange(doc, sel, fullStart, fullEnd)

      const mark = inner.startsWith(CATEGORY_PREFIX)
        ? CATEGORY_MARK
        : inner.startsWith('@')
          ? FORK_MARK
          : WIKILINK_MARK

      // RangeSetBuilder requires ascending `from` (then startSide).
      if (revealed) {
        builder.add(fullStart, innerStart, MUTED_MARK)
        builder.add(innerStart, innerEnd, mark)
        builder.add(innerEnd, fullEnd, MUTED_MARK)
      } else {
        builder.add(fullStart, innerStart, HIDE)
        builder.add(innerStart, innerEnd, mark)
        builder.add(innerEnd, fullEnd, HIDE)
      }

      match = WIKILINK_RE.exec(text)
    }
  }

  return finishDecorationSet(builder)
}

export function wikiLinkExtension(): Extension {
  return ViewPlugin.fromClass(
    class implements PluginValue {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = decorateWikilinks(view.state.doc, view.state.selection)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.decorations = decorateWikilinks(update.state.doc, update.state.selection)
        }
      }
    },
    { decorations: (value) => value.decorations },
  )
}

export const wikiSyntaxTheme = EditorView.baseTheme({
  '.sd-wikilink': {
    color: 'var(--pckt-red)',
    fontWeight: '600',
    textDecoration: 'none',
  },
  '.sd-category': {
    color: 'var(--pckt-blue-active)',
    fontWeight: '600',
    textDecoration: 'none',
  },
  '.sd-fork': {
    color: 'var(--pckt-red)',
    fontWeight: '600',
    textDecoration: 'none',
    fontStyle: 'italic',
  },
})
