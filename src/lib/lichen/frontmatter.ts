export interface NoteFrontmatter {
  redirect?: string
  categories?: string[]
  status?: 'draft' | 'stub'
  blogPath?: string
  template?: string
  canon?: 'main' | 'au' | 'spoilers'
  date?: string
  era?: string
  /** Map pin coordinates 0–100 (percent of map image). */
  mapX?: number
  mapY?: number
  mapImage?: string
  /**
   * How much of the map this place clears from the fog once discovered, as a
   * percentage of the map's width. Absent means the default radius.
   */
  mapReveal?: number
  /**
   * Canon gate. While true the place is unreleased: it stays under solid fog
   * for every reader, including ones who have already visited the page.
   */
  mapLocked?: boolean
  /**
   * Canon gate on a schedule — the place unlocks by itself once this moment
   * passes, so a chapter or episode drop needs no manual edit. Ignored when
   * `mapLocked` is set.
   */
  mapUnlockAt?: string
  /**
   * Teaser shown in place of the name while the place is unlocked but this
   * reader has not found it yet. Absent falls back to a generic marker.
   */
  mapTeaser?: string
  /**
   * Colour of the fog itself. Absent follows the reader's theme, which suits a
   * light map; artwork on a dark ground needs a dark fog set explicitly, or the
   * covered area reads brighter than the revealed one.
   */
  mapFog?: string
  /**
   * AT-URIs of off-wiki records an admin approved for display in the
   * "Referenced across the network" panel. Nothing found via Constellation
   * shows on the page unless it is listed here.
   */
  references?: string[]
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function unquote(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '')
}

function isTruthy(raw: string): boolean {
  const value = raw.trim().toLowerCase()
  return value === 'true' || value === 'yes' || value === 'on' || value === '1'
}

function parseInlineList(value: string): string[] {
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map(unquote)
    .filter(Boolean)
}

function parseListBlock(yaml: string, key: string): string[] | null {
  const block = yaml.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'))
  if (!block) return null
  return block[1]
    .split('\n')
    .map((line) => unquote(line.replace(/^\s*-\s*/, '')))
    .filter(Boolean)
}

export function parseFrontmatter(source: string): {
  frontmatter: NoteFrontmatter
  body: string
} {
  const match = source.match(FRONTMATTER_RE)
  if (!match) {
    return { frontmatter: {}, body: source }
  }

  const frontmatter: NoteFrontmatter = {}
  const yaml = match[1]

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase()
    let value = trimmed.slice(colonIdx + 1).trim()

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1)
    }

    switch (key) {
      case 'redirect':
        frontmatter.redirect = value
        break
      case 'status':
        if (value === 'draft' || value === 'stub') frontmatter.status = value
        break
      case 'blog-path':
      case 'blogpath':
        frontmatter.blogPath = value
        break
      case 'template':
        frontmatter.template = value.toLowerCase()
        break
      case 'canon':
        if (value === 'main' || value === 'au' || value === 'spoilers') {
          frontmatter.canon = value
        }
        break
      case 'date':
        frontmatter.date = value
        break
      case 'era':
        frontmatter.era = value
        break
      case 'map-x':
      case 'mapx': {
        const n = Number(value)
        if (Number.isFinite(n)) frontmatter.mapX = n
        break
      }
      case 'map-y':
      case 'mapy': {
        const n = Number(value)
        if (Number.isFinite(n)) frontmatter.mapY = n
        break
      }
      case 'map-image':
      case 'mapimage':
        frontmatter.mapImage = value
        break
      case 'map-reveal':
      case 'mapreveal': {
        const n = Number(value)
        if (Number.isFinite(n)) frontmatter.mapReveal = n
        break
      }
      case 'map-locked':
      case 'maplocked':
        frontmatter.mapLocked = isTruthy(value)
        break
      case 'map-unlock':
      case 'map-unlock-at':
      case 'mapunlock':
        frontmatter.mapUnlockAt = value
        break
      case 'map-teaser':
      case 'mapteaser':
        frontmatter.mapTeaser = value
        break
      case 'map-fog':
      case 'mapfog':
        frontmatter.mapFog = value
        break
      case 'categories':
        frontmatter.categories = parseInlineList(value)
        break
      case 'references':
        frontmatter.references = parseInlineList(value)
        break
    }
  }

  // Multi-line lists (YAML-style)
  const categoriesBlock = parseListBlock(yaml, 'categories')
  if (categoriesBlock) frontmatter.categories = categoriesBlock
  const referencesBlock = parseListBlock(yaml, 'references')
  if (referencesBlock) frontmatter.references = referencesBlock

  return { frontmatter, body: source.slice(match[0].length) }
}

export function stripFrontmatter(source: string): string {
  return parseFrontmatter(source).body
}

/**
 * Split a note into its raw frontmatter lines and body without interpreting
 * either. Unlike {@link parseFrontmatter} this keeps keys we do not model, so a
 * note can be taken apart and put back together byte-for-byte.
 */
export function splitFrontmatter(source: string): {
  raw: string | null
  body: string
} {
  const match = source.match(FRONTMATTER_RE)
  if (!match) return { raw: null, body: source }
  return { raw: match[1], body: source.slice(match[0].length) }
}

/** Rebuild a note from raw frontmatter lines and a body. */
export function joinFrontmatter(raw: string | null, body: string): string {
  const lines = (raw ?? '').split('\n').filter((line) => line.trim())
  if (!lines.length) return body
  return `---\n${lines.join('\n')}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`
}

/** Replace or insert a single frontmatter key while preserving the rest of the note. */
export function setFrontmatterField(
  source: string,
  key: string,
  value: string | null,
): string {
  const match = source.match(FRONTMATTER_RE)
  const normalizedKey = key.toLowerCase()
  if (!match) {
    if (value == null || value === '') return source
    return `---\n${normalizedKey}: ${value}\n---\n\n${source}`
  }

  const yaml = match[1]
  const lines = yaml.split('\n')
  let found = false
  const nextLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) return line
    const lineKey = trimmed.slice(0, colonIdx).trim().toLowerCase()
    if (lineKey !== normalizedKey) return line
    found = true
    if (value == null || value === '') return null
    return `${normalizedKey}: ${value}`
  }).filter((line): line is string => line != null)

  if (!found && value != null && value !== '') {
    nextLines.push(`${normalizedKey}: ${value}`)
  }

  const body = source.slice(match[0].length)
  if (nextLines.length === 0) return body
  return `---\n${nextLines.join('\n')}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`
}
