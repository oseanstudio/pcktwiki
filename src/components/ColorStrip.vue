<script setup lang="ts">
import { computed } from 'vue'
import { motion, useReducedMotion } from 'motion-v'

/** Entrance animation copied from pckt.blog landing color strip. */
const stripEnter = { opacity: 0, y: 18 }
const stripRest = { opacity: 1, y: 0 }
const stripTransition = {
  duration: 0.4,
  ease: 'easeOut' as const,
  delay: 1.1,
}

const reducedMotion = useReducedMotion()
const shouldAnimate = computed(() => !reducedMotion.value)
</script>

<template>
  <motion.div
    id="color-strip"
    class="color-strip"
    aria-hidden="true"
    :initial="shouldAnimate ? stripEnter : stripRest"
    :animate="stripRest"
    :transition="shouldAnimate ? stripTransition : { duration: 0 }"
  >
    <div class="color-strip-segment color-strip-red" />
    <div class="color-strip-segment color-strip-blue color-strip-md-only" />
    <div class="color-strip-segment color-strip-yellow" />
    <div class="color-strip-segment color-strip-green color-strip-md-only" />
    <div class="color-strip-segment color-strip-end" />
  </motion.div>
</template>

<style scoped>
.color-strip {
  display: flex;
  gap: 5.5px;
  width: 100%;
  height: 56px;
  margin-top: -2rem;
  margin-bottom: 5.5px;
}

.color-strip-segment {
  flex: 1 1 0;
  min-width: 0;
}

.color-strip-red {
  background: var(--pckt-red);
}

.color-strip-blue {
  background: var(--pckt-blue);
}

.color-strip-yellow {
  background: var(--pckt-yellow);
}

.color-strip-green {
  background: var(--pckt-green);
}

.color-strip-end {
  background: var(--pckt-blue);
}

.color-strip-md-only {
  display: none;
}

@media (min-width: 768px) {
  .color-strip-md-only {
    display: block;
  }

  .color-strip-end {
    background: var(--pckt-red);
  }
}
</style>
