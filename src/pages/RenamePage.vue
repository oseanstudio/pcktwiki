<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { loadWikiByHandle } from '@/lib/atproto/wiki-loader'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { normalizeHandle } from '@/lib/config'
import { canEdit } from '@/lib/lichen/collections'
import { isValidSlug } from '@/lib/atproto/lichen'
import {
  buildRedirectContent,
  collectRenameUpdates,
} from '@/lib/lichen/rename'
import { remapNoteWatchRef } from '@/lib/watchlist'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const lichen = useLichenStore()

const handle = computed(() => normalizeHandle(route.params.handle as string))
const wikiSlug = computed(() => route.params.wikiSlug as string)
const noteSlug = computed(() => String(route.query.from ?? ''))

const newSlug = ref('')
const newTitle = ref('')
const busy = ref(false)
const error = ref('')
const previewCount = ref(0)

const note = computed(() => lichen.getNoteBySlug(noteSlug.value) ?? null)
const canEditWiki = computed(() => canEdit(lichen.access))

const inboundPreview = computed(() => {
  if (!note.value) return []
  return collectRenameUpdates(lichen.notes, note.value.slug, newSlug.value.trim() || note.value.slug)
})

watch(inboundPreview, (items) => {
  previewCount.value = items.length
})

async function load() {
  await loadWikiByHandle(lichen, {
    handle: handle.value,
    wikiSlug: wikiSlug.value,
    viewerDid: auth.did,
    authAgent: auth.agent,
  })
  if (note.value) {
    newSlug.value = note.value.slug
    newTitle.value = note.value.title
  }
}

onMounted(load)
watch(() => route.fullPath, load)

async function rename() {
  if (!auth.agent || !note.value || !canEditWiki.value) return
  error.value = ''
  const targetSlug = newSlug.value.trim().toLowerCase()
  if (!isValidSlug(targetSlug)) {
    error.value = 'Slug must be lowercase letters, numbers, and hyphens.'
    return
  }
  if (targetSlug !== note.value.slug && lichen.getNoteBySlug(targetSlug)) {
    error.value = 'A note with that slug already exists.'
    return
  }

  busy.value = true
  try {
    const old = note.value
    const updates = collectRenameUpdates(lichen.notes, old.slug, targetSlug)

    // Create/move content to new slug if slug changed
    if (targetSlug !== old.slug) {
      await lichen.createNoteWithSlug(
        auth.agent,
        targetSlug,
        newTitle.value.trim() || old.title,
        old.content,
        `Renamed from ${old.slug}`,
      )
      await lichen.saveNoteEdit(
        auth.agent,
        old,
        old.title,
        buildRedirectContent(old.title, targetSlug),
        `Redirect to ${targetSlug}`,
      )
    } else if (newTitle.value.trim() && newTitle.value.trim() !== old.title) {
      await lichen.saveNoteEdit(
        auth.agent,
        old,
        newTitle.value.trim(),
        old.content,
        'Renamed title',
      )
    }

    // Keep any article subscription pointed at the note under its new slug.
    if (targetSlug !== old.slug && lichen.currentWiki) {
      remapNoteWatchRef(lichen.currentWiki.uri, old.slug, {
        noteSlug: targetSlug,
        noteTitle: newTitle.value.trim() || old.title,
      })
    }

    for (const update of updates) {
      await lichen.saveNoteEdit(
        auth.agent,
        update.note,
        update.note.title,
        update.nextContent,
        `Updated links after rename to ${targetSlug}`,
      )
    }

    router.push(`/@${handle.value}/${wikiSlug.value}/${targetSlug}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Rename failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="rename-page">
    <div class="inner">
      <header>
        <RouterLink :to="`/@${handle}/${wikiSlug}`" class="muted">← Wiki home</RouterLink>
        <h1>Rename note</h1>
        <p class="muted">Updates inbound wikilinks and leaves a redirect at the old slug.</p>
      </header>

      <p v-if="!noteSlug" class="muted">
        Open from a note toolbar, or add <code>?from=slug</code> to the URL.
      </p>

      <form v-else-if="note && canEditWiki" class="card form" @submit.prevent="rename">
        <p class="muted">Renaming <strong>{{ note.slug }}</strong></p>
        <div class="field">
          <label class="label" for="new-title">Title</label>
          <input id="new-title" v-model="newTitle" class="input" type="text" />
        </div>
        <div class="field">
          <label class="label" for="new-slug">Slug</label>
          <input id="new-slug" v-model="newSlug" class="input" type="text" />
        </div>
        <p class="muted">Will update {{ previewCount }} other note{{ previewCount === 1 ? '' : 's' }}.</p>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? 'Renaming…' : 'Rename' }}
        </button>
        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
      <p v-else-if="noteSlug && !note" class="muted">Note not found.</p>
      <p v-else-if="note && !canEditWiki" class="muted">You need edit access to rename notes.</p>
    </div>
  </div>
</template>

<style scoped>
.rename-page {
  padding: 2rem 1.25rem 4rem;
}

.inner {
  max-width: 560px;
  margin: 0 auto;
}

header h1 {
  margin: 0.5rem 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.form {
  margin-top: 1rem;
  padding: 1.25rem;
  display: grid;
  gap: 0.75rem;
}

code {
  font-family: var(--pckt-font-mono);
  font-size: 0.85em;
}
</style>
