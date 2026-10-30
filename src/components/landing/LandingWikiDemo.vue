<script setup lang="ts">
import { computed, ref } from 'vue'
import WikiMarkdownEditor from '@/components/WikiMarkdownEditor.vue'
import { extractWikilinks } from '@/lib/lichen/wikilinks'
import { parseNoteContent } from '@/lib/lichen/content-meta'

const DEMO_HANDLE = 'you'
const DEMO_WIKI = 'garden'

const DEFAULT_CONTENT = `# Garden journal

Tomatoes need [[full sun]] — see also [[companion planting]].

From a friend's wiki: [[@friend/garden/harvest]]

[[Category:Garden]]`

const content = ref(DEFAULT_CONTENT)

const parsed = computed(() => parseNoteContent(content.value))
const wikilinks = computed(() => extractWikilinks(parsed.value.body, DEMO_WIKI))

const linkSummary = computed(() => {
  const parts: string[] = []
  if (wikilinks.value.length) {
    parts.push(`${wikilinks.value.length} ${wikilinks.value.length === 1 ? 'link' : 'links'}`)
  }
  if (parsed.value.categories.length) {
    parts.push(
      `${parsed.value.categories.length} ${parsed.value.categories.length === 1 ? 'category' : 'categories'}`,
    )
  }
  return parts.length ? parts.join(' · ') : 'No links yet — try [[brackets]]'
})
</script>

<template>
  <div class="wiki-demo">
    <p class="wiki-demo-lead">
      Type in either panel — the preview keeps its rendered look while you edit. Headings, wikilinks,
      and categories update live as you work.
    </p>

    <div class="wiki-demo-panels">
      <section class="wiki-demo-panel wiki-demo-panel-preview card" aria-live="polite">
        <div class="wiki-demo-bar">
          <span class="wiki-demo-dot" />
          <span class="wiki-demo-dot" />
          <span class="wiki-demo-dot" />
          <span class="wiki-demo-bar-label">a Wiki</span>
        </div>

        <div class="wiki-demo-body">
          <div class="wiki-demo-preview-wrap">
            <WikiMarkdownEditor
              v-model="content"
              class="wiki-demo-preview"
              prose
              borderless
              compact
              auto-grow
              live-rendered
              :owner-handle="DEMO_HANDLE"
              :wiki-slug="DEMO_WIKI"
              aria-describedby="hero-wiki-demo-hints"
            />
          </div>
          <p class="wiki-demo-preview-meta muted">{{ linkSummary }}</p>
        </div>
      </section>

      <section class="wiki-demo-panel wiki-demo-panel-editor card">
        <div class="wiki-demo-bar">
          <span class="wiki-demo-dot" />
          <span class="wiki-demo-dot" />
          <span class="wiki-demo-dot" />
          <span class="wiki-demo-bar-label">Edit a Wiki</span>
        </div>

        <div class="wiki-demo-body">
          <WikiMarkdownEditor
            id="hero-wiki-demo"
            v-model="content"
            class="wiki-demo-editor"
            compact
            auto-grow
            aria-describedby="hero-wiki-demo-hints"
          />

          <ul id="hero-wiki-demo-hints" class="wiki-demo-hints">
            <li>Select text, then tap a button to wrap or format it.</li>
            <li>Fork links to articles on someone else's wiki across the network.</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.wiki-demo {
  text-align: left;
}

.wiki-demo-lead {
  margin: 0 0 1rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.wiki-demo-lead code {
  font-family: var(--pckt-font-mono);
  font-size: 0.875em;
  color: var(--pckt-red);
  font-weight: 600;
}

.wiki-demo-panels {
  display: grid;
  gap: 1rem;
  align-items: stretch;
}

@media (min-width: 768px) {
  .wiki-demo-panels {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.wiki-demo-panel {
  overflow: hidden;
  padding: 0;
  min-width: 0;
}

.wiki-demo-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 1rem;
  background: var(--pckt-bg-muted);
  border-bottom: 1px solid var(--pckt-border);
}

.wiki-demo-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--pckt-border-strong);
  flex-shrink: 0;
}

.wiki-demo-bar-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 4rem);
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--pckt-text-muted);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.wiki-demo-body {
  padding: 1rem 1.125rem 1.125rem;
}

.wiki-demo-editor {
  margin-bottom: 1rem;
}

.wiki-demo-preview-meta {
  margin: 0.375rem 0 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  line-height: 1.45;
}

.wiki-demo-preview-wrap {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
}

.wiki-demo-preview {
  min-height: 11rem;
}

.wiki-demo-preview :deep(.cm-editor) {
  font-size: 0.9375rem;
  line-height: 1.55;
}

.wiki-demo-preview :deep(.sd-h1) {
  font-size: 1.0625rem;
}

.wiki-demo-hints {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.375rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--pckt-text-muted);
}

.wiki-demo-hints code {
  font-family: var(--pckt-font-mono);
  font-size: 0.875em;
  color: var(--pckt-text);
}
</style>
