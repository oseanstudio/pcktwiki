<script setup lang="ts">
import type { TocEntry } from '@/lib/toc'

withDefaults(
  defineProps<{
    entries: TocEntry[]
    /** "sidebar" matches the bordered wiki-nav section style; "inline" is the
     *  original card that sat above the article body. */
    variant?: 'inline' | 'sidebar'
  }>(),
  { variant: 'inline' },
)
</script>

<template>
  <nav
    v-if="entries.length >= 2"
    class="toc"
    :class="`toc--${variant}`"
    aria-label="Table of contents"
  >
    <h2 class="toc-title">Contents</h2>
    <ol class="toc-list">
      <li
        v-for="entry in entries"
        :key="entry.id"
        :class="`toc-level-${entry.level}`"
      >
        <a :href="`#${entry.id}`">{{ entry.text }}</a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
/* Inline variant: the original card that sat above the article body. */
.toc--inline {
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--pckt-blue) 6%, var(--pckt-bg-elevated));
}

/* Sidebar variant: matches the bordered wiki-nav section style. */
.toc--sidebar {
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: transparent;
  overflow: hidden;
}

.toc--sidebar .toc-list {
  padding: 0.5rem 0.75rem 0.625rem;
}

.toc-title {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pckt-text-muted);
  font-weight: 700;
}

.toc--inline .toc-title {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
}

.toc--sidebar .toc-title {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--pckt-border);
}

.toc-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.9375rem;
}

.toc-list li {
  margin: 0.35rem 0;
  line-height: 1.3;
}

.toc-level-3 {
  padding-left: 0.75rem;
  font-size: 0.875rem;
}

.toc-list a {
  color: var(--pckt-text);
  text-decoration: none;
}

.toc-list a:hover {
  color: var(--pckt-red);
  text-decoration: underline;
}
</style>
