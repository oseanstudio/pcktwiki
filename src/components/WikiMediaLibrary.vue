<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { LichenNoteWithContent } from '@/types/lichen'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { scanWikiMedia, orphanMediaAssets, type MediaAsset } from '@/lib/lichen/media-index'
import {
  resolveBlobDisplayUrl,
  resolveBlobSrcSync,
  uploadBlob,
} from '@/lib/atproto/blobs'
import { prepareImageUploadPair } from '@/lib/media/prepare-image-upload'
import { serializeImageTitle } from '@/lib/editor/image-align'
import { resolvePdsUrl } from '@/lib/atproto/pds'
import { toUserFacingNetworkError } from '@/lib/http-retry'

const props = defineProps<{
  notes: LichenNoteWithContent[]
  canEdit: boolean
}>()

const auth = useAuthStore()
const lichen = useLichenStore()

const uploading = ref(false)
const errorText = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const resolvedSrc = ref<Record<string, string>>({})

const assets = computed(() => scanWikiMedia(props.notes))
const orphans = computed(() => orphanMediaAssets(assets.value, props.notes))
const ownerDid = computed(() => lichen.currentWiki?.ownerDid)

function displaySrc(url: string): string {
  return resolvedSrc.value[url] ?? resolveBlobSrcSync(url, ownerDid.value) ?? url
}

async function resolveAssetSrcs() {
  const did = ownerDid.value
  if (!did) return
  await resolvePdsUrl(did).catch(() => undefined)
  const next: Record<string, string> = { ...resolvedSrc.value }
  const urls = new Set<string>()
  for (const asset of assets.value) {
    urls.add(asset.url)
    urls.add(asset.fullUrl)
  }
  await Promise.all(
    [...urls].map(async (url) => {
      if (next[url]) return
      const sync = resolveBlobSrcSync(url, did)
      if (sync) {
        next[url] = sync
        return
      }
      try {
        const resolved = await resolveBlobDisplayUrl(did, url)
        if (resolved) next[url] = resolved
      } catch {
        // leave unresolved
      }
    }),
  )
  resolvedSrc.value = next
}

watch([assets, ownerDid], () => {
  void resolveAssetSrcs()
})
onMounted(() => {
  void resolveAssetSrcs()
})

async function onUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !auth.agent) return

  uploading.value = true
  errorText.value = null
  try {
    const { full, thumb, width, height } = await prepareImageUploadPair(file)
    const uploaded = await uploadBlob(auth.agent, full)
    let thumbUrl: string | undefined
    if (thumb !== full) {
      const uploadedThumb = await uploadBlob(auth.agent, thumb)
      thumbUrl = uploadedThumb.url
    }
    const title = serializeImageTitle({ thumbUrl, width, height })
    const markdown = title
      ? `![${file.name}](${uploaded.url} "${title}")`
      : `![${file.name}](${uploaded.url})`
    // Portable blob ref — same as article/subheader uploads. Resolve to getBlob
    // at display time once the blob is attached to a record.
    await navigator.clipboard.writeText(markdown)
  } catch (err) {
    errorText.value = toUserFacingNetworkError(err)
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function copyMarkdown(asset: MediaAsset) {
  const title = asset.title?.trim()
  const markdown = title ? `![](${asset.fullUrl} "${title}")` : `![](${asset.fullUrl})`
  void navigator.clipboard.writeText(markdown)
}
</script>

<template>
  <section class="media-library card">
    <header class="media-header">
      <h2>Media library</h2>
      <button
        v-if="canEdit && auth.agent"
        type="button"
        class="btn btn-secondary btn-sm"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        {{ uploading ? 'Uploading…' : 'Upload image' }}
      </button>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onUpload" />
    </header>

    <p v-if="errorText" class="error-text">{{ errorText }}</p>
    <p v-if="assets.length === 0" class="muted">No images in this wiki yet.</p>

    <ul v-else class="media-grid">
      <li v-for="asset in assets" :key="asset.fullUrl" class="media-item">
        <img :src="displaySrc(asset.url)" :alt="asset.noteTitle" loading="lazy" decoding="async" />
        <div class="media-meta">
          <span>{{ asset.noteTitle }}</span>
          <button type="button" class="btn btn-ghost btn-sm" @click="copyMarkdown(asset)">
            Copy markdown
          </button>
        </div>
      </li>
    </ul>

    <p v-if="orphans.length > 0" class="muted orphan-note">
      {{ orphans.length }} asset{{ orphans.length === 1 ? '' : 's' }} not referenced in any note.
    </p>
  </section>
</template>

<style scoped>
.media-library {
  padding: 1rem 1.125rem;
  margin-top: 1.25rem;
}

.media-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.media-header h2 {
  margin: 0;
  font-size: 1rem;
}

.media-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.media-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--pckt-radius-sm);
  border: 1px solid var(--pckt-border);
}

.media-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.35rem;
  font-size: 0.75rem;
}

.orphan-note {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
}
</style>
