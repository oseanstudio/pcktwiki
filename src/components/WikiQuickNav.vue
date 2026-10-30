<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { LichenNoteWithContent } from '@/types/lichen'
import WikiSearch from '@/components/WikiSearch.vue'
import { extractTocFromMarkdown } from '@/lib/toc'
import { parseNoteContent } from '@/lib/lichen/content-meta'
import { orderNotesForSidebar, noteNavLabel } from '@/lib/lichen/sidebar-order'
import { useOverlayDismiss } from '@/composables/useOverlayDismiss'

const props = defineProps<{
  open: boolean
  note: LichenNoteWithContent
  notes: LichenNoteWithContent[]
  ownerHandle: string
  wikiSlug: string
  sidebarOrder?: string[]
}>()

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const panelRef = ref<HTMLElement | null>(null)
const openRef = computed(() => props.open)

useOverlayDismiss(panelRef, openRef, () => emit('close'))

const basePath = computed(
  () => `/@${encodeURIComponent(props.ownerHandle)}/${encodeURIComponent(props.wikiSlug)}`,
)

/** Headings of the page currently open, for jumping within it. */
const sections = computed(() =>
  extractTocFromMarkdown(parseNoteContent(props.note.content).body),
)

/**
 * Same rule as the sidebar: one entry per slug, articles only, custom order when set.
 */
const pages = computed(() => orderNotesForSidebar(props.notes, props.sidebarOrder))

/** Anchor jumps do not change the route, so close the panel explicitly. */
function goToSection(id: string) {
  emit('close')
  void nextTick(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function goToPage(slug: string) {
  emit('close')
  void router.push(`${basePath.value}/${slug}`)
}

// Landing on a different page makes this panel's section list stale.
watch(() => props.note.slug, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="quick-nav-scrim">
      <div
        ref="panelRef"
        class="quick-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Wiki navigation"
      >
        <header class="quick-nav-bar">
          <span class="quick-nav-kicker">Go to</span>
          <button type="button" class="btn btn-ghost btn-sm" @click="emit('close')">
            Close
          </button>
        </header>

        <div class="quick-nav-body">
          <WikiSearch :notes="notes" :owner-handle="ownerHandle" :wiki-slug="wikiSlug" />

          <section v-if="sections.length" class="quick-nav-section">
            <h2 class="quick-nav-heading">On this page</h2>
            <ul class="quick-nav-list">
              <li
                v-for="entry in sections"
                :key="entry.id"
                :class="`quick-nav-level-${entry.level}`"
              >
                <button type="button" class="quick-nav-link" @click="goToSection(entry.id)">
                  {{ entry.text }}
                </button>
              </li>
            </ul>
          </section>

          <section class="quick-nav-section">
            <h2 class="quick-nav-heading">Pages</h2>
            <ul class="quick-nav-list">
              <li v-for="page in pages" :key="page.uri">
                <button
                  type="button"
                  class="quick-nav-link"
                  :class="{ 'is-current': page.slug === note.slug }"
                  @click="goToPage(page.slug)"
                >
                  {{ noteNavLabel(page) }}
                </button>
              </li>
            </ul>
          </section>

          <section class="quick-nav-section">
            <h2 class="quick-nav-heading">Tools</h2>
            <ul class="quick-nav-list">
              <li>
                <RouterLink
                  class="quick-nav-link"
                  :to="`${basePath}/recent`"
                  @click="emit('close')"
                >
                  Recent changes
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  class="quick-nav-link"
                  :to="`${basePath}/search`"
                  @click="emit('close')"
                >
                  Full search
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.quick-nav-scrim {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: flex-start;
  background: color-mix(in srgb, var(--pckt-text) 32%, transparent);
}

.quick-nav {
  display: flex;
  flex-direction: column;
  width: min(22rem, 88vw);
  max-height: 100dvh;
  background: var(--pckt-bg-elevated);
  border-right: 1px solid var(--pckt-border);
  box-shadow: 0 0 40px rgba(17, 24, 39, 0.28);
}

.quick-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--pckt-border);
}

.quick-nav-kicker {
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pckt-accent);
}

.quick-nav-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
  overflow-y: auto;
}

.quick-nav-section {
  min-width: 0;
}

.quick-nav-heading {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pckt-text-subtle);
}

.quick-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.quick-nav-link {
  display: block;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: var(--pckt-radius-btn);
  background: transparent;
  color: var(--pckt-text);
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.quick-nav-link:hover,
.quick-nav-link:focus-visible {
  background: var(--pckt-bg-muted);
  text-decoration: none;
  outline: none;
}

.quick-nav-link.is-current {
  color: var(--pckt-accent);
  background: var(--pckt-accent-soft);
  font-weight: 700;
}

.quick-nav-level-3 {
  padding-left: 0.875rem;
  font-size: 0.875rem;
}
</style>
