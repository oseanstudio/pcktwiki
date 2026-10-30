<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isValidSlug, uniqueSlug } from '@/lib/atproto/lichen'
import { NOTE_TEMPLATES, type NoteTemplateId } from '@/lib/lichen/templates'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'

const props = defineProps<{
  ownerHandle: string
  wikiSlug: string
  existingSlugs: string[]
}>()

const open = ref(false)
const title = ref('')
const slug = ref('')
const templateId = ref<NoteTemplateId>('blank')
const creating = ref(false)

const auth = useAuthStore()
const lichen = useLichenStore()
const router = useRouter()

const template = computed(
  () => NOTE_TEMPLATES.find((item) => item.id === templateId.value) ?? NOTE_TEMPLATES[0],
)

function openPicker() {
  open.value = true
  templateId.value = 'blank'
  title.value = ''
  slug.value = ''
}

function onTemplateChange() {
  if (!title.value.trim()) title.value = template.value.defaultTitle
  if (!slug.value.trim()) {
    slug.value = uniqueSlug(template.value.slugHint, props.existingSlugs)
  }
}

async function create() {
  if (!auth.agent) return
  const resolvedTitle = title.value.trim() || template.value.defaultTitle
  let resolvedSlug = slug.value.trim().toLowerCase()
  if (!resolvedSlug) {
    resolvedSlug = uniqueSlug(
      resolvedTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-'),
      props.existingSlugs,
    )
  }
  if (!isValidSlug(resolvedSlug) && !resolvedSlug.includes(':')) {
    // allow inbox etc. that are valid slugs; session/inbox are fine
    resolvedSlug = uniqueSlug(resolvedSlug.replace(/[^a-z0-9-]/g, '-'), props.existingSlugs)
  }
  if (!isValidSlug(resolvedSlug)) {
    resolvedSlug = uniqueSlug(template.value.slugHint, props.existingSlugs)
  }

  creating.value = true
  try {
    const content = template.value.buildContent(resolvedTitle)
    const note = await lichen.createNoteWithSlug(
      auth.agent,
      resolvedSlug,
      resolvedTitle,
      content,
      `Created from ${template.value.label} template`,
    )
    open.value = false
    router.push(`/@${props.ownerHandle}/${props.wikiSlug}/edit/${note.slug}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="new-note">
    <button type="button" class="btn btn-secondary btn-sm" @click="openPicker">
      + New note
    </button>

    <div v-if="open" class="picker card">
      <h3>New note</h3>
      <div class="field">
        <label class="label" for="note-template">Template</label>
        <select id="note-template" v-model="templateId" class="select" @change="onTemplateChange">
          <option v-for="item in NOTE_TEMPLATES" :key="item.id" :value="item.id">
            {{ item.label }} — {{ item.description }}
          </option>
        </select>
      </div>
      <div class="field">
        <label class="label" for="note-title">Title</label>
        <input id="note-title" v-model="title" class="input" type="text" :placeholder="template.defaultTitle" />
      </div>
      <div class="field">
        <label class="label" for="note-slug">Slug</label>
        <input id="note-slug" v-model="slug" class="input" type="text" :placeholder="template.slugHint" />
      </div>
      <div class="actions">
        <button type="button" class="btn btn-ghost btn-sm" @click="open = false">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="creating" @click="create">
          {{ creating ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-note {
  display: grid;
  gap: 0.5rem;
}

.picker {
  padding: 0.875rem;
  display: grid;
  gap: 0.5rem;
}

h3 {
  margin: 0;
  font-size: 0.9375rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}
</style>
