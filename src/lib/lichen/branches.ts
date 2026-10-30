import type { LichenNoteWithContent } from '@/types/lichen'

export const BRANCH_SLUG_PREFIX = 'branch:'

/**
 * Separates a branch's parent from its name.
 *
 * Branch slugs travel in the URL as a single `:noteSlug` path segment, so the
 * separator must not be `/` — a slug holding one splits into two segments and
 * the route stops matching at all, which is what made every branch link in the
 * app dead. `:` is legal unencoded inside a path segment, matches the
 * `branch:`/`talk:` namespace convention already in use, and cannot occur in a
 * parent slug or a normalized branch name.
 */
export const BRANCH_SEPARATOR = ':'

/** Branches written before the separator changed. Still read, never written. */
const LEGACY_BRANCH_SEPARATOR = '/'

export function isBranchSlug(slug: string): boolean {
  return slug.startsWith(BRANCH_SLUG_PREFIX)
}

function normalizeBranchName(branchName: string): string {
  return branchName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
}

export function branchSlugFor(parentSlug: string, branchName: string): string {
  return `${BRANCH_SLUG_PREFIX}${parentSlug}${BRANCH_SEPARATOR}${normalizeBranchName(branchName)}`
}

/** Offset of the separator dividing parent from name, in either format. */
function separatorIndex(rest: string): number {
  const current = rest.indexOf(BRANCH_SEPARATOR)
  const legacy = rest.indexOf(LEGACY_BRANCH_SEPARATOR)
  if (current === -1) return legacy
  if (legacy === -1) return current
  return Math.min(current, legacy)
}

export function parentSlugFromBranch(slug: string): string | null {
  if (!isBranchSlug(slug)) return null
  const rest = slug.slice(BRANCH_SLUG_PREFIX.length)
  const index = separatorIndex(rest)
  return index > 0 ? rest.slice(0, index) : null
}

export function branchNameFromSlug(slug: string): string | null {
  if (!isBranchSlug(slug)) return null
  const rest = slug.slice(BRANCH_SLUG_PREFIX.length)
  const index = separatorIndex(rest)
  return index >= 0 ? rest.slice(index + 1) : null
}

/** A branch slug in the old `/`-separated form, unreachable by URL. */
export function isLegacyBranchSlug(slug: string): boolean {
  return isBranchSlug(slug) && slug.includes(LEGACY_BRANCH_SEPARATOR)
}

/**
 * The current-format equivalent of a legacy branch slug. Any further `/` in the
 * name is folded to `-`, since one left in place would keep the slug split
 * across two path segments and defeat the migration.
 */
export function migratedBranchSlug(slug: string): string | null {
  if (!isLegacyBranchSlug(slug)) return null
  const parent = parentSlugFromBranch(slug)
  const name = branchNameFromSlug(slug)
  if (!parent || !name) return null
  const flattened = name.split(LEGACY_BRANCH_SEPARATOR).join('-')
  return `${BRANCH_SLUG_PREFIX}${parent}${BRANCH_SEPARATOR}${flattened}`
}

export function listBranches(
  notes: LichenNoteWithContent[],
  parentSlug: string,
): LichenNoteWithContent[] {
  return notes.filter((note) => parentSlugFromBranch(note.slug) === parentSlug)
}

export function createBranchSlug(
  parentSlug: string,
  branchName: string,
  existingSlugs: string[],
): string {
  const normalized = normalizeBranchName(branchName) || 'branch'

  let candidate = `${BRANCH_SLUG_PREFIX}${parentSlug}${BRANCH_SEPARATOR}${normalized}`
  let counter = 2
  while (existingSlugs.includes(candidate)) {
    candidate = `${BRANCH_SLUG_PREFIX}${parentSlug}${BRANCH_SEPARATOR}${normalized}-${counter}`
    counter += 1
  }
  return candidate
}
