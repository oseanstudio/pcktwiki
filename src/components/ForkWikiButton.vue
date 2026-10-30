<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { findForkOfSource } from '@/lib/lichen/fork'
import { toUserFacingNetworkError } from '@/lib/http-retry'

const props = defineProps<{
  sourceName: string
  sourceHandle: string
  sourceSlug: string
  sourceWikiUri: string
  /** Whether the source wiki is publicly visible. */
  sourceIsPublic?: boolean
  /** True when the viewer can already edit the source (their own wiki). */
  isOwnWiki?: boolean
}>()

const auth = useAuthStore()
const lichen = useLichenStore()
const router = useRouter()

const open = ref(false)
const name = ref('')
const autoSync = ref(true)
const visibility = ref<'public' | 'private'>('public')
const errorText = ref<string | null>(null)

const existingFork = computed(() => findForkOfSource(props.sourceWikiUri))
const forkLabel = computed(() => (props.isOwnWiki ? 'Duplicate' : 'Fork'))

const progressLabel = computed(() => {
  const progress = lichen.forkProgress
  if (!progress) return 'Forking…'
  if (progress.phase === 'wiki') return 'Creating wiki…'
  if (progress.phase === 'notes') return `Copying notes… ${progress.done}/${progress.total}`
  return 'Finishing…'
})

function openDialog() {
  name.value = props.isOwnWiki ? `${props.sourceName} copy` : props.sourceName
  autoSync.value = true
  // Default to the source's visibility so a private wiki is never republished
  // by accident.
  visibility.value = props.sourceIsPublic === false ? 'private' : 'public'
  errorText.value = null
  open.value = true
}

function goToExistingFork() {
  if (!existingFork.value) return
  router.push(`/@${existingFork.value.forkHandle}/${existingFork.value.forkSlug}`)
}

async function submit() {
  if (!auth.agent || !auth.handle) return
  errorText.value = null
  try {
    const wiki = await lichen.forkCurrentWiki(auth.agent, {
      name: name.value,
      autoSync: autoSync.value,
      forkHandle: auth.handle,
      visibility: visibility.value,
    })
    open.value = false
    router.push(`/@${auth.handle}/${wiki.slug}`)
  } catch (err) {
    errorText.value = toUserFacingNetworkError(err)
  }
}
</script>

<template>
  <button
    v-if="existingFork"
    type="button"
    class="btn btn-ghost btn-sm"
    @click="goToExistingFork"
  >
    Your fork
  </button>
  <button v-else type="button" class="btn btn-secondary btn-sm" @click="openDialog">
    {{ forkLabel }}
  </button>

  <div v-if="open" class="fork-dialog-backdrop" @click.self="open = false">
    <div class="fork-dialog card" role="dialog" aria-modal="true" aria-labelledby="fork-title">
      <h2 id="fork-title">{{ isOwnWiki ? 'Duplicate this wiki' : 'Fork this wiki' }}</h2>
      <p class="muted">
        Copies <code>@{{ sourceHandle }}/{{ sourceSlug }}</code> and all its notes to your
        account as an editable wiki you control.
      </p>
      <p v-if="sourceIsPublic === false" class="fork-warning">
        This wiki is unlisted. Your copy starts unlisted too — making it public would
        list every page in it.
      </p>

      <div class="field">
        <label class="label" for="fork-name">Name your fork</label>
        <input id="fork-name" v-model="name" class="input" type="text" :disabled="lichen.forking" />
      </div>

      <div class="field">
        <label class="label" for="fork-visibility">Visibility</label>
        <select
          id="fork-visibility"
          v-model="visibility"
          class="input"
          :disabled="lichen.forking"
        >
          <option value="private">Unlisted — hidden in the app, not secret</option>
          <option value="public">Public — listed and readable by anyone</option>
        </select>
      </div>

      <label v-if="!isOwnWiki" class="fork-checkbox">
        <input v-model="autoSync" type="checkbox" :disabled="lichen.forking" />
        <span>
          Auto-apply non-conflicting upstream changes when checking for updates
          <small class="muted">Conflicting edits always wait for your review.</small>
        </span>
      </label>

      <p v-if="errorText" class="error-text">{{ errorText }}</p>

      <div v-if="lichen.forking" class="fork-progress muted">{{ progressLabel }}</div>

      <div class="fork-actions">
        <button type="button" class="btn btn-ghost btn-sm" :disabled="lichen.forking" @click="open = false">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="lichen.forking || !name.trim()"
          @click="submit"
        >
          {{ lichen.forking ? 'Forking…' : 'Create fork' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fork-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--pckt-bg) 35%, rgba(0, 0, 0, 0.55));
}

.fork-dialog {
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.25rem;
}

.fork-dialog h2 {
  margin: 0;
  font-family: var(--pckt-font-content);
  font-size: 1.125rem;
}

.fork-dialog p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.fork-checkbox {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.875rem;
  line-height: 1.4;
}

.fork-checkbox small {
  display: block;
}

.fork-warning {
  padding: 0.5rem 0.625rem;
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-accent-soft);
  color: var(--pckt-text);
  font-size: 0.8125rem;
}

.fork-progress {
  font-size: 0.875rem;
}

.fork-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

code {
  font-family: var(--pckt-font-mono);
  font-size: 0.8125em;
}
</style>
