<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import WikiMarkdownEditor from '@/components/WikiMarkdownEditor.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import {
  getDraftWiki,
  updateDraftNote,
  addDraftNote,
  type DraftWiki,
} from '@/lib/offline/draft-wiki'
import { publishDraftWiki } from '@/lib/offline/publish-draft'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const draftId = computed(() => route.params.draftId as string)
const noteSlug = computed(() => (route.params.noteSlug as string | undefined) ?? 'home')

const draft = ref<DraftWiki | null>(null)
const loading = ref(true)
const saving = ref(false)
const publishing = ref(false)
const editContent = ref('')
const editTitle = ref('')

const activeNote = computed(() =>
  draft.value?.notes.find((n) => n.slug === noteSlug.value) ?? null,
)

async function loadDraft() {
  loading.value = true
  draft.value = await getDraftWiki(draftId.value)
  if (draft.value && activeNote.value) {
    editContent.value = activeNote.value.content
    editTitle.value = activeNote.value.title
  }
  loading.value = false
}

watch([draftId, noteSlug], loadDraft, { immediate: true })

async function saveNote() {
  if (!draft.value || !activeNote.value) return
  saving.value = true
  try {
    await updateDraftNote(draftId.value, noteSlug.value, {
      title: editTitle.value,
      content: editContent.value,
    })
    await loadDraft()
  } finally {
    saving.value = false
  }
}

async function createNote() {
  const title = prompt('Note title')
  if (!title?.trim()) return
  const updated = await addDraftNote(draftId.value, title.trim())
  if (updated) {
    const note = updated.notes[updated.notes.length - 1]
    router.push(`/draft/${draftId.value}/${note.slug}`)
  }
}

async function publish() {
  if (!auth.agent) {
    router.push({ name: 'home', query: { redirect: route.fullPath, signIn: '1' } })
    return
  }
  publishing.value = true
  try {
    await saveNote()
    const slug = await publishDraftWiki(auth.agent, draftId.value)
    router.push(`/@${auth.handle}/${slug}`)
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <div class="draft-page">
    <div class="draft-inner">
      <header class="draft-header">
        <p class="draft-badge">Local draft</p>
        <h1>{{ draft?.name ?? 'Draft wiki' }}</h1>
        <p class="muted">Saved on this device only. Sign in to publish to your PDS.</p>
        <div class="draft-actions">
          <button type="button" class="btn btn-primary" :disabled="publishing" @click="publish">
            {{ publishing ? 'Publishing…' : auth.isAuthenticated ? 'Publish to PDS' : 'Sign in to publish' }}
          </button>
          <RouterLink to="/library" class="btn btn-ghost">Library</RouterLink>
        </div>
      </header>

      <div v-if="loading" class="muted">Loading draft…</div>
      <div v-else-if="!draft" class="error-text">Draft not found.</div>
      <div v-else class="draft-layout">
        <aside class="draft-nav card">
          <h2>Notes</h2>
          <ul>
            <li v-for="note in draft.notes" :key="note.slug">
              <RouterLink
                :to="`/draft/${draftId}/${note.slug}`"
                :class="{ active: note.slug === noteSlug }"
              >
                {{ note.title }}
              </RouterLink>
            </li>
          </ul>
          <button type="button" class="btn btn-secondary btn-sm" @click="createNote">New note</button>
        </aside>

        <main class="draft-main card">
          <template v-if="route.query.edit === '1'">
            <div class="field">
              <label class="label" for="title">Title</label>
              <input id="title" v-model="editTitle" class="input" type="text" />
            </div>
            <WikiMarkdownEditor
              v-model="editContent"
              class="draft-editor"
              prose
              live-rendered
              auto-grow
              min-height="18rem"
            />
            <button type="button" class="btn btn-primary" :disabled="saving" @click="saveNote">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </template>
          <template v-else-if="activeNote">
            <div class="draft-note-header">
              <h2>{{ activeNote.title }}</h2>
              <RouterLink
                :to="{ path: `/draft/${draftId}/${noteSlug}`, query: { edit: '1' } }"
                class="btn btn-secondary btn-sm"
              >
                Edit
              </RouterLink>
            </div>
            <MarkdownRenderer :source="activeNote.content" />
          </template>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.draft-page {
  padding: 2rem 1.25rem 4rem;
}

.draft-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.draft-badge {
  display: inline-block;
  margin: 0 0 0.5rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: color-mix(in srgb, var(--pckt-yellow) 35%, transparent);
  border-radius: var(--pckt-radius-sm);
}

.draft-header h1 {
  margin: 0 0 0.25rem;
}

.draft-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.draft-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (max-width: 720px) {
  .draft-layout {
    grid-template-columns: 1fr;
  }
}

.draft-nav {
  padding: 1rem;
}

.draft-nav ul {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
}

.draft-nav a {
  display: block;
  padding: 0.35rem 0;
  text-decoration: none;
  color: var(--pckt-text);
}

.draft-nav a.active {
  font-weight: 700;
  color: var(--pckt-accent);
}

.draft-main {
  padding: 1.25rem;
}

.draft-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.draft-note-header h2 {
  margin: 0;
}

.draft-editor {
  margin-bottom: 1rem;
}
</style>
