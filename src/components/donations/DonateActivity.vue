<script setup lang="ts">
import { formatMoney, timeAgo, type RecentDonation } from '@/lib/donations'

/** "Latest activity" feed — recent donations like fund.blender.org's, with
 * unlisted donors shown as "Someone". */
defineProps<{ recent: RecentDonation[]; currency: string }>()
</script>

<template>
  <section v-if="recent.length" class="donate-activity card" data-kb-section>
    <h2>Latest activity</h2>
    <ul class="donate-activity-list">
      <li v-for="(donation, index) in recent" :key="index" class="donate-activity-item">
        <span class="donate-activity-text">
          <strong>{{ donation.name || 'Someone' }}</strong> donated
          {{ formatMoney(donation.amount, currency) }}
        </span>
        <span class="donate-activity-time muted">{{ timeAgo(donation.createdAt) }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.donate-activity {
  padding: 1.25rem 1.375rem;
}

.donate-activity h2 {
  margin: 0 0 0.75rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.0625rem;
  font-weight: 900;
}

.donate-activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.donate-activity-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5625rem 0;
  border-top: 1px solid var(--pckt-border);
  font-size: 0.875rem;
}

.donate-activity-item:first-child {
  border-top: none;
  padding-top: 0;
}

.donate-activity-text strong {
  font-weight: 700;
}

.donate-activity-time {
  flex-shrink: 0;
  font-size: 0.75rem;
}
</style>
