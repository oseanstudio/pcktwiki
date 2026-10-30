<script setup lang="ts">
import type { EditorInsertAction } from '@/lib/editor-insert'

defineProps<{
  action: EditorInsertAction
}>()
</script>

<template>
  <svg
    class="wiki-editor-toolbar-icon"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Heading -->
    <template v-if="action === 'heading'">
      <path
        fill="currentColor"
        d="M2.5 3h2.25v4.25H11.25V3H13.5v10h-2.25V9.25H4.75V13H2.5V3z"
      />
    </template>

    <!-- Sub-heading -->
    <template v-else-if="action === 'subheading'">
      <path
        fill="currentColor"
        d="M2.5 4h2v3.5H10V4h2v9h-2v-3.5H4.5V13h-2V4z"
      />
    </template>

    <!-- Bullets -->
    <template v-else-if="action === 'bullet'">
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
      <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M6 4h7M6 8h7M6 12h7" />
    </template>

    <!-- Numbered -->
    <template v-else-if="action === 'numbered'">
      <path
        fill="currentColor"
        d="M2.2 3.4h1.1v.55h-.55v1.65h-.55V3.4zm0 4.35h.55l-.75 2.25h1.05l.15-.45H2.2V7.75zm0 4.1h1.1v.55H2.2v-.55zm2.8-7.45h7v1.25h-7V4.4zm0 4h7v1.25h-7V8.4zm0 4h7v1.25h-7v-1.25z"
      />
    </template>

    <!-- Quote -->
    <template v-else-if="action === 'quote'">
      <path
        fill="currentColor"
        d="M3.5 4.75c0-1.35.9-2.25 2.25-2.25.35 0 .65.05.9.15-.25.55-.4 1.15-.4 1.8 0 1.45.75 2.55 2.05 3.05l-.55 1.2c-1.75-.55-2.95-2-3.25-3.95zm5.5 0c0-1.35.9-2.25 2.25-2.25.35 0 .65.05.9.15-.25.55-.4 1.15-.4 1.8 0 1.45.75 2.55 2.05 3.05l-.55 1.2c-1.75-.55-2.95-2-3.25-3.95z"
      />
    </template>

    <!-- Wikilink -->
    <template v-else-if="action === 'wikilink'">
      <path
        fill="currentColor"
        d="M3.25 4.5h1.1l1.35 2.2 1.35-2.2h1.1L6.2 8.1l2.15 3.4H7.25L5.9 9.3 4.55 11.5H3.45l2.15-3.4L3.25 4.5zm5.55 0h1.1l1.35 2.2 1.35-2.2h1.1l-2.15 3.6 2.15 3.4h-1.1l-1.35-2.2-1.35 2.2h-1.1l2.15-3.4L8.8 4.5z"
      />
    </template>

    <!-- Fork / cross-wiki -->
    <template v-else-if="action === 'fork'">
      <circle cx="4.5" cy="4" r="1.5" fill="none" stroke="currentColor" stroke-width="1.25" />
      <circle cx="11.5" cy="4" r="1.5" fill="none" stroke="currentColor" stroke-width="1.25" />
      <circle cx="8" cy="12" r="1.5" fill="none" stroke="currentColor" stroke-width="1.25" />
      <path
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        d="M5.7 5.1 7.1 10.2M10.3 5.1 8.9 10.2"
      />
    </template>

    <!-- Category -->
    <template v-else-if="action === 'category'">
      <path
        fill="currentColor"
        d="M2.5 3.75 4.25 2h7.5L13.5 3.75v8.5L11.75 13.5H4.25L2.5 12.25V3.75zm1.6 1.35v7.8h7.8l1.35-1.35V5.1L11.65 3.75H4.1L3.1 4.75v.35z"
      />
      <path fill="currentColor" d="M6 7.25h4v1.25H6V7.25zm0 2.25h2.75v1.25H6V9.5z" />
    </template>

    <!-- Infobox -->
    <template v-else-if="action === 'infobox'">
      <rect
        x="2.5"
        y="3"
        width="11"
        height="10"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path stroke="currentColor" stroke-width="1.25" d="M5.5 3v10M2.5 6.25h11M2.5 9h11" />
    </template>

    <!-- Bold -->
    <template v-else-if="action === 'bold'">
      <path
        fill="currentColor"
        d="M5.25 3h3.15c1.65 0 2.85 1 2.85 2.45 0 .95-.45 1.7-1.2 2.1 1 .35 1.65 1.2 1.65 2.35 0 1.65-1.25 2.7-3.2 2.7H5.25V3zm2.2 3.85h.85c.85 0 1.35-.4 1.35-1.05 0-.65-.5-1.05-1.35-1.05h-.85v2.1zm0 3.95h1c1 0 1.55-.45 1.55-1.15 0-.7-.55-1.15-1.55-1.15h-1v2.3z"
      />
    </template>

    <!-- Italic -->
    <template v-else-if="action === 'italic'">
      <path fill="currentColor" d="M7.25 3h4.75v1.5H10.6l-2.2 8H9.75v1.5H5v-1.5h1.4l2.2-8H7.25V3z" />
    </template>

    <!-- Source -->
    <template v-else-if="action === 'source'">
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M6.25 8.25 4.5 6.5a2.25 2.25 0 1 1 3.18-3.18l.57.57M9.75 7.75l1.75 1.75a2.25 2.25 0 1 1-3.18 3.18l-.57-.57M6.5 9.5l3-3"
      />
    </template>

    <!-- Image -->
    <template v-else-if="action === 'image'">
      <rect
        x="2.25"
        y="3.25"
        width="11.5"
        height="9.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <circle cx="5.75" cy="6.5" r="1.1" fill="currentColor" />
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linejoin="round"
        d="M2.75 11 6 8l2.25 2 2.5-2.75L13.25 11"
      />
    </template>
  </svg>
</template>

<style scoped>
.wiki-editor-toolbar-icon {
  display: block;
}
</style>
