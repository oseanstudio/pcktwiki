<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney, type DonationSummary } from '@/lib/donations'

/** Live totals in the style of fund.blender.org's "Numbers" row. */
const props = defineProps<{ summary: DonationSummary }>()

const stats = computed(() => [
  { value: formatMoney(props.summary.totalRaised, props.summary.currency), label: 'Raised in total' },
  { value: formatMoney(props.summary.monthlyTotal, props.summary.currency), label: 'Monthly support' },
  { value: String(props.summary.supporterCount), label: 'Supporters' },
])
</script>

<template>
  <div class="donate-stats" data-kb-section>
    <div v-for="stat in stats" :key="stat.label" class="donate-stat card">
      <span class="donate-stat-value">{{ stat.value }}</span>
      <span class="donate-stat-label muted">{{ stat.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.donate-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.donate-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.125rem;
}

.donate-stat-value {
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.25rem, 3.5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.donate-stat-label {
  font-size: 0.8125rem;
}

@media (max-width: 560px) {
  .donate-stats {
    grid-template-columns: 1fr;
  }
}
</style>
