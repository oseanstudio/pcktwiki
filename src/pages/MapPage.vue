<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { loadWikiByHandle } from '@/lib/atproto/wiki-loader'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'
import { normalizeHandle } from '@/lib/config'
import { canEdit } from '@/lib/lichen/collections'
import { resolveBlobDisplayUrl } from '@/lib/atproto/blobs'
import { useMapProgress } from '@/composables/useMapProgress'
import {
  buildMapPins,
  findMapImage,
  fogGeometry,
  pinToFogPoint,
  resolveFogColor,
  resolveMapImageSrc,
  revealedPins,
  summarizeProgress,
  type MapPin,
} from '@/lib/lichen/map-fog'

const route = useRoute()
const auth = useAuthStore()
const lichen = useLichenStore()

const handle = computed(() => normalizeHandle(route.params.handle as string))
const wikiSlug = computed(() => route.params.wikiSlug as string)
const wikiUri = computed(() => lichen.currentWiki?.uri ?? null)
const agent = computed(() => auth.agent ?? null)

const mapImageUrl = ref<string | null>(null)
const stageEl = ref<HTMLElement | null>(null)
/**
 * Aspect ratio of the *rendered* stage box, which the CSS keeps equal to the
 * map image's box. Measuring the rendered box rather than the image's intrinsic
 * size is what keeps reveals circular: it is the box that pin percentages and
 * the fog viewBox are both expressed in, and it also covers the no-image case,
 * where the fallback supplies the height.
 */
const mapAspect = ref(1)
let stageObserver: ResizeObserver | null = null
/** Editor-only preview of unreleased places. */
const previewLocked = ref(false)

const { discovered, syncing, syncError, reset } = useMapProgress({ wikiUri, agent })

const canEditWiki = computed(() => canEdit(lichen.access))

const pins = computed(() =>
  buildMapPins(lichen.notes, {
    discovered: discovered.value,
    revealLocked: previewLocked.value && canEditWiki.value,
  }),
)

const progress = computed(() => summarizeProgress(pins.value))
const geometry = computed(() => fogGeometry(mapAspect.value))
const holes = computed(() =>
  revealedPins(pins.value).map((pin) => ({
    slug: pin.slug,
    ...pinToFogPoint(pin, geometry.value),
    r: pin.radius,
  })),
)

/** Locked places are absent entirely — their position is itself a spoiler. */
const visiblePins = computed(() => pins.value.filter((pin) => pin.state !== 'locked'))

const activeMapImage = computed(() => findMapImage(lichen.notes))
/** Null keeps the theme-derived default from the stylesheet. */
const fogColor = computed(() => resolveFogColor(lichen.notes))

function pinStyle(pin: MapPin) {
  return { left: `${pin.x}%`, top: `${pin.y}%` }
}

function measureStage() {
  const el = stageEl.value
  if (!el) return
  const { clientWidth, clientHeight } = el
  if (clientWidth > 0 && clientHeight > 0) {
    mapAspect.value = clientWidth / clientHeight
  }
}

async function resolveMap() {
  mapImageUrl.value = null
  const source = resolveMapImageSrc(activeMapImage.value)
  if (!source || !lichen.currentWiki) return

  if (source.kind === 'direct') {
    mapImageUrl.value = source.url
    return
  }

  try {
    mapImageUrl.value = await resolveBlobDisplayUrl(lichen.currentWiki.ownerDid, source.ref)
  } catch {
    mapImageUrl.value = null
  }
}

async function load() {
  await loadWikiByHandle(lichen, {
    handle: handle.value,
    wikiSlug: wikiSlug.value,
    viewerDid: auth.did,
    authAgent: auth.agent,
  })
  await resolveMap()
}

async function onResetProgress() {
  const ok = window.confirm(
    'Fog the whole map again? This clears the places you have discovered on every device signed in to your account.',
  )
  if (!ok) return
  await reset()
}

onMounted(() => {
  void load()
  if (typeof ResizeObserver !== 'undefined') {
    stageObserver = new ResizeObserver(measureStage)
  }
})

onBeforeUnmount(() => {
  stageObserver?.disconnect()
  stageObserver = null
})

// The stage only exists once there are pins to draw, so attach on appearance.
watch(stageEl, (el) => {
  stageObserver?.disconnect()
  if (el && stageObserver) stageObserver.observe(el)
  measureStage()
})

watch(() => route.fullPath, load)
watch(activeMapImage, resolveMap)
</script>

<template>
  <div class="map-page">
    <div class="inner">
      <header>
        <RouterLink :to="`/@${handle}/${wikiSlug}`" class="muted">← Wiki home</RouterLink>
        <h1>World map</h1>
        <p class="muted">
          Places are hidden until you visit their page. Pin one with frontmatter
          <code>map-x</code>, <code>map-y</code> (0–100), and optional
          <code>map-reveal</code>, <code>map-locked</code>, <code>map-unlock</code>.
        </p>
      </header>

      <template v-if="pins.length">
        <div class="status-bar">
          <div class="progress" role="group" aria-label="Map discovery progress">
            <div class="meter">
              <div
                class="meter-fill"
                :style="{ width: `${progress.percent}%` }"
                role="progressbar"
                :aria-valuenow="progress.discovered"
                :aria-valuemin="0"
                :aria-valuemax="progress.total"
                :aria-label="`${progress.discovered} of ${progress.total} places discovered`"
              />
            </div>
            <p class="progress-text">
              <strong>{{ progress.discovered }}</strong> of
              <strong>{{ progress.total }}</strong> places discovered
              <span v-if="progress.locked && !previewLocked" class="muted">
                · {{ progress.locked }} not yet released
              </span>
            </p>
          </div>

          <div class="status-actions">
            <span v-if="syncing" class="muted sync">Syncing…</span>
            <span v-else-if="!auth.isAuthenticated" class="muted sync">
              Sign in to carry progress across devices
            </span>
            <label v-if="canEditWiki" class="preview-toggle">
              <input v-model="previewLocked" type="checkbox" />
              Preview unreleased
            </label>
            <button
              v-if="progress.discovered"
              type="button"
              class="reset"
              @click="onResetProgress"
            >
              Reset
            </button>
          </div>
        </div>
        <p v-if="syncError" class="sync-error">{{ syncError }}</p>

        <div
          ref="stageEl"
          class="map-stage card"
          :class="{ 'preview-mode': previewLocked && canEditWiki }"
        >
          <img
            v-if="mapImageUrl"
            :src="mapImageUrl"
            alt="World map"
            class="map-image"
            decoding="async"
            fetchpriority="high"
            @load="measureStage"
          />
          <div v-else class="map-fallback" aria-hidden="true" />

          <!--
            The fog is one overlay masked full of soft holes rather than a shape
            per unexplored area, so places that have never been written about are
            covered too — the map hides its own gaps.
          -->
          <svg
            class="fog"
            :viewBox="`0 0 ${geometry.width} ${geometry.height}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="fog-hole-gradient">
                <stop offset="0%" stop-color="black" />
                <stop offset="62%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
              </radialGradient>
              <mask id="fog-mask">
                <rect
                  x="0"
                  y="0"
                  :width="geometry.width"
                  :height="geometry.height"
                  fill="white"
                />
                <circle
                  v-for="hole in holes"
                  :key="hole.slug"
                  :cx="hole.cx"
                  :cy="hole.cy"
                  :r="hole.r"
                  fill="url(#fog-hole-gradient)"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              :width="geometry.width"
              :height="geometry.height"
              class="fog-fill"
              :style="fogColor ? { fill: fogColor } : undefined"
              mask="url(#fog-mask)"
            />
          </svg>

          <template v-for="pin in visiblePins" :key="pin.slug">
            <RouterLink
              v-if="pin.state === 'discovered'"
              class="pin"
              :style="pinStyle(pin)"
              :to="`/@${handle}/${wikiSlug}/${pin.slug}`"
              :title="pin.title"
            >
              <span class="pin-dot" />
              <span class="pin-label">{{ pin.title }}</span>
            </RouterLink>
            <!--
              Undiscovered places are deliberately inert: showing the marker
              keeps the map from feeling empty, but linking it would let a reader
              click past the exploration the fog exists to create.
            -->
            <span
              v-else
              class="pin pin-unknown"
              :style="pinStyle(pin)"
              :title="pin.teaser || 'Undiscovered — visit this place to reveal it'"
            >
              <span class="pin-dot" />
              <span class="pin-label">{{ pin.teaser || '???' }}</span>
            </span>
          </template>
        </div>
      </template>
      <p v-else class="muted">No mapped places yet.</p>
    </div>
  </div>
</template>

<style scoped>
.map-page {
  padding: 2rem 1.25rem 4rem;
}

/*
 * Wider than an article column. The map is the page here, and a detailed one
 * loses its labels at reading width — but it still yields to the viewport so
 * the stage never forces the page to scroll sideways.
 */
.inner {
  max-width: min(var(--pckt-width-wide), calc(100vw - 2.5rem));
  margin: 0 auto;
}

header h1 {
  margin: 0.5rem 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.progress {
  flex: 1 1 260px;
  min-width: 0;
}

.meter {
  height: 6px;
  border-radius: var(--pckt-radius-pill);
  background: var(--pckt-bg-muted);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: var(--pckt-accent);
  border-radius: inherit;
  transition: width 0.4s ease;
}

.progress-text {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.sync {
  white-space: nowrap;
}

.preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  cursor: pointer;
}

.reset {
  background: none;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-btn);
  padding: 0.2rem 0.6rem;
  font: inherit;
  color: var(--pckt-text-muted);
  cursor: pointer;
}

.reset:hover {
  border-color: var(--pckt-border-strong);
  color: var(--pckt-text);
}

.sync-error {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: var(--pckt-danger);
}

/*
 * No min-height: the stage takes its height from the map so that its box and
 * the image's box are always the same rectangle. Pins are placed as percentages
 * of that box, so any gap between the two would slide every pin off the artwork
 * and stretch the fog reveals into ellipses. The fallback below supplies a
 * height for wikis that have pins but no map image.
 */
.map-stage {
  position: relative;
  margin-top: 1rem;
  overflow: hidden;
  padding: 0;
}

.map-stage.preview-mode {
  outline: 2px dashed var(--pckt-yellow);
  outline-offset: -2px;
}

/*
 * Never cropped. `object-fit: cover` would hide part of the world at narrow
 * widths, and since pin coordinates are percentages of this box, the pins would
 * stay put while the artwork under them shifted.
 */
.map-image {
  display: block;
  width: 100%;
  height: auto;
}

.map-fallback {
  min-height: 360px;
  background:
    radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--pckt-red) 18%, transparent), transparent 40%),
    linear-gradient(160deg, var(--pckt-bg-muted), var(--pckt-bg-elevated));
}

.fog {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.fog-fill {
  fill: color-mix(in srgb, var(--pckt-bg) 88%, black);
}

.pin {
  position: absolute;
  transform: translate(-50%, -100%);
  display: grid;
  justify-items: center;
  gap: 0.2rem;
  text-decoration: none;
  color: inherit;
}

.pin-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--pckt-red);
  border: 2px solid var(--pckt-bg-elevated);
  box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
}

.pin-label {
  font-size: 0.75rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--pckt-bg-elevated) 92%, transparent);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

/* Sits above the fog it is hinting through, but reads as unresolved. */
.pin-unknown {
  cursor: default;
  opacity: 0.55;
}

.pin-unknown .pin-dot {
  background: var(--pckt-text-subtle);
}

.pin-unknown .pin-label {
  font-weight: 500;
  letter-spacing: var(--pckt-tracking-wide);
  color: var(--pckt-text-muted);
  background: color-mix(in srgb, var(--pckt-bg-elevated) 70%, transparent);
}

code {
  font-family: var(--pckt-font-mono);
  font-size: 0.85em;
}
</style>
