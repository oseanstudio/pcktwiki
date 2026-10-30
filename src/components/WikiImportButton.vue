<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { parseWikiZip, type WikiBundleData } from '@/lib/export/wiki-bundle'
import { hasRestorableHistory } from '@/lib/export/wiki-restore'
import {
  bundleNoteLabel,
  importNotesIntoCurrentWiki,
  type ImportConflictMode,
  type ImportIntoWikiResult,
} from '@/lib/export/wiki-import'

const emit = defineEmits<{
  done: [result: ImportIntoWikiResult]
}>()

const auth = useAuthStore()
const lichen = useLichenStore()

const open = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const loadingBundle = ref(false)
const importing = ref(false)
const errorText = ref('')
const bundle = ref<WikiBundleData | null>(null)
const selected = ref<Record<string, boolean>>({})
const conflictMode = ref<ImportConflictMode>('overwrite')
const includeChrome = ref(true)
const includeMedia = ref(true)
const includeSubheaderLinks = ref(true)
const restoreHistory = ref(true)
const pickedFile = ref<File | null>(null)
const preferSiteHtml = ref(false)
const hasSiteHtml = ref(false)
const resultSummary = ref('')

const notes = computed(() => bundle.value?.notes ?? [])
const selectedCount = computed(
  () => notes.value.filter((note) => selected.value[note.slug]).length,
)
const existingSlugSet = computed(() => new Set(lichen.notes.map((n) => n.slug)))
const conflictCount = computed(
  () => notes.value.filter((n) => selected.value[n.slug] && existingSlugSet.value.has(n.slug)).length,
)
const hasChrome = computed(() => Boolean(bundle.value?.chrome))
const hasMedia = computed(
  () => Boolean(bundle.value?.mediaFiles && Object.keys(bundle.value.mediaFiles).length),
)
const hasSubheaderLinks = computed(() =>
  notes.value.some((note) => (note.subheaderLinks?.length ?? 0) > 0),
)
const hasHistory = computed(() => hasRestorableHistory(bundle.value?.revisions))
const canImport = computed(
  () => Boolean(bundle.value) && (selectedCount.value > 0 || (includeChrome.value && hasChrome.value)),
)

function openPicker() {
  errorText.value = ''
  resultSummary.value = ''
  bundle.value = null
  selected.value = {}
  fileInput.value?.click()
}

function openDialog() {
  errorText.value = ''
  resultSummary.value = ''
  open.value = true
  if (!bundle.value) openPicker()
}

function closeDialog() {
  if (importing.value) return
  open.value = false
}

function selectAll() {
  const next: Record<string, boolean> = {}
  for (const note of notes.value) next[note.slug] = true
  selected.value = next
}

function selectNone() {
  const next: Record<string, boolean> = {}
  for (const note of notes.value) next[note.slug] = false
  selected.value = next
}

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  pickedFile.value = file
  preferSiteHtml.value = false
  await loadBundle()
}

async function toggleSiteHtml(checked: boolean) {
  preferSiteHtml.value = checked
  await loadBundle()
}

async function loadBundle() {
  const file = pickedFile.value
  if (!file) return

  loadingBundle.value = true
  errorText.value = ''
  resultSummary.value = ''
  try {
    const parsed = await parseWikiZip(file, { preferSiteHtml: preferSiteHtml.value })
    if (!parsed.notes.length && !parsed.chrome) {
      throw new Error('This backup has no pages or wiki chrome')
    }
    bundle.value = parsed
    selectAll()
    includeChrome.value = Boolean(parsed.chrome)
    includeMedia.value = Boolean(parsed.mediaFiles && Object.keys(parsed.mediaFiles).length)
    includeSubheaderLinks.value = parsed.notes.some((n) => (n.subheaderLinks?.length ?? 0) > 0)
    restoreHistory.value = hasRestorableHistory(parsed.revisions)
    hasSiteHtml.value = Boolean(parsed.manifest.includesStaticSite)
    open.value = true
  } catch (err) {
    bundle.value = null
    errorText.value = err instanceof Error ? err.message : 'Could not read backup'
    open.value = true
  } finally {
    loadingBundle.value = false
  }
}

async function runImport() {
  if (!auth.agent || !bundle.value || importing.value) return
  const slugs = notes.value.filter((n) => selected.value[n.slug]).map((n) => n.slug)
  if (!slugs.length && !(includeChrome.value && hasChrome.value)) {
    errorText.value = 'Select at least one page, or import wiki chrome'
    return
  }

  importing.value = true
  errorText.value = ''
  resultSummary.value = ''
  try {
    const result = await importNotesIntoCurrentWiki(auth.agent, bundle.value, {
      selectedSlugs: slugs,
      conflictMode: conflictMode.value,
      includeChrome: includeChrome.value,
      includeMedia: includeMedia.value,
      includeSubheaderLinks: includeSubheaderLinks.value,
      restoreHistory: restoreHistory.value,
    })
    const parts = [
      result.imported ? `${result.imported} added` : '',
      result.overwritten ? `${result.overwritten} overwritten` : '',
      result.skipped ? `${result.skipped} skipped` : '',
      result.chromeApplied ? 'chrome applied' : '',
      result.mediaUploaded ? `${result.mediaUploaded} images` : '',
    ].filter(Boolean)
    resultSummary.value = parts.length ? parts.join(' · ') : 'Nothing imported'
    emit('done', result)
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Import failed'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost btn-sm"
    :disabled="loadingBundle || importing"
    title="Import pages from a .pcktwiki.zip backup into this wiki"
    @click="openDialog"
  >
    {{ loadingBundle ? 'Reading…' : 'Import' }}
  </button>

  <input
    ref="fileInput"
    type="file"
    accept=".zip,.pcktwiki.zip,application/zip"
    hidden
    @change="onFilePicked"
  />

  <div v-if="open" class="import-backdrop" @click.self="closeDialog">
    <div class="import-dialog card" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <header class="import-header">
        <div>
          <h2 id="import-title">Import into this wiki</h2>
          <p class="muted">
            Choose pages and whether to bring images, header links, navbar links, and subheaders.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" :disabled="importing" @click="openPicker">
          Choose file…
        </button>
      </header>

      <template v-if="bundle">
        <p class="import-meta muted">
          Backup: <strong>{{ bundle.manifest.wiki.name }}</strong>
          · {{ notes.length }} page{{ notes.length === 1 ? '' : 's' }}
          <template v-if="hasMedia"> · images</template>
          <template v-if="hasChrome"> · chrome</template>
          · exported {{ new Date(bundle.manifest.exportedAt).toLocaleString() }}
        </p>

        <fieldset class="import-conflict" :disabled="importing">
          <legend>Include</legend>
          <label v-if="hasMedia" class="import-radio">
            <input v-model="includeMedia" type="checkbox" />
            Images (page content + link icons)
          </label>
          <label v-if="hasChrome" class="import-radio">
            <input v-model="includeChrome" type="checkbox" />
            Wiki chrome (header image, header links, top navbar, theme)
          </label>
          <label v-if="hasSubheaderLinks" class="import-radio">
            <input v-model="includeSubheaderLinks" type="checkbox" />
            Page subheader links and icons
          </label>
          <label v-if="hasHistory" class="import-radio">
            <input v-model="restoreHistory" type="checkbox" />
            Edit history and original page dates
          </label>
          <label v-if="hasSiteHtml" class="import-radio">
            <input
              :checked="preferSiteHtml"
              type="checkbox"
              @change="toggleSiteHtml(($event.target as HTMLInputElement).checked)"
            />
            Use edited pages from <code>site/</code> instead of the markdown
          </label>
          <p
            v-if="!hasMedia && !hasChrome && !hasSubheaderLinks && !hasHistory"
            class="muted conflict-hint"
          >
            This backup is notes-only (older export).
          </p>
        </fieldset>

        <div class="import-select-row">
          <span class="muted">{{ selectedCount }} selected</span>
          <div class="import-select-actions">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="importing" @click="selectAll">
              Select all
            </button>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="importing" @click="selectNone">
              Select none
            </button>
          </div>
        </div>

        <ul class="import-note-list">
          <li v-for="note in notes" :key="note.slug">
            <label class="import-note-row">
              <input
                v-model="selected[note.slug]"
                type="checkbox"
                :disabled="importing"
              />
              <span class="import-note-copy">
                <span class="import-note-title">{{ bundleNoteLabel(note) }}</span>
                <span class="import-note-slug muted">/{{ note.slug }}</span>
              </span>
              <span
                v-if="existingSlugSet.has(note.slug)"
                class="import-conflict-badge"
              >
                exists
              </span>
            </label>
          </li>
        </ul>

        <fieldset class="import-conflict" :disabled="importing || conflictCount === 0">
          <legend>If a page already exists</legend>
          <label class="import-radio">
            <input v-model="conflictMode" type="radio" value="overwrite" />
            Overwrite with backup content
          </label>
          <label class="import-radio">
            <input v-model="conflictMode" type="radio" value="skip" />
            Skip existing pages
          </label>
          <label class="import-radio">
            <input v-model="conflictMode" type="radio" value="rename" />
            Import as new pages (new slug)
          </label>
          <p v-if="conflictCount" class="muted conflict-hint">
            {{ conflictCount }} selected page{{ conflictCount === 1 ? '' : 's' }} already
            exist{{ conflictCount === 1 ? 's' : '' }} in this wiki.
          </p>
        </fieldset>
      </template>

      <p v-else class="muted import-empty">
        Choose a <code>.pcktwiki.zip</code> export to pick pages from.
      </p>

      <p v-if="errorText" class="error-text">{{ errorText }}</p>
      <p v-if="resultSummary" class="import-success">{{ resultSummary }}</p>

      <footer class="import-actions">
        <button type="button" class="btn btn-ghost btn-sm" :disabled="importing" @click="closeDialog">
          {{ resultSummary ? 'Close' : 'Cancel' }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="importing || !canImport"
          @click="runImport"
        >
          {{
            importing
              ? 'Importing…'
              : selectedCount
                ? `Import ${selectedCount} page${selectedCount === 1 ? '' : 's'}`
                : 'Import chrome'
          }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.import-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: color-mix(in srgb, #0f172a 42%, transparent);
}

.import-dialog {
  width: min(32rem, 100%);
  max-height: min(88vh, 40rem);
  overflow: auto;
  padding: 1.25rem;
  display: grid;
  gap: 0.875rem;
}

.import-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.import-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
}

.import-header p {
  margin: 0;
  font-size: 0.875rem;
}

.import-meta {
  margin: 0;
  font-size: 0.8125rem;
}

.import-select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.import-select-actions {
  display: flex;
  gap: 0.25rem;
}

.import-note-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  max-height: 14rem;
  overflow: auto;
}

.import-note-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5625rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--pckt-border) 80%, transparent);
  cursor: pointer;
}

.import-note-list li:last-child .import-note-row {
  border-bottom: none;
}

.import-note-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
}

.import-note-title {
  font-size: 0.875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-note-slug {
  font-size: 0.75rem;
  font-family: var(--pckt-font-mono);
}

.import-conflict-badge {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pckt-text-subtle);
  background: var(--pckt-bg-muted);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.import-conflict {
  margin: 0;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  display: grid;
  gap: 0.375rem;
}

.import-conflict legend {
  padding: 0 0.25rem;
  font-size: 0.8125rem;
  font-weight: 700;
}

.import-radio {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.conflict-hint {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
}

.import-empty {
  margin: 0;
  padding: 1rem 0;
}

.import-success {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--pckt-green) 80%, var(--pckt-text));
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
