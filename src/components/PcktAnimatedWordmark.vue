<script setup lang="ts">
import { computed } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { skipMotionEnter } from '@/composables/useMotionEnter'
import {
  PCKT_WORDMARK_LETTERS,
  PCKT_WORDMARK_LETTER_STYLE,
  pcktWordmarkLetterTransition,
} from '@/lib/pckt-wordmark-paths'

const props = withDefaults(
  defineProps<{
    animated?: boolean
  }>(),
  {
    animated: true,
  },
)

const reducedMotion = useReducedMotion()

const shouldAnimate = computed(() => props.animated && !reducedMotion.value)

const letterEnter = { opacity: 0, y: -30 }
const letterRest = { opacity: 1, y: 0 }

const letterInitial = computed(() =>
  shouldAnimate.value && !skipMotionEnter.value ? letterEnter : letterRest,
)
</script>

<template>
  <svg
    class="pckt-wordmark"
    viewBox="0 0 249 106"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="pckt"
    overflow="visible"
  >
    <template v-if="shouldAnimate">
      <motion.path
        v-for="(letter, index) in PCKT_WORDMARK_LETTERS"
        :key="index"
        :d="letter.d"
        :fill="letter.fill"
        :fill-rule="letter.evenodd ? 'evenodd' : undefined"
        :clip-rule="letter.evenodd ? 'evenodd' : undefined"
        :style="PCKT_WORDMARK_LETTER_STYLE"
        :initial="letterInitial"
        :animate="letterRest"
        :transition="shouldAnimate && !skipMotionEnter ? pcktWordmarkLetterTransition(index) : { duration: 0 }"
      />
    </template>
    <template v-else>
      <path
        v-for="(letter, index) in PCKT_WORDMARK_LETTERS"
        :key="index"
        :d="letter.d"
        :fill="letter.fill"
        :fill-rule="letter.evenodd ? 'evenodd' : undefined"
        :clip-rule="letter.evenodd ? 'evenodd' : undefined"
      />
    </template>
  </svg>
</template>

<style scoped>
.pckt-wordmark {
  display: block;
  width: auto;
  height: inherit;
  overflow: visible;
}
</style>
