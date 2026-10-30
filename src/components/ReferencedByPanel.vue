<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { useConstellationReferences } from '@/composables/useConstellationReferences'
import {
  resolveApprovedReferences,
  type NetworkReference,
} from '@/lib/constellation/references'
import { parseNoteContent } from '@/lib/lichen/content-meta'
import { setFrontmatterField } from '@/lib/lichen/frontmatter'
import type { LichenNoteWithContent } from '@/types/lichen'

const props = defineProps<{
  note: LichenNoteWithContent
  ownerHandle: string
  wikiSlug: string
  subjects: string[]
  /** Only an admin may review off-wiki references and publish them. */
  canManage?: boolean
}>()

const auth = useAuthStore()
const lichen = useLichenStore()

const subjectList = computed(() => props.subjects.filter(Boolean))
const approvedUris = computed(() => parseNoteContent(props.note.content).references)

/** What readers see: the approved list, resolved without asking Constellation. */
const approved = shallowRef<NetworkReference[]>([])
watch(
  approvedUris,
  async (uris) => {
    approved.value = uris.length ? await resolveApprovedReferences(uris) : []
  },
  { immediate: true },
)

const reviewing = ref(false)
const saving = ref(false)
const saveError = ref('')
const draft = ref<Set<string>>(new Set())

const { loading, error, references, reload } = useConstellationReferences(subjectList)

/**
 * Candidates an admin has not decided on yet sit alongside the approved ones,
 * so the review list shows the full picture with the published ones ticked.
 */
const candidates = computed(() => {
  const found = references.value
  const foundIds = new Set(found.map((reference) => reference.id))
  const missing = approved.value.filter((reference) => !foundIds.has(reference.id))
  return [...found, ...missing]
})

/** The reader-facing section exists only once something has been published. */
const showReaderSection = computed(() => approved.value.length > 0)

const pendingCount = computed(
  () => candidates.value.filter((reference) => !approvedUris.value.includes(reference.id)).length,
)

function openReview() {
  reviewing.value = true
  saveError.value = ''
  draft.value = new Set(approvedUris.value)
  void reload()
}

function closeReview() {
  reviewing.value = false
  saveError.value = ''
}

function toggle(uri: string) {
  const next = new Set(draft.value)
  if (next.has(uri)) next.delete(uri)
  else next.add(uri)
  draft.value = next
}

async function save() {
  if (!auth.agent) {
    saveError.value = 'Sign in to publish references'
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    const uris = candidates.value
      .map((reference) => reference.id)
      .filter((uri) => draft.value.has(uri))
    const content = setFrontmatterField(
      props.note.content,
      'references',
      uris.length ? `[${uris.join(', ')}]` : null,
    )
    await lichen.queueOrSaveNoteEdit(
      auth.agent,
      props.note,
      props.note.title,
      content,
      'Network references',
      props.ownerHandle,
      props.wikiSlug,
    )
    reviewing.value = false
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save references'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Reader-facing: exists only once an admin has published something. -->
  <section v-if="showReaderSection" class="referenced-by card">
    <h2>Referenced across the network</h2>
    <p class="referenced-by-lead muted">
      Bookmarks and posts elsewhere on AT Protocol that link here, via
      <a href="https://constellation.microcosm.blue/" target="_blank" rel="noopener noreferrer">
        Constellation
      </a>.
    </p>
    <ul>
      <li v-for="reference in approved" :key="reference.id">
        <a
          v-if="reference.href"
          :href="reference.href"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ reference.label }}
        </a>
        <span v-else>{{ reference.label }}</span>
      </li>
    </ul>
  </section>

  <!-- Admin-only, and framed as a feature to reach for: readers never render
       this section at all. -->
  <section v-if="canManage" class="referenced-admin" aria-label="Network references (admin)">
    <div class="admin-head">
      <h2>Show what links here</h2>
      <span class="badge badge-muted">Only you see this</span>
    </div>

    <p class="admin-lead">
      When someone bookmarks this page or links to it from Bluesky, pckt.wiki can find that post
      through
      <a href="https://constellation.microcosm.blue/" target="_blank" rel="noopener noreferrer">
        Constellation
      </a>.
      Pick the ones worth featuring and they'll appear at the foot of the page — it's yours to
      curate, so nothing goes up until you choose it.
    </p>

    <p class="admin-status">
      <template v-if="approved.length">
        You're featuring <strong>{{ approved.length }}</strong>
        {{ approved.length === 1 ? 'reference' : 'references' }} on this page.
      </template>
      <template v-else>
        Nothing featured yet — take a look at what's out there.
      </template>
      <template v-if="reviewing && !loading && pendingCount">
        <br />
        <strong>{{ pendingCount }}</strong>
        {{ pendingCount === 1 ? 'link is' : 'links are' }} waiting for you below.
      </template>
    </p>

    <template v-if="reviewing">
      <p v-if="loading" class="referenced-by-state muted">Checking the network…</p>
      <p v-else-if="error" class="referenced-by-state error-text">{{ error }}</p>
      <p v-else-if="!candidates.length" class="referenced-by-state muted">
        No links here yet. Worth checking again once this page gets around.
      </p>
      <ul v-else class="review-list">
        <li v-for="reference in candidates" :key="reference.id">
          <label>
            <input
              type="checkbox"
              :checked="draft.has(reference.id)"
              @change="toggle(reference.id)"
            />
            <span class="review-label">
              <a
                v-if="reference.href"
                :href="reference.href"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ reference.label }}
              </a>
              <span v-else>{{ reference.label }}</span>
              <span class="review-uri muted">{{ reference.sourceUri }}</span>
            </span>
          </label>
        </li>
      </ul>

      <p v-if="saveError" class="referenced-by-state error-text">{{ saveError }}</p>

      <p v-if="candidates.length" class="review-note muted">
        Tick the ones you'd like on the page. You can change your picks whenever you like.
      </p>

      <div class="review-actions">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="saving || loading"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save picks' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="saving"
          @click="closeReview"
        >
          Cancel
        </button>
      </div>
    </template>

    <div v-else class="review-actions">
      <button type="button" class="btn btn-secondary btn-sm" @click="openReview">
        {{ approved.length ? 'Change what’s featured' : 'See what links here' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.referenced-by {
  margin-top: 1rem;
  padding: 1rem 1.25rem;
}

/* Settled panel chrome, not an alert: the same card as the rest of the page
   with a faint blue wash to mark it as yours rather than the reader's. */
.referenced-admin {
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid color-mix(in srgb, var(--pckt-blue) 22%, var(--pckt-border));
  border-radius: var(--pckt-radius-btn);
  background: color-mix(in srgb, var(--pckt-blue) 4%, var(--pckt-bg-elevated));
}

.admin-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.375rem;
}

.admin-head h2 {
  margin: 0;
}

.admin-lead {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.admin-lead a {
  color: var(--pckt-blue);
}

.admin-status {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

h2 {
  margin: 0 0 0.375rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pckt-text-muted);
}

.referenced-by-lead {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.referenced-by-lead a {
  color: var(--pckt-blue);
}

.referenced-by-state {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
}

li {
  margin: 0.375rem 0;
  font-size: 0.875rem;
}

a {
  color: inherit;
  font-weight: 600;
}

a:hover {
  color: var(--pckt-red);
}

.review-list {
  margin-top: 0.75rem;
  padding-left: 0;
  list-style: none;
}

.review-list label {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  cursor: pointer;
}

.review-list input {
  margin-top: 0.25rem;
}

.review-label {
  display: grid;
  gap: 0.125rem;
}

.review-uri {
  font-family: var(--pckt-font-mono, monospace);
  font-size: 0.6875rem;
  overflow-wrap: anywhere;
}

.review-note {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
}

.review-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

</style>
