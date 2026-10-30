<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 18 })

/** 20×20 stroke paths, drawn with `currentColor`. */
const PATHS: Record<string, string[]> = {
  bullet: ['M3 5h.01M3 10h.01M3 15h.01', 'M7 5h10M7 10h10M7 15h10'],
  numbered: ['M7 5h10M7 10h10M7 15h10', 'M2.5 7V3.5l-1 .7M2 16.5h2M2 13.5h2v3'],
  task: ['M2.5 5.5 4 7l2.5-3', 'M2.5 14.5 4 16l2.5-3', 'M9 5h8M9 14h8'],
  quote: ['M4 4v12', 'M8 6h9M8 10h9M8 14h6'],
  link: [
    'M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1',
    'M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1',
  ],
  wikilink: ['M7 4 4 4v12h3', 'M13 4h3v12h-3', 'M8.5 13 11.5 7'],
  crosslink: [
    'M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z',
    'M2.6 10h14.8M10 2.5c2 2.2 3 4.7 3 7.5s-1 5.3-3 7.5c-2-2.2-3-4.7-3-7.5s1-5.3 3-7.5Z',
  ],
  code: ['m7 6-4 4 4 4', 'm13 6 4 4-4 4'],
  codeblock: ['M3 3.5h14v13H3z', 'm7.5 8-2 2 2 2', 'm12.5 8 2 2-2 2'],
  image: ['M3 4h14v12H3z', 'M3 13l4-4 3 3 3-3 4 4', 'M7.5 7.5h.01'],
  table: ['M3 4h14v12H3z', 'M3 8.5h14M3 12.5h14M8 4v12'],
  divider: ['M3 10h14', 'M5 5h10M5 15h10'],
  infobox: ['M11 4h6v12h-6z', 'M11 8h6', 'M3 5.5h6M3 9h6M3 12.5h5'],
  youtube: ['M2.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z', 'M8.5 8.5v3.5l3-1.75z'],
  category: ['M3.5 3.5h6l7 7-6 6-7-7z', 'M6.5 6.5h.01'],
  preview: ['M1.8 10S4.8 4.5 10 4.5 18.2 10 18.2 10 15.2 15.5 10 15.5 1.8 10 1.8 10Z', 'M10 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z'],
  write: ['M13.5 3.5 16.5 6.5 7 16H4v-3z', 'M11.5 5.5 14.5 8.5'],
  split: ['M3 4h14v12H3z', 'M10 4v12'],
  outline: ['M3 5h4M3 10h4M3 15h4', 'M10 5h7M10 10h7M10 15h7'],
  help: ['M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z', 'M8 7.8a2 2 0 1 1 2.6 1.9c-.4.2-.6.6-.6 1v.6', 'M10 14.2h.01'],
  close: ['m5 5 10 10M15 5 5 15'],
  check: ['m4 10.5 4 4 8-9'],
  chevron: ['m5.5 8 4.5 4.5L14.5 8'],
  more: ['M4.5 10h.01M10 10h.01M15.5 10h.01'],
  undo: ['M7 5 3.5 8.5 7 12', 'M3.5 8.5H12a4.5 4.5 0 0 1 0 9h-2'],
  redo: ['M13 5l3.5 3.5L13 12', 'M16.5 8.5H8a4.5 4.5 0 0 0 0 9h2'],
  upload: ['M10 13.5v-10', 'm6 7 4-4 4 4', 'M3.5 13v3.5h13V13'],
  alignLeft: ['M3 5h6v10H3z', 'M11 7h6', 'M11 10h6', 'M11 13h4'],
  alignCenter: ['M7 5h6v10H7z', 'M3 7h2.5M14.5 7H17', 'M3 10h2.5M14.5 10H17', 'M3 13h2.5M14.5 13H17'],
  alignRight: ['M11 5h6v10h-6z', 'M3 7h6', 'M3 10h6', 'M3 13h4'],
  history: ['M3.2 8.5A7.5 7.5 0 1 1 3 11', 'M3 4.5v4h4', 'M10 6.5V10l2.5 1.5'],
  back: ['M16 10H4', 'm8.5 5.5-4.5 4.5 4.5 4.5'],
  hero: ['M3 3.5h14v9H3z', 'M6 16h8', 'M8 7.5v3l3-1.5z'],
  grid: ['M3 3.5h6v6H3zM11 3.5h6v6h-6zM3 10.5h6v6H3zM11 10.5h6v6h-6z'],
  card: ['M4 3.5h12v13H4z', 'M6 6h8v5H6z', 'M6 13.5h6'],
  posts: ['M3 4.5h8M3 8h8M3 11.5h5', 'M13.5 4.5h3.5v11h-14'],
  post: ['M3 4.5h14v11H3z', 'M6 8h8M6 11.5h5'],
  meter: ['M2.5 8.5h15v3h-15z', 'M2.5 8.5h6v3h-6z'],
  columns: ['M3 4h4v12H3zM8 4h4v12H8zM13 4h4v12h-4z'],
  actions: ['M2.5 7.5h6v5h-6zM11.5 7.5h6v5h-6z'],
  scroller: ['M5.5 5h9v10h-9z', 'M2.5 7v6M17.5 7v6'],
}

const paths = computed(() => PATHS[props.name] ?? [])
</script>

<template>
  <svg
    class="editor-icon"
    :width="size"
    :height="size"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
</template>

<style scoped>
.editor-icon {
  display: block;
  flex-shrink: 0;
}
</style>
