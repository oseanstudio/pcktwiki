<script setup lang="ts">
import { motion, useAnimationControls } from 'motion-v'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { skipMotionEnter } from '@/composables/useMotionEnter'
import { useWikiVerbCycle } from '@/composables/useWikiVerbCycle'
import {
  wikiVerbEnter,
  wikiVerbEnterTransition,
  wikiVerbExitState,
  wikiVerbRest,
  WIKI_VERB_FALLBACK_RECOVERY_MS,
  WIKI_VERBS,
} from '@/lib/wiki-verb-cycle'

const { step, verb, color, reducedMotion } = useWikiVerbCycle()
const controls = useAnimationControls()

const displayedVerb = ref(verb.value)
const displayedColor = ref(color.value)
const useStaticFallback = ref(false)

const slotRef = ref<HTMLElement | null>(null)
let cycleToken = 0
let recoveryTimer: ReturnType<typeof setTimeout> | undefined

function syncDisplayed() {
  displayedVerb.value = verb.value
  displayedColor.value = color.value
}

function clearRecoveryTimer() {
  if (recoveryTimer !== undefined) {
    clearTimeout(recoveryTimer)
    recoveryTimer = undefined
  }
}

function isAnimatedWordHidden(): boolean {
  const animated = slotRef.value?.querySelector('.cycling-verb-animated')
  if (!(animated instanceof HTMLElement)) return true
  if (animated.textContent?.trim() === '') return true
  return parseFloat(getComputedStyle(animated).opacity) < 0.05
}

function enableFallback() {
  if (useStaticFallback.value) return
  useStaticFallback.value = true
  syncDisplayed()
  clearRecoveryTimer()
}

function scheduleVisibilityCheck() {
  clearRecoveryTimer()
  if (reducedMotion.value || useStaticFallback.value) return

  recoveryTimer = setTimeout(() => {
    recoveryTimer = undefined
    if (isAnimatedWordHidden()) enableFallback()
  }, WIKI_VERB_FALLBACK_RECOVERY_MS)
}

async function animateWordChange() {
  if (useStaticFallback.value) {
    syncDisplayed()
    return
  }

  try {
    const token = ++cycleToken
    await controls.start(wikiVerbExitState)
    if (token !== cycleToken) return
    syncDisplayed()
    await controls.start({
      ...wikiVerbRest,
      transition: wikiVerbEnterTransition,
    })
    scheduleVisibilityCheck()
  } catch {
    enableFallback()
  }
}

watch(step, (next, prev) => {
  if (reducedMotion.value || useStaticFallback.value) {
    syncDisplayed()
    return
  }
  if (next === prev) return
  scheduleVisibilityCheck()
  void animateWordChange()
})

watch(reducedMotion, (prefersReduced) => {
  if (prefersReduced) clearRecoveryTimer()
  else if (!useStaticFallback.value) scheduleVisibilityCheck()
})

onMounted(() => {
  if (reducedMotion.value) return
  syncDisplayed()
  scheduleVisibilityCheck()
  if (skipMotionEnter.value) {
    try {
      controls.set(wikiVerbRest)
    } catch {
      enableFallback()
    }
    scheduleVisibilityCheck()
    return
  }
  void controls
    .start({
      ...wikiVerbRest,
      transition: wikiVerbEnterTransition,
    })
    .then(() => scheduleVisibilityCheck())
    .catch(() => enableFallback())
})

onUnmounted(clearRecoveryTimer)
</script>

<template>
  <span class="cycling-verb-label">
    <span ref="slotRef" class="cycling-verb-slot" aria-hidden="true">
      <span
        v-for="word in WIKI_VERBS"
        :key="word"
        class="cycling-verb-sizer"
      >
        {{ word }}
      </span>
      <motion.span
        v-if="!reducedMotion && !useStaticFallback"
        class="cycling-verb-word cycling-verb-animated"
        :style="{ color: displayedColor }"
        :initial="skipMotionEnter ? wikiVerbRest : wikiVerbEnter"
        :animate="controls"
      >
        {{ displayedVerb }}
      </motion.span>
      <span
        v-else
        class="cycling-verb-word"
        :style="{ color: displayedColor }"
      >
        {{ displayedVerb }}
      </span>
    </span>
    <span class="cycling-verb-rest"> a Wiki</span>
  </span>
</template>

<style scoped>
.cycling-verb-label {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-family: var(--pckt-font-ui);
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
}

.cycling-verb-slot {
  display: inline-grid;
  flex: 0 0 auto;
  overflow-x: clip;
  vertical-align: bottom;
}

.cycling-verb-slot > * {
  grid-area: 1 / 1;
  justify-self: center;
  align-self: center;
}

.cycling-verb-sizer {
  visibility: hidden;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

.cycling-verb-word {
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.cycling-verb-rest {
  font-weight: 600;
  line-height: 1;
  white-space: pre;
}
</style>
