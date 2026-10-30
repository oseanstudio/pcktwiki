#!/usr/bin/env node
/**
 * Build static JSON mirrors for featured public wikis.
 * Usage: node scripts/build-wiki-mirror.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MIRROR_WIKIS = [
  { handle: 'juprodh.me', slug: 'welcome-to-lichen' },
  { handle: 'mfzx.net', slug: 'at-protocol-paper-errata-and-details' },
]

async function fetchWiki(handle, slug) {
  const didRes = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
  )
  if (!didRes.ok) throw new Error(`resolveHandle failed for ${handle}`)
  const { did } = await didRes.json()

  const plcRes = await fetch(`https://plc.directory/${encodeURIComponent(did)}`)
  if (!plcRes.ok) throw new Error(`PLC failed for ${did}`)
  const plc = await plcRes.json()
  const pds =
    plc.service?.find((s) => s.id === '#atproto_pds')?.serviceEndpoint ??
    'https://bsky.social'

  const listRecords = async (collection) => {
    const items = []
    let cursor
    do {
      const url = new URL('/xrpc/com.atproto.repo.listRecords', pds)
      url.searchParams.set('repo', did)
      url.searchParams.set('collection', collection)
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`listRecords ${collection} failed`)
      const data = await res.json()
      items.push(...(data.records ?? []))
      cursor = data.cursor
    } while (cursor)
    return items
  }

  const wikis = await listRecords('wiki.lichen.wiki')
  const wikiRec = wikis.find((r) => r.value?.slug === slug)?.value
  if (!wikiRec) throw new Error(`Wiki ${slug} not found on ${handle}`)

  const wikiUri = `at://${did}/wiki.lichen.wiki/${wikis.find((r) => r.value?.slug === slug).uri.split('/').pop()}`
  const notes = (await listRecords('wiki.lichen.note')).filter((r) => r.value?.wikiRef === wikiUri)
  const noteUris = new Set(notes.map((n) => n.uri))
  const revisions = (await listRecords('wiki.lichen.noteRevision')).filter((r) =>
    noteUris.has(r.value?.noteRef),
  )

  const noteRecords = notes.map((n) => ({
    uri: n.uri,
    slug: n.value.slug,
    title: n.value.title,
    wikiRef: n.value.wikiRef,
    createdAt: n.value.createdAt,
  }))

  const revisionRecords = revisions.map((r) => ({
    uri: r.uri,
    noteRef: r.value.noteRef,
    diff: r.value.diff,
    message: r.value.message,
    createdAt: r.value.createdAt,
  }))

  const contents = new Map()
  for (const rev of revisionRecords.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const note = noteRecords.find((n) => n.uri === rev.noteRef)
    if (!note) continue
    const prev = contents.get(note.slug) ?? ''
    const { diff_match_patch: dmp } = await import('diff-match-patch')
    const d = new dmp.diff_match_patch()
    const patches = d.patch_fromText(rev.diff)
    const [merged] = d.patch_apply(patches, prev)
    contents.set(note.slug, merged)
  }

  const notesWithContent = noteRecords.map((n) => ({
    ...n,
    content: contents.get(n.slug) ?? '',
    latestRevisionUri: revisionRecords.filter((r) => r.noteRef === n.uri).at(-1)?.uri ?? null,
  }))

  return {
    handle,
    slug,
    did,
    wiki: {
      uri: wikiUri,
      slug: wikiRec.slug,
      name: wikiRec.name,
      visibility: wikiRec.visibility,
      language: wikiRec.language,
      ownerDid: did,
      createdAt: wikiRec.createdAt,
      theme: wikiRec.theme,
    },
    noteRecords,
    revisionRecords,
    notesWithContent,
    fetchedAt: Date.now(),
  }
}

async function main() {
  for (const { handle, slug } of MIRROR_WIKIS) {
    console.log(`Mirroring @${handle}/${slug}…`)
    const entry = await fetchWiki(handle, slug)
    const outDir = join(root, 'public', 'mirrors', handle.toLowerCase())
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, `${slug}.json`), JSON.stringify(entry, null, 2))
    console.log(`  → public/mirrors/${handle.toLowerCase()}/${slug}.json`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
