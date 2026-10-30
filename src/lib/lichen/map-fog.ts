import type { LichenNoteWithContent } from '@/types/lichen'
import { noteKind, parseNoteContent } from '@/lib/lichen/content-meta'

/**
 * Fog of war over the wiki's world map. Two independent gates decide what a
 * reader sees, and both have to open:
 *
 * 1. Canon — has this place been released yet? Set by whoever writes the page
 *    (`map-locked`, `map-unlock`), so a locked place is fogged for everyone no
 *    matter where they have been. This is the lever that fills the map in as new
 *    chapters ship.
 * 2. Discovery — has *this reader* been to the page? Tracked per account, so the
 *    map records a personal route through a world that is already public.
 *
 * Keeping them separate is what stops a reader from clicking their way to the
 * whole map: visiting a page can only ever satisfy gate 2.
 */
export type MapPinState =
  /** Unreleased. Solid fog, no marker, not counted in progress. */
  | 'locked'
  /** Released but unvisited by this reader. Fogged, but hinted at. */
  | 'undiscovered'
  /** Released and visited. Fully drawn, and clears fog around itself. */
  | 'discovered'

/** Reveal radius when a place doesn't name one, as a percentage of map width. */
export const DEFAULT_REVEAL_RADIUS = 12

const MIN_REVEAL_RADIUS = 1
const MAX_REVEAL_RADIUS = 150

export interface MapPin {
  slug: string
  title: string
  /** Percentage across the map, 0–100. */
  x: number
  /** Percentage down the map, 0–100. */
  y: number
  /** Radius this place clears once discovered, as a percentage of map width. */
  radius: number
  state: MapPinState
  /** Shown instead of the title while undiscovered. */
  teaser?: string
  /** Only set on locked places that unlock on a schedule. */
  unlocksAt?: string
}

export interface BuildMapPinsOptions {
  /** Slugs this reader has already visited. */
  discovered: ReadonlySet<string>
  /** Reference time for scheduled unlocks. Defaults to now. */
  now?: Date
  /**
   * Ignore the canon gate and treat every place as released. For editors
   * previewing a map that readers cannot fully see yet — never a reader default.
   */
  revealLocked?: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Whether canon has released this place. A future `map-unlock` reads as locked,
 * which is what lets an editor stage a region ahead of a release date and have
 * it appear on its own.
 */
export function isCanonUnlocked(
  meta: { mapLocked?: boolean; mapUnlockAt?: string },
  now: Date = new Date(),
): boolean {
  if (meta.mapLocked) return false
  if (meta.mapUnlockAt) {
    const unlockAt = new Date(meta.mapUnlockAt)
    // An unparseable date must not silently release the place.
    if (Number.isNaN(unlockAt.getTime())) return false
    if (unlockAt.getTime() > now.getTime()) return false
  }
  return true
}

export function resolvePinState(
  meta: { mapLocked?: boolean; mapUnlockAt?: string },
  slug: string,
  options: BuildMapPinsOptions,
): MapPinState {
  const now = options.now ?? new Date()
  if (!options.revealLocked && !isCanonUnlocked(meta, now)) return 'locked'
  return options.discovered.has(slug) ? 'discovered' : 'undiscovered'
}

/**
 * Turn the wiki's notes into map pins. Only notes carrying both coordinates are
 * places; discussion and branch pages are skipped so a talk page can't sprout a
 * second marker on top of the article it belongs to.
 */
export function buildMapPins(
  notes: readonly LichenNoteWithContent[],
  options: BuildMapPinsOptions,
): MapPin[] {
  const pins: MapPin[] = []

  for (const note of notes) {
    if (noteKind(note.slug) !== 'article') continue

    const meta = parseNoteContent(note.content)
    if (meta.mapX == null || meta.mapY == null) continue

    const radius =
      meta.mapReveal == null
        ? DEFAULT_REVEAL_RADIUS
        : clamp(meta.mapReveal, MIN_REVEAL_RADIUS, MAX_REVEAL_RADIUS)

    pins.push({
      slug: note.slug,
      title: note.title,
      x: clamp(meta.mapX, 0, 100),
      y: clamp(meta.mapY, 0, 100),
      radius,
      state: resolvePinState(meta, note.slug, options),
      teaser: meta.mapTeaser,
      unlocksAt: meta.mapLocked ? undefined : meta.mapUnlockAt,
    })
  }

  return pins
}

/** The map image, taken from whichever place declares one. */
export function findMapImage(notes: readonly LichenNoteWithContent[]): string | null {
  for (const note of notes) {
    const meta = parseNoteContent(note.content)
    if (meta.mapImage) return meta.mapImage
  }
  return null
}

/**
 * How a `map-image` value should be turned into something an `<img>` can use.
 * `direct` is safe to use verbatim; `blob` has to be resolved against the wiki
 * owner's PDS first.
 */
export type MapImageSource =
  | { kind: 'direct'; url: string }
  | { kind: 'blob'; ref: string }

export function resolveMapImageSrc(raw: string | null): MapImageSource | null {
  const value = raw?.trim()
  if (!value) return null

  if (/^https?:\/\//i.test(value)) return { kind: 'direct', url: value }

  /*
   * A root-relative path is an asset this site serves. The negative lookahead
   * matters: `//evil.example/x.png` also starts with a slash but is
   * protocol-relative, so treating it as a local path would load the map from
   * another origin.
   */
  if (/^\/(?!\/)/.test(value)) return { kind: 'direct', url: value }

  return { kind: 'blob', ref: value.startsWith('blob:') ? value : `blob:${value}` }
}

/**
 * Colours the fog may be given. Note bodies are wiki content, so the value is
 * matched against known forms rather than trusted — anything else is dropped and
 * the theme default stands. Vue assigns this as a style property (which cannot
 * escape into a new declaration), so this is about rejecting nonsense, not
 * about being the only thing between content and the page.
 */
const FOG_COLOR_RE =
  /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([0-9a-z%.,\s/-]+\)|[a-z]+)$/i

/** Preset names, so a wiki doesn't have to pick a hex code to get dark fog. */
const FOG_PRESETS: Record<string, string> = {
  dark: '#05060a',
  black: '#000000',
  light: '#f4f1e8',
  none: 'transparent',
}

export function resolveFogColor(
  notes: readonly LichenNoteWithContent[],
): string | null {
  for (const note of notes) {
    const raw = parseNoteContent(note.content).mapFog?.trim()
    if (!raw) continue
    const preset = FOG_PRESETS[raw.toLowerCase()]
    if (preset) return preset
    if (FOG_COLOR_RE.test(raw)) return raw
    // A malformed colour falls through to the theme default rather than
    // painting the fog an unpredictable colour.
    return null
  }
  return null
}

export interface MapProgressSummary {
  discovered: number
  /** Released places only — locked ones would make the goal move. */
  total: number
  locked: number
  /** 0–100. Full when there is nothing released left to find. */
  percent: number
}

export function summarizeProgress(pins: readonly MapPin[]): MapProgressSummary {
  let discovered = 0
  let locked = 0
  for (const pin of pins) {
    if (pin.state === 'locked') locked += 1
    else if (pin.state === 'discovered') discovered += 1
  }
  const total = pins.length - locked
  return {
    discovered,
    total,
    locked,
    percent: total === 0 ? 100 : Math.round((discovered / total) * 100),
  }
}

/**
 * Geometry for the fog overlay.
 *
 * Reveal radii are percentages of the map's *width*, but the overlay has to
 * cover an image of arbitrary shape. Scaling a square 0–100 viewBox over a wide
 * image would stretch every reveal into an ellipse, so instead the viewBox keeps
 * width at 100 and takes its height from the image's aspect ratio. One unit then
 * means the same distance on both axes and circles stay circular.
 */
export interface FogGeometry {
  width: number
  height: number
}

export function fogGeometry(aspectRatio: number): FogGeometry {
  // Fall back to a square for a not-yet-loaded or degenerate image.
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1
  return { width: 100, height: 100 / safeAspect }
}

/** Place a pin in the fog viewBox, where y is a percentage of height. */
export function pinToFogPoint(
  pin: Pick<MapPin, 'x' | 'y'>,
  geometry: FogGeometry,
): { cx: number; cy: number } {
  return { cx: pin.x, cy: (pin.y / 100) * geometry.height }
}

/** Only discovered places clear fog — an undiscovered marker is a hint, not a hole. */
export function revealedPins(pins: readonly MapPin[]): MapPin[] {
  return pins.filter((pin) => pin.state === 'discovered')
}
