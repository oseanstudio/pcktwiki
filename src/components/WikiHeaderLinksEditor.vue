<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { blobRefToJson, resolveBlobDisplayUrl, uploadBlob } from '@/lib/atproto/blobs'
import { prepareImageUpload } from '@/lib/media/prepare-image-upload'
import type { LichenBlobRef, LichenHeaderLink, LichenNoteWithContent } from '@/types/lichen'

const props = withDefaults(
  defineProps<{
    /** Wiki-wide links (settings) or page-specific links (edit note). */
    scope?: 'wiki' | 'note'
    /** Required when scope is `note` and the page already exists. */
    note?: LichenNoteWithContent | null
    embedded?: boolean
  }>(),
  {
    scope: 'wiki',
    note: null,
    embedded: false,
  },
)

const emit = defineEmits<{
  saved: []
}>()

const auth = useAuthStore()
const lichen = useLichenStore()

interface EditableLink {
  label: string
  url: string
  image?: LichenBlobRef
  previewUrl?: string
}

const items = ref<EditableLink[]>([])
const saving = ref(false)
const saved = ref(false)
const uploadingIndex = ref<number | null>(null)
const error = ref('')

const isNoteScope = () => props.scope === 'note'
/** New page: links are staged until the note is published. */
const isDraftNote = computed(() => isNoteScope() && !props.note)

function existingLinks(): LichenHeaderLink[] {
  if (isNoteScope()) return props.note?.subheaderLinks ?? []
  return lichen.currentWiki?.headerLinks ?? []
}

function collectLinks(): LichenHeaderLink[] {
  return items.value
    .map((item) => ({
      label: item.label.trim(),
      url: item.url.trim(),
      image: item.image ? blobRefToJson(item.image) ?? item.image : undefined,
    }))
    .filter((item) => item.label)
}

/** Used by EditPage to apply staged links when creating a new note. */
function getLinks(): LichenHeaderLink[] {
  return collectLinks()
}

defineExpose({ getLinks })

async function loadItems() {
  const existing = existingLinks()
  const did = lichen.currentWiki?.ownerDid
  items.value = existing.map((link) => ({
    label: link.label,
    url: link.url,
    image: link.image ? blobRefToJson(link.image) ?? link.image : undefined,
  }))
  if (!did) return
  await Promise.all(
    items.value.map(async (item) => {
      if (!item.image) return
      try {
        item.previewUrl = (await resolveBlobDisplayUrl(did, item.image)) ?? undefined
      } catch {
        // leave preview empty
      }
    }),
  )
}

onMounted(loadItems)
watch(
  () => [props.scope, props.note?.uri] as const,
  () => {
    void loadItems()
  },
)

function addLink() {
  items.value.push({ label: '', url: '' })
}

function removeLink(index: number) {
  items.value.splice(index, 1)
}

function moveLink(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const [item] = items.value.splice(index, 1)
  items.value.splice(target, 0, item)
}

async function onPickImage(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !auth.agent) return
  error.value = ''
  uploadingIndex.value = index
  try {
    const prepared = await prepareImageUpload(file, 'icon')
    const { blob } = await uploadBlob(auth.agent, prepared)
    const item = items.value[index]
    // Store plain JSON so putRecord encoding is not broken by Vue proxies / BlobRef class.
    item.image = blobRefToJson(blob) ?? blob
    item.previewUrl = URL.createObjectURL(prepared)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to upload image'
  } finally {
    uploadingIndex.value = null
  }
}

function clearImage(index: number) {
  const item = items.value[index]
  item.image = undefined
  item.previewUrl = undefined
}

async function save() {
  if (!auth.agent) {
    error.value = 'Sign in to save header links'
    return
  }
  if (!lichen.currentWiki) {
    error.value = 'Wiki is still loading — try again in a moment'
    return
  }
  error.value = ''

  // Drop rows with a destination but no label; title-only links are kept.
  const incomplete = items.value.some((item) => !item.label.trim() && item.url.trim())
  const links = collectLinks()

  if (items.value.length && !links.length) {
    error.value = 'Each link needs a label before saving'
    return
  }
  if (incomplete) {
    error.value = 'Skipped rows without a label'
  }

  if (isDraftNote.value) {
    items.value = links.map((link) => ({
      label: link.label,
      url: link.url,
      image: link.image,
      previewUrl: items.value.find((item) => item.label === link.label && item.url === link.url)
        ?.previewUrl,
    }))
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2000)
    return
  }

  saving.value = true
  try {
    if (isNoteScope() && props.note) {
      await lichen.setNoteSubheaderLinks(auth.agent, props.note, links)
    } else {
      await lichen.setWikiHeaderLinks(auth.agent, links)
    }
    items.value = links.map((link) => ({
      label: link.label,
      url: link.url,
      image: link.image,
      previewUrl: items.value.find((item) => item.label === link.label && item.url === link.url)
        ?.previewUrl,
    }))
    saved.value = true
    emit('saved')
    setTimeout(() => {
      saved.value = false
    }, 2000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : `Failed to save ${isNoteScope() ? 'subheader' : 'header'} links`
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="section" :class="{ card: !embedded }">
    <h2 v-if="!embedded">{{ scope === 'note' ? 'Subheader links' : 'Header links' }}</h2>
    <p class="muted">
      <template v-if="scope === 'note' && isDraftNote">
        Navigation under this page’s title. Saved when you publish the page. Use a note slug
        (e.g. <code>about</code>) or a full <code>https://</code> URL.
      </template>
      <template v-else-if="scope === 'note'">
        Navigation under this page’s title. Use a note slug (e.g. <code>about</code>) or a full
        <code>https://</code> URL.
      </template>
      <template v-else>
        Illustrated navigation row at the top of every page — image above label, like a site map.
        Add an image for each link (square artworks work best). Use a note slug (e.g.
        <code>about</code>) for internal pages, or a full <code>https://</code> URL for external
        sites.
      </template>
    </p>

    <ul class="link-list">
      <li v-for="(item, index) in items" :key="index" class="link-row">
        <div class="image-cell">
          <img v-if="item.previewUrl" :src="item.previewUrl" alt="" class="preview" />
          <div v-else class="preview placeholder" aria-hidden="true">+</div>
          <label class="image-btn">
            {{ uploadingIndex === index ? '…' : item.previewUrl ? 'Change' : 'Image' }}
            <input
              type="file"
              accept="image/*"
              class="visually-hidden"
              :disabled="uploadingIndex !== null"
              @change="(e) => onPickImage(index, e)"
            />
          </label>
          <button
            v-if="item.previewUrl"
            type="button"
            class="link-action"
            @click="clearImage(index)"
          >
            Remove image
          </button>
        </div>

        <div class="fields">
          <input v-model="item.label" class="input" type="text" placeholder="Label (e.g. About)" />
          <input
            v-model="item.url"
            class="input"
            type="text"
            placeholder="Destination (slug or https://…)"
          />
        </div>

        <div class="row-actions">
          <button type="button" class="link-action" :disabled="index === 0" @click="moveLink(index, -1)">↑</button>
          <button
            type="button"
            class="link-action"
            :disabled="index === items.length - 1"
            @click="moveLink(index, 1)"
          >
            ↓
          </button>
          <button type="button" class="link-action danger" @click="removeLink(index)">Delete</button>
        </div>
      </li>
    </ul>

    <div class="editor-actions">
      <button type="button" class="btn btn-secondary" @click="addLink">Add link</button>
      <button
        v-if="!isDraftNote"
        type="button"
        class="btn btn-primary"
        :disabled="saving"
        @click="save"
      >
        {{ saved ? 'Saved!' : saving ? 'Saving…' : scope === 'note' ? 'Save subheader links' : 'Save header links' }}
      </button>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>
  </section>
</template>

<style scoped>
.section {
  padding: 1.25rem;
}

.section h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.link-list {
  list-style: none;
  margin: 1rem 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.link-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: start;
  padding: 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-btn);
}

.image-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  width: 80px;
}

.preview {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid var(--pckt-border);
}

.preview.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pckt-text-muted);
  font-size: 1.25rem;
  background: var(--pckt-accent-soft);
}

.image-btn {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--pckt-blue);
  cursor: pointer;
}

.fields {
  display: grid;
  gap: 0.5rem;
}

.row-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.link-action {
  background: none;
  border: 1px solid var(--pckt-border);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--pckt-text);
}

.link-action:disabled {
  opacity: 0.4;
  cursor: default;
}

.link-action.danger {
  color: var(--pckt-red);
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

code {
  font-family: var(--pckt-font-mono);
  font-size: 0.8125em;
}
</style>
