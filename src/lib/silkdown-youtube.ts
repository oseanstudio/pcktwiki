import {
  RangeSetBuilder,
  StateField,
  type Extension,
  type Text,
  type EditorState,
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view'
import { parseYouTubeId, youTubeThumbUrl } from '@/lib/youtube'
import { finishDecorationSet } from '@/lib/silkdown-decorate'

/** `{{youtube ID}}` or `{{youtube <url>}}`, single line. */
const YOUTUBE_RE = /\{\{youtube\s+([^\n}]+?)\}\}/gi

function findYoutubeRanges(doc: Text): Array<{ from: number; to: number; raw: string }> {
  const source = doc.toString()
  const ranges: Array<{ from: number; to: number; raw: string }> = []
  const re = new RegExp(YOUTUBE_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    ranges.push({ from: match.index, to: match.index + match[0].length, raw: match[0] })
  }
  return ranges
}

class YoutubeWidget extends WidgetType {
  id: string
  raw: string

  constructor(raw: string) {
    super()
    this.raw = raw
    const inner = raw.replace(/^\{\{youtube\s+/i, '').replace(/\}\}$/, '').trim()
    this.id = parseYouTubeId(inner) ?? ''
  }

  eq(other: YoutubeWidget) {
    return other.raw === this.raw
  }

  toDOM() {
    const figure = document.createElement('figure')
    figure.className = 'sd-yt-widget yt-embed'
    figure.setAttribute('role', 'group')
    figure.setAttribute('aria-label', 'YouTube video')

    if (!this.id) {
      // Unrecognized — show the raw shortcode muted so the author can fix it.
      figure.classList.add('sd-yt-widget--invalid')
      const code = document.createElement('span')
      code.className = 'sd-yt-raw'
      code.textContent = this.raw
      figure.appendChild(code)
      return figure
    }

    const thumb = document.createElement('img')
    thumb.className = 'sd-yt-thumb'
    thumb.src = youTubeThumbUrl(this.id)
    thumb.alt = ''
    thumb.loading = 'lazy'
    thumb.decoding = 'async'
    figure.appendChild(thumb)

    const play = document.createElement('span')
    play.className = 'sd-yt-play'
    play.setAttribute('aria-hidden', 'true')
    play.innerHTML =
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">' +
      '<path d="M8 5v14l11-7z" /></svg>'
    figure.appendChild(play)

    const label = document.createElement('span')
    label.className = 'sd-yt-label'
    label.textContent = 'YouTube'
    figure.appendChild(label)

    return figure
  }

  // Keep focus/typing inside the editor from collapsing the widget to source.
  ignoreEvent() {
    return true
  }
}

function decorateYoutube(doc: Text): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to, raw } of findYoutubeRanges(doc)) {
    builder.add(
      from,
      to,
      Decoration.replace({ widget: new YoutubeWidget(raw), block: true }),
    )
  }
  return finishDecorationSet(builder)
}

const youtubeDecorations = StateField.define<DecorationSet>({
  create(state: EditorState) {
    return decorateYoutube(state.doc)
  },
  update(deco, tr) {
    if (!tr.docChanged) return deco
    return decorateYoutube(tr.state.doc)
  },
  provide: (field) => EditorView.decorations.from(field),
})

export function youtubeExtension(): Extension {
  return youtubeDecorations
}

export const youtubeTheme = EditorView.baseTheme({
  '.sd-yt-widget': {
    display: 'block',
    position: 'relative',
    width: 'min(100%, 480px)',
    margin: '0.75rem 0',
    border: '1px solid var(--pckt-border)',
    borderRadius: 'var(--pckt-radius-sm)',
    overflow: 'hidden',
    aspectRatio: '16 / 9',
    background: '#000',
    cursor: 'default',
  },
  '.sd-yt-widget.sd-yt-widget--invalid': {
    aspectRatio: 'auto',
    background: 'color-mix(in srgb, var(--pckt-border) 18%, transparent)',
    padding: '0.35rem 0.6rem',
  },
  '.sd-yt-thumb': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  '.sd-yt-play': {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.95)',
    pointerEvents: 'none',
  },
  '.sd-yt-play svg': {
    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
  },
  '.sd-yt-label': {
    position: 'absolute',
    bottom: '0.35rem',
    left: '0.45rem',
    padding: '0.05rem 0.35rem',
    borderRadius: '2px',
    background: 'rgba(0,0,0,0.55)',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.7rem',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  '.sd-yt-raw': {
    fontFamily: 'var(--pckt-font-mono, monospace)',
    fontSize: '0.8125rem',
    color: 'var(--pckt-text-muted)',
  },
})
