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
import {
  captionKeyForFields,
  INFOBOX_SOURCE_RE,
  infoboxFieldsFromRaw,
  serializeInfoboxFields,
  type InfoboxField,
} from '@/lib/infobox-preview'
import { getSessionBlobPreview, resolveBlobSrcSync } from '@/lib/atproto/blobs'
import { finishDecorationSet } from '@/lib/silkdown-decorate'

function findInfoboxRanges(doc: Text): Array<{ from: number; to: number; raw: string }> {
  const source = doc.toString()
  const ranges: Array<{ from: number; to: number; raw: string }> = []
  const re = new RegExp(INFOBOX_SOURCE_RE.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = re.exec(source)) !== null) {
    ranges.push({
      from: match.index,
      to: match.index + match[0].length,
      raw: match[0],
    })
  }

  return ranges
}

function rangeForWidget(view: EditorView, widget: HTMLElement): { from: number; to: number; raw: string } | null {
  const pos = view.posAtDOM(widget)
  const ranges = findInfoboxRanges(view.state.doc)
  return (
    ranges.find((range) => range.from <= pos && pos <= range.to) ??
    ranges.find((range) => range.from === pos || range.to === pos) ??
    null
  )
}

function readFieldsFromDom(aside: HTMLElement): InfoboxField[] {
  const captionKey = (aside.dataset.captionKey as 'name' | 'title' | undefined) ?? 'name'
  const caption =
    aside.querySelector<HTMLElement>('[data-infobox-role="caption"]')?.textContent?.trim() ?? ''
  const fields: InfoboxField[] = [{ key: captionKey, value: caption }]

  // Image field value is stored on the <img> so blob: refs round-trip verbatim
  // (the visible src may be a resolved preview URL we don't want to persist).
  const imageKey = (aside.dataset.imageKey as 'image' | 'img' | undefined) ?? null
  const imageEl = aside.querySelector<HTMLImageElement>('[data-infobox-role="image"]')
  if (imageKey && imageEl) {
    const imageValue = imageEl.dataset.infoboxValue ?? ''
    if (imageValue) fields.push({ key: imageKey, value: imageValue })
  }

  // Caption slot (distinct from the title) sits under the image.
  const imgCaption =
    aside.querySelector<HTMLElement>('[data-infobox-role="img-caption"]')?.textContent?.trim() ?? ''
  if (imgCaption) fields.push({ key: 'caption', value: imgCaption })

  aside.querySelectorAll<HTMLTableRowElement>('tbody tr[data-infobox-row]').forEach((row) => {
    const key =
      row.querySelector<HTMLElement>('[data-infobox-role="key"]')?.textContent?.trim() ?? ''
    const value =
      row.querySelector<HTMLElement>('[data-infobox-role="value"]')?.textContent?.trim() ?? ''
    if (!key && !value) return
    fields.push({ key: key || 'field', value })
  })

  return fields
}

function commitInfoboxDom(aside: HTMLElement) {
  const view = EditorView.findFromDOM(aside)
  if (!view || view.state.facet(EditorView.editable) === false) return

  const range = rangeForWidget(view, aside)
  if (!range) return

  const next = serializeInfoboxFields(readFieldsFromDom(aside))
  if (next === range.raw) return

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: next },
  })
}

function makeEditable(
  el: HTMLElement,
  role: string,
  text: string,
  placeholder: string,
  canEdit: boolean,
) {
  el.dataset.infoboxRole = role
  el.contentEditable = canEdit ? 'true' : 'false'
  el.spellcheck = false
  el.textContent = text
  if (!text) el.dataset.placeholder = placeholder
  else delete el.dataset.placeholder
  if (canEdit) {
    el.setAttribute('role', 'textbox')
    el.setAttribute('aria-label', placeholder)
  }
}

function appendRow(tbody: HTMLElement, key: string, value: string, canEdit: boolean) {
  const tr = document.createElement('tr')
  tr.dataset.infoboxRow = '1'
  const th = document.createElement('th')
  makeEditable(th, 'key', key, 'Label', canEdit)
  const td = document.createElement('td')
  makeEditable(td, 'value', value, 'Value', canEdit)
  tr.append(th, td)
  tbody.appendChild(tr)
  return tr
}

function resolveInfoboxImage(src: string, ownerDid?: string): string {
  return getSessionBlobPreview(src) ?? (ownerDid ? resolveBlobSrcSync(src, ownerDid) ?? src : src)
}

function fillInfoboxDom(
  aside: HTMLElement,
  fields: InfoboxField[],
  canEdit: boolean,
  ownerDid?: string,
) {
  aside.replaceChildren()
  aside.dataset.captionKey = captionKeyForFields(fields)
  aside.dataset.editable = canEdit ? '1' : '0'

  const captionField =
    fields.find((field) => field.key === 'title' || field.key === 'name') ?? null
  const imageField =
    fields.find((field) => field.key === 'image' || field.key === 'img') ?? null
  const captionTextField = fields.find((field) => field.key === 'caption')
  const bodyFields = fields.filter(
    (field) =>
      field.key !== 'title' &&
      field.key !== 'name' &&
      field.key !== 'image' &&
      field.key !== 'img' &&
      field.key !== 'caption',
  )

  if (imageField) {
    aside.dataset.imageKey = imageField.key
    const img = document.createElement('img')
    img.className = 'infobox-image'
    img.dataset.infoboxRole = 'image'
    img.dataset.infoboxValue = imageField.value
    img.src = resolveInfoboxImage(imageField.value, ownerDid)
    img.alt = ''
    img.loading = 'lazy'
    img.decoding = 'async'
    aside.appendChild(img)
  } else {
    delete aside.dataset.imageKey
  }

  if (captionTextField) {
    const caption = document.createElement('div')
    caption.className = 'infobox-caption'
    makeEditable(caption, 'img-caption', captionTextField.value, 'Caption', canEdit)
    aside.appendChild(caption)
  }

  const title = document.createElement('div')
  title.className = 'infobox-title'
  makeEditable(title, 'caption', captionField?.value ?? '', 'Title', canEdit)
  aside.appendChild(title)

  const table = document.createElement('table')
  table.className = 'infobox-table'
  const tbody = document.createElement('tbody')
  for (const field of bodyFields) {
    appendRow(tbody, field.key, field.value, canEdit)
  }
  table.appendChild(tbody)
  aside.appendChild(table)

  if (canEdit) {
    const actions = document.createElement('div')
    actions.className = 'sd-infobox-actions'
    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.className = 'sd-infobox-add'
    addBtn.dataset.infoboxAction = 'add'
    addBtn.textContent = 'Add field'
    actions.appendChild(addBtn)
    aside.appendChild(actions)
  }
}

function wireInfoboxDom(aside: HTMLElement) {
  if (aside.dataset.wired === '1') return
  aside.dataset.wired = '1'

  aside.addEventListener('focusin', () => {
    if (aside.dataset.editable !== '1') return
    aside.classList.add('sd-infobox-editing')
  })

  aside.addEventListener('focusout', (event) => {
    const next = event.relatedTarget as Node | null
    if (next && aside.contains(next)) return
    aside.classList.remove('sd-infobox-editing')
    commitInfoboxDom(aside)
    // Drop rows that never got a label (they aren't serialized).
    aside.querySelectorAll<HTMLTableRowElement>('tbody tr[data-infobox-row]').forEach((row) => {
      const key =
        row.querySelector<HTMLElement>('[data-infobox-role="key"]')?.textContent?.trim() ?? ''
      const value =
        row.querySelector<HTMLElement>('[data-infobox-role="value"]')?.textContent?.trim() ?? ''
      if (!key && !value) row.remove()
    })
  })

  aside.addEventListener('input', (event) => {
    const target = event.target as HTMLElement | null
    if (!target?.isContentEditable) return
    if (target.textContent?.trim()) delete target.dataset.placeholder
    else if (target.dataset.infoboxRole) {
      const placeholders: Record<string, string> = {
        caption: 'Title',
        key: 'Label',
        value: 'Value',
      }
      target.dataset.placeholder = placeholders[target.dataset.infoboxRole] ?? ''
    }
  })

  aside.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null
    if (!target?.isContentEditable) return

    if (event.key === 'Enter') {
      event.preventDefault()
      commitInfoboxDom(aside)
      const row = target.closest('tr')
      const role = target.dataset.infoboxRole
      if (role === 'key') {
        row?.querySelector<HTMLElement>('[data-infobox-role="value"]')?.focus()
      } else if (role === 'value') {
        const nextRow = row?.nextElementSibling as HTMLElement | null
        const nextKey = nextRow?.querySelector<HTMLElement>('[data-infobox-role="key"]')
        if (nextKey) nextKey.focus()
        else aside.querySelector<HTMLButtonElement>('[data-infobox-action="add"]')?.focus()
      } else {
        target.blur()
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      target.blur()
    }
  })

  aside.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-infobox-action="add"]',
    )
    if (!button || !aside.contains(button)) return
    event.preventDefault()
    const tbody = aside.querySelector('tbody')
    if (!tbody) return
    const row = appendRow(tbody, '', '', true)
    row.querySelector<HTMLElement>('[data-infobox-role="key"]')?.focus()
  })
}

class InfoboxWidget extends WidgetType {
  raw: string
  fields: InfoboxField[]
  ownerDid?: string

  constructor(raw: string, ownerDid?: string) {
    super()
    this.raw = raw
    this.fields = infoboxFieldsFromRaw(raw)
    this.ownerDid = ownerDid
  }

  eq(other: InfoboxWidget) {
    return other.raw === this.raw
  }

  toDOM(view: EditorView) {
    const aside = document.createElement('aside')
    aside.className = 'sd-infobox-widget infobox'
    aside.contentEditable = 'false'
    const canEdit = view.state.facet(EditorView.editable) !== false
    fillInfoboxDom(aside, this.fields, canEdit, this.ownerDid)
    wireInfoboxDom(aside)
    return aside
  }

  updateDOM(dom: HTMLElement, view: EditorView) {
    // Keep the live DOM while the user is typing so focus isn't stolen.
    if (dom.contains(document.activeElement)) return true
    const canEdit = view.state.facet(EditorView.editable) !== false
    fillInfoboxDom(dom, this.fields, canEdit, this.ownerDid)
    wireInfoboxDom(dom)
    return true
  }

  ignoreEvent() {
    // Handle all interaction inside the widget so the editor doesn't
    // collapse it back into raw source.
    return true
  }
}

function decorateInfoboxes(doc: Text, ownerDid?: string): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  for (const { from, to, raw } of findInfoboxRanges(doc)) {
    // Always keep the rendered box — never swap to raw source on focus.
    builder.add(
      from,
      to,
      Decoration.replace({
        widget: new InfoboxWidget(raw, ownerDid),
        block: true,
      }),
    )
  }

  return finishDecorationSet(builder)
}

export function infoboxExtension(ownerDid?: string): Extension {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      return decorateInfoboxes(state.doc, ownerDid)
    },
    update(deco, tr) {
      if (!tr.docChanged) return deco
      return decorateInfoboxes(tr.state.doc, ownerDid)
    },
    provide: (field) => EditorView.decorations.from(field),
  })
}

export const infoboxTheme = EditorView.baseTheme({
  '.sd-infobox-widget': {
    display: 'block',
    float: 'right',
    clear: 'right',
    width: 'min(280px, 100%)',
    margin: '0 0 1rem 1.5rem',
    border: '1px solid var(--pckt-border)',
    borderRadius: 'var(--pckt-radius-sm)',
    background: 'color-mix(in srgb, var(--pckt-blue) 6%, var(--pckt-bg-elevated))',
    overflow: 'hidden',
    cursor: 'text',
  },
  '.sd-infobox-widget.sd-infobox-editing': {
    outline: '2px solid color-mix(in srgb, var(--pckt-blue) 55%, transparent)',
    outlineOffset: '1px',
  },
  '.sd-infobox-widget .infobox-title': {
    padding: '0.5rem 0.75rem',
    fontWeight: '700',
    fontSize: '0.9375rem',
    background: 'color-mix(in srgb, var(--pckt-blue) 14%, var(--pckt-bg-elevated))',
    borderBottom: '1px solid var(--pckt-border)',
    outline: 'none',
    minHeight: '1.4em',
  },
  '.sd-infobox-widget .infobox-image': {
    display: 'block',
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  '.sd-infobox-widget .infobox-caption': {
    padding: '0.3rem 0.75rem 0.4rem',
    fontSize: '0.8125rem',
    color: 'var(--pckt-text-muted)',
    textAlign: 'center',
    background: 'var(--pckt-bg-elevated)',
    borderBottom: '1px solid var(--pckt-border)',
    outline: 'none',
    minHeight: '1.2em',
  },
  '.sd-infobox-widget .infobox-table': {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  '.sd-infobox-widget .infobox-table th': {
    textAlign: 'left',
    padding: '0.35rem 0.75rem',
    color: 'var(--pckt-text-muted)',
    fontWeight: '600',
    verticalAlign: 'top',
    width: '38%',
    outline: 'none',
    minHeight: '1.25em',
  },
  '.sd-infobox-widget .infobox-table td': {
    padding: '0.35rem 0.75rem',
    verticalAlign: 'top',
    outline: 'none',
    minHeight: '1.25em',
  },
  '.sd-infobox-widget [contenteditable="true"]:focus': {
    background: 'color-mix(in srgb, var(--pckt-blue) 10%, transparent)',
    borderRadius: '2px',
  },
  '.sd-infobox-widget [data-placeholder]::before': {
    content: 'attr(data-placeholder)',
    color: 'var(--pckt-text-subtle)',
    fontWeight: '400',
    pointerEvents: 'none',
  },
  '.sd-infobox-actions': {
    display: 'none',
    padding: '0.35rem 0.75rem 0.5rem',
    borderTop: '1px solid var(--pckt-border)',
  },
  '.sd-infobox-widget.sd-infobox-editing .sd-infobox-actions': {
    display: 'block',
  },
  '.sd-infobox-add': {
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    color: 'var(--pckt-blue-active)',
    font: 'inherit',
    fontSize: '0.8125rem',
    fontWeight: '600',
    padding: '0',
    cursor: 'pointer',
  },
  '.sd-infobox-add:hover': {
    textDecoration: 'underline',
  },
})
