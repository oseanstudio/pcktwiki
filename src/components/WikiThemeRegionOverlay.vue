<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { ThemeRegion } from '@/types/lichen'
import {
  ACCENT_PRESETS,
  SURFACE_PRESETS,
  THEME_REGION_FIELDS,
  THEME_REGION_LABELS,
} from '@/types/lichen'
import { THEME_PRESETS } from '@/data/theme-presets'
import { useWikiThemeMode } from '@/composables/useWikiThemeMode'
import { useLichenStore } from '@/stores/lichen'
import ThemeColorField from '@/components/ThemeColorField.vue'
import {
  loadCustomPalettes,
  nextCustomPaletteName,
  removeCustomPalette,
  saveCustomPalette,
  type CustomPalette,
} from '@/lib/custom-palettes'
import {
  copyThemeMarkdown,
  downloadThemePack,
  importThemePack,
  packToTheme,
  themeToPack,
  type ThemePack,
} from '@/types/theme-pack'

type HitId = 'bg' | 'header' | 'sidebarStart' | 'sidebarEnd' | 'card' | 'accent'

const themeMode = useWikiThemeMode()
const lichen = useLichenStore()

const popoverStyle = ref<Record<string, string>>({})
const shareStatus = ref('')
const pasteOpen = ref(false)
const pasteText = ref('')
const customPalettes = ref<CustomPalette[]>(loadCustomPalettes())
const newPaletteOpen = ref(false)
const newPaletteName = ref('')

const { applyTheme } = themeMode

const allPalettes = computed(() => [...THEME_PRESETS, ...customPalettes.value])

function isCustomPack(pack: ThemePack): pack is CustomPalette {
  return 'id' in pack && typeof (pack as CustomPalette).id === 'string'
}

const REGION_SELECTORS: Record<ThemeRegion, string> = {
  bg: '.wiki-view',
  card: '.page-content',
  sidebar: '.wiki-sidebar-start, .wiki-sidebar-end',
  header: '.app-header',
  accent: '.page-content, .wiki-main',
}

const hitStyle = reactive<Record<HitId, Record<string, string>>>({
  bg: {},
  header: {},
  sidebarStart: {},
  sidebarEnd: {},
  card: {},
  accent: {},
})

const hitVisible = reactive<Record<HitId, boolean>>({
  bg: false,
  header: true,
  sidebarStart: false,
  sidebarEnd: false,
  card: false,
  accent: false,
})

const currentColor = computed({
  get() {
    const region = themeMode.selectedRegion.value
    if (!region) return '#ff5d5b'
    const field = THEME_REGION_FIELDS[region]
    return (themeMode.draft.value[field] as string | undefined) ?? defaultForRegion(region)
  },
  set(value: string) {
    const region = themeMode.selectedRegion.value
    if (!region) return
    themeMode.setRegionColor(region, value)
  },
})

const swatches = computed(() => {
  const region = themeMode.selectedRegion.value
  if (region === 'accent') return [...ACCENT_PRESETS]
  return [...SURFACE_PRESETS, ...ACCENT_PRESETS]
})

function defaultForRegion(region: ThemeRegion): string {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  switch (region) {
    case 'bg':
      return dark ? '#111827' : '#f9fafb'
    case 'card':
      return dark ? '#1f2937' : '#ffffff'
    case 'sidebar':
      return dark ? '#1f2937' : '#f3f4f6'
    case 'header':
      return dark ? '#111827' : '#f9fafb'
    case 'accent':
      return '#ff5d5b'
  }
}

function sameHex(a?: string, b?: string): boolean {
  return (a ?? '').toLowerCase() === (b ?? '').toLowerCase()
}

function applyPalette(pack: ThemePack) {
  const region = themeMode.selectedRegion.value
  if (region) {
    const color = colorForRegion(pack, region)
    if (color) themeMode.setRegionColor(region, color)
    return
  }
  applyTheme(packToTheme(pack, themeMode.draft.value, { colorsOnly: true }))
}

function colorForRegion(pack: ThemePack, region: ThemeRegion): string | undefined {
  switch (region) {
    case 'accent':
      return pack.accent
    case 'bg':
      return pack.bg
    case 'card':
      return pack.card ?? pack.bg
    case 'sidebar':
      return pack.sidebar ?? pack.bg
    case 'header':
      return pack.header ?? pack.bg
  }
}

function openNewPalette() {
  newPaletteName.value = nextCustomPaletteName(customPalettes.value)
  newPaletteOpen.value = true
  pasteOpen.value = false
  void nextTick(() => {
    const input = document.getElementById('theme-new-palette-name')
    if (input instanceof HTMLInputElement) {
      input.focus()
      input.select()
    }
  })
}

function cancelNewPalette() {
  newPaletteOpen.value = false
  newPaletteName.value = ''
}

function saveNewPalette() {
  const draft = themeMode.draft.value
  const name = newPaletteName.value.trim() || nextCustomPaletteName(customPalettes.value)
  const pack = themeToPack(
    {
      ...draft,
      accentColor: draft.accentColor ?? '#ff5d5b',
      bgColor: draft.bgColor ?? defaultForRegion('bg'),
      cardColor: draft.cardColor ?? defaultForRegion('card'),
      sidebarColor: draft.sidebarColor ?? defaultForRegion('sidebar'),
      headerColor: draft.headerColor ?? defaultForRegion('header'),
    },
    name,
  )
  const saved = saveCustomPalette(pack)
  customPalettes.value = loadCustomPalettes()
  applyPalette(saved)
  cancelNewPalette()
  shareStatus.value = 'Palette saved'
  window.setTimeout(() => {
    if (shareStatus.value === 'Palette saved') shareStatus.value = ''
  }, 1800)
}

function deleteCustomPalette(pack: CustomPalette, event: Event) {
  event.preventDefault()
  event.stopPropagation()
  customPalettes.value = removeCustomPalette(pack.id)
}

function isPaletteActive(pack: ThemePack): boolean {
  const draft = themeMode.draft.value
  const region = themeMode.selectedRegion.value
  if (region) {
    const field = THEME_REGION_FIELDS[region]
    const current = (draft[field] as string | undefined) ?? defaultForRegion(region)
    return sameHex(current, colorForRegion(pack, region))
  }
  return (
    sameHex(draft.accentColor, pack.accent) &&
    sameHex(draft.bgColor, pack.bg) &&
    sameHex(draft.cardColor, pack.card) &&
    sameHex(draft.sidebarColor, pack.sidebar) &&
    sameHex(draft.headerColor, pack.header)
  )
}

function themeName(): string {
  return lichen.currentWiki?.name
    ? `${lichen.currentWiki.name} theme`
    : 'Custom theme'
}

function currentPack() {
  return themeToPack(themeMode.draft.value, themeName())
}

function applyImportedPack(raw: string) {
  const pack = importThemePack(raw)
  applyTheme(packToTheme(pack, themeMode.draft.value))
  shareStatus.value = `Applied “${pack.name}”`
  window.setTimeout(() => {
    if (shareStatus.value.startsWith('Applied')) shareStatus.value = ''
  }, 2000)
}

async function copyTheme() {
  try {
    await copyThemeMarkdown(currentPack())
    shareStatus.value = 'Copied markdown'
    window.setTimeout(() => {
      if (shareStatus.value === 'Copied markdown') shareStatus.value = ''
    }, 2000)
  } catch {
    shareStatus.value = 'Copy failed'
  }
}

function downloadTheme() {
  downloadThemePack(currentPack())
  shareStatus.value = 'Downloaded .md'
  window.setTimeout(() => {
    if (shareStatus.value === 'Downloaded .md') shareStatus.value = ''
  }, 2000)
}

function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      applyImportedPack(String(reader.result))
    } catch {
      shareStatus.value = 'Invalid theme file'
    }
  }
  reader.readAsText(file)
}

function applyPaste() {
  try {
    applyImportedPack(pasteText.value)
    pasteOpen.value = false
    pasteText.value = ''
  } catch {
    shareStatus.value = 'Invalid theme markdown'
  }
}

function isUsableRect(rect: DOMRect): boolean {
  return rect.width > 2 && rect.height > 2
}

function boxFromRect(rect: DOMRect): Record<string, string> {
  return {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
}

function queryEl(selector: string): HTMLElement | null {
  const el = document.querySelector(selector)
  return el instanceof HTMLElement ? el : null
}

function syncHits() {
  const wiki = queryEl('.wiki-view')
  const header = queryEl('.app-header')
  const card = queryEl('.page-content') ?? queryEl('.wiki-main')
  const sideStart = queryEl('.wiki-sidebar-start')
  const sideEnd = queryEl('.wiki-sidebar-end')

  if (wiki) {
    const rect = wiki.getBoundingClientRect()
    hitVisible.bg = isUsableRect(rect)
    hitStyle.bg = boxFromRect(rect)
  } else {
    hitVisible.bg = false
  }

  if (header) {
    const rect = header.getBoundingClientRect()
    hitVisible.header = isUsableRect(rect)
    hitStyle.header = {
      top: `${Math.max(8, rect.top + 8)}px`,
      left: `${rect.left + 12}px`,
    }
  } else {
    hitVisible.header = false
  }

  if (sideStart) {
    const rect = sideStart.getBoundingClientRect()
    const visible = isUsableRect(rect) && getComputedStyle(sideStart).display !== 'none'
    hitVisible.sidebarStart = visible
    if (visible) hitStyle.sidebarStart = boxFromRect(rect)
  } else {
    hitVisible.sidebarStart = false
  }

  if (sideEnd) {
    const rect = sideEnd.getBoundingClientRect()
    const visible = isUsableRect(rect) && getComputedStyle(sideEnd).display !== 'none'
    hitVisible.sidebarEnd = visible
    if (visible) hitStyle.sidebarEnd = boxFromRect(rect)
  } else {
    hitVisible.sidebarEnd = false
  }

  if (card) {
    const rect = card.getBoundingClientRect()
    hitVisible.card = isUsableRect(rect)
    hitStyle.card = boxFromRect(rect)
    hitVisible.accent = hitVisible.card
    hitStyle.accent = {
      top: `${Math.max(8, rect.top + 8)}px`,
      left: `${Math.max(8, rect.right - 88)}px`,
    }
  } else {
    hitVisible.card = false
    hitVisible.accent = false
  }

  const region = themeMode.selectedRegion.value
  if (region) positionPopover(region)
}

function positionPopover(region: ThemeRegion) {
  const el = document.querySelector(REGION_SELECTORS[region])
  if (!(el instanceof HTMLElement)) {
    popoverStyle.value = { top: '5rem', left: '50%', transform: 'translateX(-50%)' }
    return
  }
  const rect = el.getBoundingClientRect()
  const left = Math.min(Math.max(16, rect.left + Math.min(rect.width, 280) / 2), window.innerWidth - 16)
  const top = Math.min(Math.max(72, rect.top + 24), window.innerHeight - 300)
  popoverStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    transform: 'translateX(-50%)',
  }
}

function onRegionClick(region: ThemeRegion, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  themeMode.selectRegion(region)
  void nextTick(() => positionPopover(region))
}

function onReset() {
  const region = themeMode.selectedRegion.value
  if (!region) return
  themeMode.resetRegion(region)
}

function onDocClick(event: MouseEvent) {
  if (!themeMode.selectedRegion.value) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.wiki-theme-popover')) return
  if (target.closest('[data-theme-hit]')) return
  if (target.closest('.theme-toolbar')) return
  if (target.closest('.theme-paste-panel')) return
  themeMode.selectRegion(null)
}

let raf = 0
function scheduleSync() {
  if (raf) return
  raf = window.requestAnimationFrame(() => {
    raf = 0
    syncHits()
  })
}

watch(
  () => themeMode.selectedRegion.value,
  (region) => {
    if (region) void nextTick(() => positionPopover(region))
  },
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  document.addEventListener('click', onDocClick, true)
  window.addEventListener('scroll', scheduleSync, true)
  window.addEventListener('resize', scheduleSync)
  syncHits()
  const wiki = queryEl('.wiki-view')
  if (wiki && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleSync)
    resizeObserver.observe(wiki)
    const card = queryEl('.page-content')
    if (card) resizeObserver.observe(card)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick, true)
  window.removeEventListener('scroll', scheduleSync, true)
  window.removeEventListener('resize', scheduleSync)
  resizeObserver?.disconnect()
  if (raf) window.cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="wiki-theme-overlay" aria-label="Theme regions">
    <div class="theme-toolbar" @click.stop>
      <div class="theme-palette-row" role="group" aria-label="Color palettes">
        <div
          v-for="pack in allPalettes"
          :key="isCustomPack(pack) ? pack.id : pack.name"
          class="theme-palette-item"
        >
          <button
            type="button"
            class="theme-palette-chip"
            :class="{ active: isPaletteActive(pack) }"
            :title="pack.name"
            :aria-label="pack.name"
            :aria-pressed="isPaletteActive(pack)"
            @click="applyPalette(pack)"
          >
            <span class="theme-palette-swatch" aria-hidden="true">
              <span class="theme-palette-band" :style="{ background: pack.bg ?? '#f9fafb' }" />
              <span class="theme-palette-band" :style="{ background: pack.card ?? '#fff' }" />
              <span class="theme-palette-band" :style="{ background: pack.accent }" />
            </span>
          </button>
          <button
            v-if="isCustomPack(pack)"
            type="button"
            class="theme-palette-remove"
            :title="`Remove ${pack.name}`"
            :aria-label="`Remove ${pack.name}`"
            @click="deleteCustomPalette(pack, $event)"
          >
            ×
          </button>
        </div>
        <button
          type="button"
          class="theme-palette-add"
          title="Save current colors as a new palette"
          aria-label="Add custom palette"
          @click="openNewPalette"
        >
          +
        </button>
      </div>
      <div v-if="newPaletteOpen" class="theme-new-palette" @click.stop>
        <input
          id="theme-new-palette-name"
          v-model="newPaletteName"
          class="theme-new-palette-input"
          type="text"
          maxlength="40"
          placeholder="Palette name"
          aria-label="New palette name"
          @keydown.enter.prevent="saveNewPalette"
          @keydown.escape.prevent="cancelNewPalette"
        />
        <button type="button" class="btn btn-primary btn-sm" @click="saveNewPalette">Save</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="cancelNewPalette">Cancel</button>
      </div>
      <div class="theme-toolbar-actions">
        <button type="button" class="btn btn-ghost btn-sm" @click="themeMode.resetToDefault()">
          Reset to default
        </button>
        <button type="button" class="btn btn-ghost btn-sm" @click="copyTheme">Copy</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="downloadTheme">.md</button>
        <label class="btn btn-ghost btn-sm theme-share-import">
          Import
          <input
            type="file"
            accept="text/markdown,.md,application/json,.json,.pckt-theme.md,.pckt-theme.json"
            hidden
            @change="onImportFile"
          />
        </label>
        <button type="button" class="btn btn-ghost btn-sm" @click="pasteOpen = !pasteOpen">
          Paste
        </button>
        <span v-if="shareStatus" class="theme-share-status">{{ shareStatus }}</span>
      </div>
    </div>

    <div v-if="pasteOpen" class="theme-paste-panel" @click.stop>
      <textarea
        v-model="pasteText"
        class="theme-paste-input"
        rows="7"
        placeholder="Paste a ```pckt-theme block or full .md theme card"
      />
      <div class="theme-paste-actions">
        <button type="button" class="btn btn-primary btn-sm" @click="applyPaste">Apply</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="pasteOpen = false">Close</button>
      </div>
    </div>

    <button
      v-show="hitVisible.bg"
      type="button"
      class="theme-hit theme-hit-bg"
      :class="{ selected: themeMode.selectedRegion.value === 'bg' }"
      data-theme-hit="bg"
      title="Page background"
      :aria-pressed="themeMode.selectedRegion.value === 'bg'"
      :style="hitStyle.bg"
      @click="onRegionClick('bg', $event)"
    >
      <span class="theme-hit-label">Background</span>
    </button>

    <button
      v-show="hitVisible.header"
      type="button"
      class="theme-hit theme-hit-chip theme-hit-header"
      :class="{ selected: themeMode.selectedRegion.value === 'header' }"
      data-theme-hit="header"
      title="Header / nav"
      :aria-pressed="themeMode.selectedRegion.value === 'header'"
      :style="hitStyle.header"
      @click="onRegionClick('header', $event)"
    >
      <span class="theme-hit-label">Header</span>
    </button>

    <button
      v-show="hitVisible.sidebarStart"
      type="button"
      class="theme-hit theme-hit-sidebar"
      :class="{ selected: themeMode.selectedRegion.value === 'sidebar' }"
      data-theme-hit="sidebar"
      title="Sidebars"
      :aria-pressed="themeMode.selectedRegion.value === 'sidebar'"
      :style="hitStyle.sidebarStart"
      @click="onRegionClick('sidebar', $event)"
    >
      <span class="theme-hit-label">Sidebar</span>
    </button>

    <button
      v-show="hitVisible.sidebarEnd"
      type="button"
      class="theme-hit theme-hit-sidebar"
      :class="{ selected: themeMode.selectedRegion.value === 'sidebar' }"
      data-theme-hit="sidebar"
      title="Sidebars"
      :aria-pressed="themeMode.selectedRegion.value === 'sidebar'"
      :style="hitStyle.sidebarEnd"
      @click="onRegionClick('sidebar', $event)"
    >
      <span class="theme-hit-label">Sidebar</span>
    </button>

    <button
      v-show="hitVisible.card"
      type="button"
      class="theme-hit theme-hit-card"
      :class="{ selected: themeMode.selectedRegion.value === 'card' }"
      data-theme-hit="card"
      title="Article card"
      :aria-pressed="themeMode.selectedRegion.value === 'card'"
      :style="hitStyle.card"
      @click="onRegionClick('card', $event)"
    >
      <span class="theme-hit-label">Article</span>
    </button>

    <button
      v-show="hitVisible.accent"
      type="button"
      class="theme-hit theme-hit-chip theme-hit-accent"
      :class="{ selected: themeMode.selectedRegion.value === 'accent' }"
      data-theme-hit="accent"
      data-theme-region="accent"
      title="Accent / links"
      :aria-pressed="themeMode.selectedRegion.value === 'accent'"
      :style="hitStyle.accent"
      @click="onRegionClick('accent', $event)"
    >
      <span class="theme-hit-label">Accent</span>
    </button>

    <div
      v-if="themeMode.selectedRegion.value"
      class="wiki-theme-popover"
      :style="popoverStyle"
      role="dialog"
      :aria-label="`Color for ${THEME_REGION_LABELS[themeMode.selectedRegion.value]}`"
      @click.stop
    >
      <p class="wiki-theme-popover-title">
        {{ THEME_REGION_LABELS[themeMode.selectedRegion.value] }}
      </p>
      <p class="wiki-theme-popover-hint">Changes only this section</p>
      <ThemeColorField
        v-model="currentColor"
        :swatches="swatches"
        :label="THEME_REGION_LABELS[themeMode.selectedRegion.value]"
        :id="`theme-region-${themeMode.selectedRegion.value}`"
      />
      <div class="wiki-theme-popover-row">
        <button type="button" class="btn btn-ghost btn-sm" @click="onReset">Reset</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wiki-theme-overlay {
  pointer-events: none;
}

.theme-toolbar,
.theme-paste-panel {
  pointer-events: auto;
  position: fixed;
  z-index: 55;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md);
}

.theme-toolbar {
  top: 4.15rem;
  max-width: calc(100vw - 1.5rem);
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
}

.theme-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.theme-palette-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.theme-palette-item {
  position: relative;
  display: inline-flex;
}

.theme-palette-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0.15rem;
  width: 1.65rem;
  height: 1.65rem;
  border: 1px solid var(--pckt-border);
  border-radius: 0.35rem;
  background: var(--pckt-bg);
  cursor: pointer;
}

.theme-palette-chip:hover,
.theme-palette-chip:focus-visible {
  border-color: var(--pckt-accent);
}

.theme-palette-chip.active {
  border-color: var(--pckt-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--pckt-accent) 40%, transparent);
}

.theme-palette-swatch {
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  width: 100%;
  height: 100%;
  border-radius: 0.2rem;
  overflow: hidden;
}

.theme-palette-band {
  display: block;
  min-height: 0;
}

.theme-palette-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  width: 1.65rem;
  height: 1.65rem;
  border: 1px dashed var(--pckt-border);
  border-radius: 0.35rem;
  background: transparent;
  color: var(--pckt-text-muted);
  font-family: var(--pckt-font-ui);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.theme-palette-add:hover,
.theme-palette-add:focus-visible {
  border-color: var(--pckt-accent);
  color: var(--pckt-accent);
}

.theme-palette-remove {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  display: none;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  width: 0.95rem;
  height: 0.95rem;
  border: 1px solid var(--pckt-border);
  border-radius: 999px;
  background: var(--pckt-bg-elevated);
  color: var(--pckt-text-muted);
  font-size: 0.7rem;
  line-height: 1;
  cursor: pointer;
}

.theme-palette-item:hover .theme-palette-remove,
.theme-palette-item:focus-within .theme-palette-remove {
  display: inline-flex;
}

.theme-palette-remove:hover,
.theme-palette-remove:focus-visible {
  color: var(--pckt-text);
  border-color: var(--pckt-text-muted);
}

.theme-new-palette {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.theme-new-palette-input {
  flex: 1 1 8rem;
  min-width: 0;
  box-sizing: border-box;
  height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg);
  color: var(--pckt-text);
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
}

.theme-new-palette-input:focus {
  outline: 2px solid var(--pckt-blue);
  outline-offset: 1px;
  border-color: transparent;
}

.theme-share-status {
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  color: var(--pckt-text-muted);
}

.theme-share-import {
  cursor: pointer;
}

.theme-paste-panel {
  top: 8.35rem;
  flex-direction: column;
  align-items: stretch;
  width: min(28rem, calc(100vw - 1.5rem));
  padding: 0.65rem;
}

.theme-paste-input {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0.5rem;
  border: 1px solid var(--pckt-border);
  border-radius: 4px;
  background: var(--pckt-bg);
  color: var(--pckt-text);
  font-family: var(--pckt-font-mono);
  font-size: 0.75rem;
  line-height: 1.4;
  resize: vertical;
}

.theme-paste-actions {
  display: flex;
  gap: 0.35rem;
}

.theme-hit {
  pointer-events: auto;
  position: fixed;
  z-index: 40;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--pckt-radius-sm);
  background: transparent;
  outline: var(--pckt-edit-dash);
  outline-offset: var(--pckt-edit-dash-offset);
  cursor: pointer;
  color: var(--pckt-text);
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  transition: outline-color 0.12s ease;
}

.theme-hit:hover,
.theme-hit:focus-visible {
  background: transparent;
  outline: var(--pckt-edit-dash-strong);
  outline-offset: var(--pckt-edit-dash-offset);
}

.theme-hit.selected {
  outline: var(--pckt-edit-dash-strong);
  outline-offset: var(--pckt-edit-dash-offset);
  background: color-mix(in srgb, var(--pckt-accent) 8%, transparent);
}

.theme-hit-label {
  position: absolute;
  top: 0.35rem;
  left: 0.5rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-xs);
  pointer-events: none;
}

.theme-hit-bg {
  z-index: 38;
}

.theme-hit-sidebar {
  z-index: 41;
}

.theme-hit-card {
  z-index: 42;
}

.theme-hit-chip {
  width: auto;
  height: auto;
  padding: 0.55rem 0.85rem;
  z-index: 46;
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-xs);
}

.theme-hit-chip:hover,
.theme-hit-chip:focus-visible {
  background: var(--pckt-bg-elevated);
}

.theme-hit-chip.selected {
  background: var(--pckt-bg-elevated);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pckt-accent) 45%, transparent);
}

.theme-hit-chip .theme-hit-label {
  position: static;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.theme-hit-accent .theme-hit-label {
  color: var(--pckt-accent);
}

.wiki-theme-popover {
  pointer-events: auto;
  position: fixed;
  z-index: 60;
  width: min(17rem, calc(100vw - 2rem));
  padding: 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md);
}

.wiki-theme-popover-title {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
}

.wiki-theme-popover-hint {
  margin: -0.25rem 0 0.55rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  color: var(--pckt-text-muted);
}

.wiki-theme-popover-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.65rem;
}
</style>
