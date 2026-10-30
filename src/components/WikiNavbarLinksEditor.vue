<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import type { LichenNavLink } from '@/types/lichen'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  { embedded: false },
)

const emit = defineEmits<{
  saved: []
}>()

const auth = useAuthStore()
const lichen = useLichenStore()

interface EditableLink {
  label: string
  url: string
}

const items = ref<EditableLink[]>([])
const saving = ref(false)
const saved = ref(false)
const error = ref('')

function existingLinks(): LichenNavLink[] {
  return lichen.currentWiki?.navbarLinks ?? []
}

function collectLinks(): LichenNavLink[] {
  return items.value
    .map((item) => ({
      label: item.label.trim(),
      url: item.url.trim(),
    }))
    .filter((item) => item.label)
}

function loadItems() {
  items.value = existingLinks().map((link) => ({
    label: link.label,
    url: link.url,
  }))
}

onMounted(loadItems)
watch(
  () => lichen.currentWiki?.uri,
  () => {
    loadItems()
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

async function save() {
  if (!auth.agent) {
    error.value = 'Sign in to save navbar links'
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

  saving.value = true
  try {
    await lichen.setWikiNavbarLinks(auth.agent, links)
    items.value = links.map((link) => ({ label: link.label, url: link.url }))
    saved.value = true
    emit('saved')
    setTimeout(() => {
      saved.value = false
    }, 2000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save navbar links'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="section" :class="{ card: !embedded }">
    <h2 v-if="!embedded">Top navbar links</h2>
    <p class="muted">
      Text links in the top bar on every page of this wiki (e.g. Home, Game, Manga). Choose a
      label and where it goes — a note slug like <code>home</code>, <code>.</code> for the wiki
      home, or a full <code>https://</code> URL.
      <template v-if="!embedded"> Separate from the illustrated header links below.</template>
    </p>

    <ul class="link-list">
      <li v-for="(item, index) in items" :key="index" class="link-row">
        <div class="fields">
          <input
            v-model="item.label"
            class="input"
            type="text"
            placeholder="Label (e.g. Home)"
          />
          <input
            v-model="item.url"
            class="input"
            type="text"
            placeholder="Destination (slug or https://…)"
          />
        </div>

        <div class="row-actions">
          <button type="button" class="link-action" :disabled="index === 0" @click="moveLink(index, -1)">
            ↑
          </button>
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
      <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
        {{ saved ? 'Saved!' : saving ? 'Saving…' : 'Save navbar links' }}
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
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: start;
  padding: 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-btn);
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

code {
  font-family: var(--pckt-font-mono);
  font-size: 0.8125em;
}
</style>
