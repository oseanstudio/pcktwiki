<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CyclingVerbLabel from '@/components/CyclingVerbLabel.vue'
import { provideWikiVerbCycle } from '@/composables/useWikiVerbCycle'

withDefaults(
  defineProps<{
    size?: 'md' | 'lg'
  }>(),
  {
    size: 'lg',
  },
)

const { color } = provideWikiVerbCycle()

const accentStyle = computed(() => ({
  '--make-wiki-accent': color.value,
}))
</script>

<template>
  <RouterLink
    to="/wikis"
    class="btn btn-make-wiki"
    :class="size === 'lg' ? 'btn-lg' : 'btn-sm'"
    :style="accentStyle"
    aria-label="Make a wiki — browse wikis"
  >
    <CyclingVerbLabel />
  </RouterLink>
</template>
