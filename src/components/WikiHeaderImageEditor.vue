<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { useWikiEditMode } from '@/composables/useWikiEditMode'
import { blobRefToJson, resolveBlobDisplayUrl, uploadBlob } from '@/lib/atproto/blobs'
import { prepareImageUpload } from '@/lib/media/prepare-image-upload'
import type { LichenBlobRef } from '@/types/lichen'

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
const { registerCommit, unregisterCommit } = useWikiEditMode()

const image = ref<LichenBlobRef | undefined>()
const previewUrl = ref<string | undefined>()
const uploading = ref(false)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const commitId = 'header-image-editor'

onMounted(async () => {
  const existing = lichen.currentWiki?.headerImage
  const did = lichen.currentWiki?.ownerDid
  if (existing && did) {
    image.value = blobRefToJson(existing) ?? existing
    try {
      previewUrl.value = (await resolveBlobDisplayUrl(did, existing)) ?? undefined
    } catch {
      // leave preview empty
    }
  }
  // Edit-mode Save owns the write when embedded — no per-editor Save button.
  if (props.embedded) {
    registerCommit(commitId, commit)
  }
})

onUnmounted(() => {
  if (props.embedded) unregisterCommit(commitId)
})

async function onPickImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !auth.agent) return
  error.value = ''
  uploading.value = true
  try {
    const prepared = await prepareImageUpload(file, 'header')
    const { blob } = await uploadBlob(auth.agent, prepared)
    image.value = blobRefToJson(blob) ?? blob
    previewUrl.value = URL.createObjectURL(prepared)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to upload image'
  } finally {
    uploading.value = false
  }
}

function clearImage() {
  image.value = undefined
  previewUrl.value = undefined
}

/** Returns false so the edit-mode commit set can stop on failure. */
async function commit(): Promise<boolean> {
  if (!auth.agent) {
    error.value = 'Sign in to save the header image'
    return false
  }
  if (!lichen.currentWiki) {
    error.value = 'Wiki is still loading — try again in a moment'
    return false
  }
  error.value = ''
  saving.value = true
  try {
    const next = image.value ? blobRefToJson(image.value) ?? image.value : undefined
    await lichen.setWikiHeaderImage(auth.agent, next)
    image.value = next
    emit('saved')
    return true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save header image'
    return false
  } finally {
    saving.value = false
  }
}

async function save() {
  const ok = await commit()
  if (!ok) return
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}

defineExpose({ commit })
</script>

<template>
  <section class="section" :class="{ card: !embedded }">
    <h2 v-if="!embedded">Header logo</h2>
    <p class="muted">
      Replaces the pckt wordmark in the top bar while people are on this wiki. Shown next to
      the spark menu on the left. Wide logos work best (about 200–400px wide).
    </p>

    <div class="logo-row">
      <div class="preview-wrap">
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Header logo preview"
          class="preview"
        />
        <div v-else class="preview placeholder" aria-hidden="true">pckt</div>
      </div>

      <div class="actions">
        <label class="btn btn-secondary btn-sm">
          {{ uploading ? 'Uploading…' : previewUrl ? 'Change image' : 'Upload image' }}
          <input
            type="file"
            accept="image/*"
            class="visually-hidden"
            :disabled="uploading || saving"
            @change="onPickImage"
          />
        </label>
        <button
          v-if="previewUrl || image"
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="saving"
          @click="clearImage"
        >
          Remove
        </button>
        <button
          v-if="!embedded"
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="uploading || saving"
          @click="save"
        >
          {{ saved ? 'Saved!' : saving ? 'Saving…' : 'Save logo' }}
        </button>
      </div>
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

.muted {
  margin: 0 0 1rem;
}

.logo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.preview-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 10rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg);
}

.preview {
  display: block;
  max-width: 14rem;
  max-height: 2rem;
  width: auto;
  height: auto;
  object-fit: contain;
}

.preview.placeholder {
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--pckt-text-subtle);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

label.btn {
  cursor: pointer;
}
</style>
