<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useShareMeta } from '@/composables/useShareMeta'
import DonateCheckout from '@/components/donations/DonateCheckout.vue'
import DonateStats from '@/components/donations/DonateStats.vue'
import DonateActivity from '@/components/donations/DonateActivity.vue'
import SupportersCredits from '@/components/donations/SupportersCredits.vue'
import {
  DEMO_CREDITS,
  DEMO_SUMMARY,
  DEMO_TIERS,
  fetchDonationCredits,
  fetchDonationSummary,
  fetchDonationsConfig,
  isDonationsConfigured,
  type DonationCredits,
  type DonationsConfig,
  type DonationSummary,
} from '@/lib/donations'

const configured = isDonationsConfigured()
const demoMode = !configured

const config = ref<DonationsConfig | null>(null)
const summary = ref<DonationSummary | null>(null)
const credits = ref<DonationCredits | null>(null)
const loadError = ref<string | null>(null)

const title = 'Support pckt.wiki'
const description =
  'Donate once or monthly to keep pckt.wiki growing — live totals and the supporters wall, powered by Stripe.'

useShareMeta({
  title: computed(() => title),
  description: computed(() => description),
})

async function loadLive() {
  try {
    config.value = await fetchDonationsConfig()
    const [summaryResult, creditsResult] = await Promise.all([
      fetchDonationSummary(),
      fetchDonationCredits(),
    ])
    summary.value = summaryResult
    credits.value = creditsResult
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : 'Could not load donations.'
  }
}

function refreshTotals() {
  if (!configured) return
  fetchDonationSummary()
    .then((result) => (summary.value = result))
    .catch(() => {})
  fetchDonationCredits()
    .then((result) => (credits.value = result))
    .catch(() => {})
}

onMounted(() => {
  if (configured) loadLive()
})
</script>

<template>
  <div class="donate-page">
    <div class="donate-inner">
      <header class="donate-header">
        <RouterLink to="/" class="donate-back muted">← Home</RouterLink>
        <h1 class="donate-title">Support pckt.wiki</h1>
        <p class="donate-lead muted">
          pckt.wiki is built and hosted with support from its community. Donate once, or become a
          monthly supporter — your name (or your company's) joins the supporters wall.
        </p>
      </header>

      <div v-if="demoMode" class="donate-demo-note card" role="note">
        <strong>Demo mode.</strong>
        This site has not connected Stripe yet, so the numbers below are sample data. Deploy the
        donations worker and set <code>VITE_DONATIONS_API_URL</code> to go live — see
        <code>worker/README.md</code>.
      </div>

      <div v-else-if="loadError" class="donate-error card" role="alert">
        Could not load donations: {{ loadError }}
      </div>

      <template v-if="summary">
        <DonateStats :summary="summary" />
      </template>
      <template v-else-if="demoMode">
        <DonateStats :summary="DEMO_SUMMARY" />
      </template>

      <div class="donate-columns">
        <div class="donate-main">
          <DonateCheckout v-if="config" :config="config" @completed="refreshTotals" />
          <div v-else-if="demoMode" class="card donate-demo-checkout" data-kb-section>
            <h2>Support pckt.wiki</h2>
            <p class="muted">
              In live mode this card holds the donation form: one-time or monthly amounts, paid
              through Stripe Embedded Checkout without leaving the page.
            </p>
          </div>

          <DonateActivity
            :recent="(summary ?? DEMO_SUMMARY).recent"
            :currency="(summary ?? DEMO_SUMMARY).currency"
          />
        </div>
      </div>

      <SupportersCredits
        :credits="credits ?? DEMO_CREDITS"
        :tiers="config?.tiers ?? DEMO_TIERS"
      />

      <p v-if="configured" class="donate-footnote muted">
        Payments are handled by Stripe; the wiki never sees your card details. Monthly supporters
        can cancel any time from the receipt link in their Stripe email.
      </p>
    </div>
  </div>
</template>

<style scoped>
.donate-page {
  background: var(--pckt-bg);
  padding: 2rem clamp(1rem, 3vw, 2.5rem) 5rem;
  min-height: calc(100dvh - 3rem);
}

.donate-inner {
  max-width: 52rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.donate-back {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-decoration: none;
  align-self: flex-start;
}

.donate-back:hover {
  text-decoration: underline;
}

.donate-header {
  display: flex;
  flex-direction: column;
}

.donate-title {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(2rem, 4.5vw, 2.75rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.donate-lead {
  margin: 0;
  max-width: 44rem;
  font-size: 1rem;
  line-height: 1.5;
}

.donate-demo-note,
.donate-error {
  padding: 0.875rem 1.125rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.donate-demo-note code,
.donate-error code {
  font-family: var(--pckt-font-mono);
  font-size: 0.8125em;
}

.donate-columns {
  display: flex;
  flex-direction: column;
}

.donate-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.donate-demo-checkout {
  padding: 1.375rem;
}

.donate-demo-checkout h2 {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.1875rem;
  font-weight: 900;
}

.donate-demo-checkout p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.donate-footnote {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.5;
}
</style>
