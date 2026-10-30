import type { Agent } from '@atproto/api'
import type { LichenWikiRecord } from '@/types/lichen'
import { putWikiAtSlug } from '@/lib/atproto/lichen'
import { saveFork, type ForkNoteBaseline, type ForkRecord } from '@/lib/lichen/fork'
import { resolveHandle } from '@/lib/lichen/fork-discovery'
import type { WikiBundleData } from '@/lib/export/wiki-bundle'

/**
 * A bundle can name the wiki it was exported from, which is enough to treat a
 * restored copy as a fork of that wiki: the provenance goes on the new record
 * and the bundle's own page contents become the merge base, so upstream sync
 * has something to diff against without ever contacting the source first.
 */
export function bundleForkSource(bundle: WikiBundleData): {
  uri: string
  did: string
  slug: string
} | null {
  const { uri, ownerDid, slug } = bundle.manifest.wiki
  if (!uri || !ownerDid) return null
  return { uri, did: ownerDid, slug: slug || '' }
}

/** Merge bases keyed by note slug, taken from the bundle's page contents. */
function baselinesFromBundle(bundle: WikiBundleData): Record<string, ForkNoteBaseline> {
  const baselines: Record<string, ForkNoteBaseline> = {}
  for (const note of bundle.notes) {
    const revisions = bundle.revisions?.[note.slug]
    const latest = revisions?.length
      ? [...revisions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1)
      : undefined
    baselines[note.slug] = {
      sourceContent: note.content,
      sourceRevisionUri: latest?.uri ?? null,
    }
  }
  return baselines
}

/**
 * Record an imported wiki as a fork of the wiki its bundle came from.
 *
 * Returns the fork record, or null when the bundle carries no provenance (an
 * older export, or one stripped of its manifest URIs).
 */
export async function trackImportAsFork(
  agent: Agent,
  bundle: WikiBundleData,
  wiki: LichenWikiRecord,
  options: { forkHandle: string; autoSync?: boolean },
): Promise<ForkRecord | null> {
  const source = bundleForkSource(bundle)
  if (!source) return null

  // Don't let a wiki be its own upstream when a bundle is re-imported over the
  // repo it came from.
  if (source.uri === wiki.uri) return null

  const forkedAt = new Date().toISOString()
  const updated: LichenWikiRecord = {
    ...wiki,
    forkedFrom: source.uri,
    forkedAt,
  }

  await putWikiAtSlug(agent, wiki.slug, updated)
  wiki.forkedFrom = source.uri
  wiki.forkedAt = forkedAt

  const record: ForkRecord = {
    forkWikiUri: wiki.uri,
    forkSlug: wiki.slug,
    forkHandle: options.forkHandle,
    sourceDid: source.did,
    sourceHandle: await resolveHandle(source.did),
    sourceSlug: source.slug,
    sourceWikiUri: source.uri,
    createdAt: forkedAt,
    autoSync: options.autoSync ?? false,
    lastCheckedAt: forkedAt,
    baselines: baselinesFromBundle(bundle),
  }

  saveFork(record)
  return record
}
