export interface InfoboxField {
  key: string
  value: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function parseInfoboxFields(raw: string): InfoboxField[] {
  const fields: InfoboxField[] = []

  for (const part of raw.split(/[|\n]/)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!key) continue
    fields.push({ key, value })
  }

  return fields
}

export function infoboxFieldsFromRaw(raw: string): InfoboxField[] {
  const inner = raw.replace(/^\{\{infobox\s*/i, '').replace(/\}\}$/, '')
  return parseInfoboxFields(inner)
}

export function serializeInfoboxFields(fields: InfoboxField[]): string {
  const parts = fields
    .map(({ key, value }) => ({ key: key.trim(), value: value.trim() }))
    .filter(({ key }) => key.length > 0)
    .map(({ key, value }) => `${key}=${value}`)
  return `{{infobox ${parts.join('|')}}}`
}

export function captionKeyForFields(fields: InfoboxField[]): 'name' | 'title' {
  return fields.some((field) => field.key === 'title') ? 'title' : 'name'
}

export function buildInfoboxPreviewHtml(raw: string): string {
  const fields = infoboxFieldsFromRaw(raw)
  if (fields.length === 0) {
    return `<div class="infobox-title">Info</div><table class="infobox-table"><tbody></tbody></table>`
  }

  const rows: string[] = []
  let caption = 'Info'
  let image = ''
  let imageCaption = ''

  for (const { key, value } of fields) {
    if (key === 'title' || key === 'name') {
      caption = value || 'Info'
      continue
    }
    if (key === 'image' || key === 'img') {
      image = image || value
      continue
    }
    if (key === 'caption') {
      imageCaption = imageCaption || value
      continue
    }
    rows.push(
      `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
  }

  const imageHtml = image ? `<img class="infobox-image" src="${escapeHtml(image)}" alt="" />` : ''
  const captionHtml = imageCaption
    ? `<div class="infobox-caption">${escapeHtml(imageCaption)}</div>`
    : ''

  return `${imageHtml}${captionHtml}<div class="infobox-title">${escapeHtml(caption)}</div><table class="infobox-table"><tbody>${rows.join('')}</tbody></table>`
}

export const INFOBOX_SOURCE_RE = /\{\{infobox[\s\S]*?\}\}/gi
