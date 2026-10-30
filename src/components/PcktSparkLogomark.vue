<script setup lang="ts">
import { suffixColor } from '@/lib/pckt-brand-color'
import {
  PCKT_SPARK_LOGOMARK_OUTLINE_D,
  PCKT_SPARK_LOGOMARK_SPARK_D,
} from '@/lib/pckt-spark-logomark'

withDefaults(
  defineProps<{
    sparkColor?: string
  }>(),
  {
    sparkColor: undefined,
  },
)
</script>

<template>
  <svg
    class="pckt-spark-logomark"
    viewBox="0 0 68 66"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      :d="PCKT_SPARK_LOGOMARK_OUTLINE_D"
      fill="#000"
    />
    <path
      :d="PCKT_SPARK_LOGOMARK_SPARK_D"
      :fill="sparkColor ?? suffixColor"
    />
  </svg>
</template>

<style scoped>
.pckt-spark-logomark {
  display: block;
  width: 100%;
  height: auto;
}
</style>
