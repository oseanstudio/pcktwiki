<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { loadStripe, type Stripe, type StripeEmbeddedCheckout } from '@stripe/stripe-js'
import {
  createDonationCheckout,
  formatMoney,
  type DonationsConfig,
  type DonationInterval,
} from '@/lib/donations'
import { useAuthStore } from '@/stores/auth'

/**
 * One-time / monthly donation widget. Mirrors support.mesh2motion.org: the
 * visitor picks an amount here, the companion worker opens a Stripe Checkout
 * Session, and Stripe's Embedded Checkout renders the payment form inline so
 * the donor never leaves the wiki.
 */
const props = defineProps<{ config: DonationsConfig }>()

const emit = defineEmits<{ completed: [] }>()

const auth = useAuthStore()

const ONE_TIME_PRESETS = [500, 1500, 5000, 10_000]

const interval = ref<DonationInterval>('one_time')
const selectedPreset = ref<number | null>(500)
const customAmount = ref('')
const listed = ref(true)
const donorName = ref(auth.handle ?? '')
const donorCompany = ref('')
const donorUrl = ref('')

const stage = ref<'form' | 'loading' | 'checkout' | 'done'>('form')
const error = ref<string | null>(null)

let stripe: Stripe | null = null
let embeddedCheckout: StripeEmbeddedCheckout | null = null
const checkoutEl = ref<HTMLElement | null>(null)

const currency = computed(() => props.config.currency)

const amount = computed<number | null>(() => {
  const custom = customAmount.value.trim()
  if (custom) {
    const parsed = Number.parseFloat(custom)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return Math.round(parsed * 100)
  }
  return selectedPreset.value
})

const amountValid = computed(
  () =>
    amount.value !== null &&
    amount.value >= props.config.minAmount &&
    amount.value <= props.config.maxAmount,
)

const amountLabel = computed(() => {
  if (amount.value === null) return ''
  return formatMoney(amount.value, currency.value)
})

function pickPreset(value: number) {
  selectedPreset.value = value
  customAmount.value = ''
}

function switchInterval(value: DonationInterval) {
  interval.value = value
  selectedPreset.value = value === 'one_time' ? 500 : (props.config.tiers[0]?.amount ?? null)
  customAmount.value = ''
}

function resetWidget() {
  embeddedCheckout?.destroy()
  embeddedCheckout = null
  stage.value = 'form'
  error.value = null
}

onUnmounted(() => {
  embeddedCheckout?.destroy()
  embeddedCheckout = null
})

async function submit() {
  if (!amountValid.value || stage.value !== 'form') return
  stage.value = 'loading'
  error.value = null

  try {
    const trimmedName = donorName.value.trim()
    const trimmedCompany = donorCompany.value.trim()
    const { clientSecret } = await createDonationCheckout({
      amount: amount.value!,
      interval: interval.value,
      name: trimmedName || undefined,
      company: trimmedCompany || undefined,
      url: donorUrl.value.trim() || undefined,
      listed: listed.value,
      handle: auth.handle ?? undefined,
    })

    stripe ??= (await loadStripe(props.config.publishableKey)) ?? null
    if (!stripe) throw new Error('Stripe failed to load.')

    const checkout = await stripe.createEmbeddedCheckoutPage({
      clientSecret,
      onComplete: () => {
        embeddedCheckout?.destroy()
        embeddedCheckout = null
        stage.value = 'done'
        emit('completed')
      },
    })
    embeddedCheckout = checkout
    stage.value = 'checkout'
    // The container only exists once the template switches to the checkout
    // stage, so wait a frame before mounting Stripe's iframe.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    if (checkoutEl.value) checkout.mount(checkoutEl.value)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Something went wrong.'
    stage.value = 'form'
  }
}

watch(
  () => props.config,
  () => resetWidget(),
)
</script>

<template>
  <div class="donate-checkout card" data-kb-section>
    <template v-if="stage === 'done'">
      <div class="donate-checkout-done">
        <h2>Thank you! 💛</h2>
        <p class="muted">
          Your support keeps pckt.wiki growing. A receipt is on its way from Stripe{{
            listed ? ' — you should appear on the supporters page shortly.' : '.'
          }}
        </p>
        <button type="button" class="btn btn-secondary" @click="resetWidget">
          Donate again
        </button>
      </div>
    </template>

    <template v-else-if="stage === 'checkout'">
      <div class="donate-checkout-embedded">
        <div class="donate-checkout-embedded-head">
          <button type="button" class="btn btn-ghost btn-sm" @click="resetWidget">← Change</button>
          <span class="muted">
            {{ amountLabel }}{{ interval === 'month' ? ' / month' : '' }}
          </span>
        </div>
        <div ref="checkoutEl" class="donate-checkout-frame" />
      </div>
    </template>

    <template v-else>
      <h2>Support pckt.wiki</h2>
      <p class="donate-checkout-lead muted">
        Pay for hosting, moderation tooling, and new features. Every donation counts.
      </p>

      <div class="donate-checkout-toggle" role="group" aria-label="Donation type">
        <button
          type="button"
          :aria-pressed="interval === 'one_time'"
          :class="{ active: interval === 'one_time' }"
          @click="switchInterval('one_time')"
        >
          One-time
        </button>
        <button
          type="button"
          :aria-pressed="interval === 'month'"
          :class="{ active: interval === 'month' }"
          @click="switchInterval('month')"
        >
          Monthly
        </button>
      </div>

      <div v-if="interval === 'month' && config.tiers.length" class="donate-checkout-tiers">
        <button
          v-for="tier in config.tiers"
          :key="tier.id"
          type="button"
          class="donate-checkout-tier"
          :class="{ active: selectedPreset === tier.amount && !customAmount }"
          @click="pickPreset(tier.amount)"
        >
          <strong>{{ formatMoney(tier.amount, currency) }}</strong>
          <span class="muted">/ month</span>
          <span v-if="tier.label" class="donate-checkout-tier-label">{{ tier.label }}</span>
        </button>
      </div>

      <div class="donate-checkout-amount">
        <label class="donate-checkout-field-label" for="donate-amount-input">
          {{ interval === 'month' ? 'Monthly amount' : 'Amount' }} (USD)
        </label>
        <div class="donate-checkout-amount-row">
          <span class="donate-checkout-currency" aria-hidden="true">$</span>
          <input
            id="donate-amount-input"
            v-model="customAmount"
            type="number"
            inputmode="decimal"
            min="1"
            step="1"
            :placeholder="String(((selectedPreset ?? 500) / 100).toFixed(0))"
          />
        </div>
        <div v-if="interval === 'one_time'" class="donate-checkout-chips">
          <button
            v-for="preset in ONE_TIME_PRESETS"
            :key="preset"
            type="button"
            :class="{ active: selectedPreset === preset && !customAmount }"
            @click="pickPreset(preset)"
          >
            {{ formatMoney(preset, currency) }}
          </button>
        </div>
      </div>

      <details class="donate-checkout-credits" :open="listed">
        <summary>Show my support on the supporters page</summary>
        <label class="donate-checkout-check">
          <input v-model="listed" type="checkbox" />
          <span>List my name in the credits (companies are listed under the company name).</span>
        </label>
        <template v-if="listed">
          <label class="donate-checkout-field-label" for="donate-name">
            Display name {{ auth.handle ? '(we filled in your handle)' : '' }}
          </label>
          <input id="donate-name" v-model="donorName" type="text" placeholder="Ada Lovelace" />
          <label class="donate-checkout-field-label" for="donate-company">
            Company <span class="muted">(optional)</span>
          </label>
          <input id="donate-company" v-model="donorCompany" type="text" placeholder="Acme Inc." />
          <label class="donate-checkout-field-label" for="donate-url">
            Link <span class="muted">(optional)</span>
          </label>
          <input id="donate-url" v-model="donorUrl" type="url" placeholder="https://…" />
        </template>
      </details>

      <p v-if="error" class="donate-checkout-error" role="alert">{{ error }}</p>

      <button
        type="button"
        class="btn btn-primary donate-checkout-submit"
        :disabled="!amountValid || stage === 'loading'"
        @click="submit"
      >
        {{
          stage === 'loading'
            ? 'Opening Stripe…'
            : amountValid
              ? `Donate ${amountLabel}${interval === 'month' ? ' / month' : ''}`
              : `Enter ${formatMoney(config.minAmount, currency)}–${formatMoney(config.maxAmount, currency)}`
        }}
      </button>
      <p class="donate-checkout-secure muted">
        Payments are processed by Stripe. Card details never touch pckt.wiki.
      </p>
    </template>
  </div>
</template>

<style scoped>
.donate-checkout {
  padding: 1.375rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.donate-checkout h2 {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 1.1875rem;
  font-weight: 900;
}

.donate-checkout-lead {
  margin: -0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.donate-checkout-toggle {
  display: inline-flex;
  align-self: flex-start;
  border: 1px solid var(--pckt-border);
  border-radius: 999px;
  padding: 0.1875rem;
  background: var(--pckt-bg-muted);
}

.donate-checkout-toggle button {
  border: none;
  background: none;
  border-radius: 999px;
  padding: 0.375rem 0.875rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--pckt-text-muted);
  cursor: pointer;
}

.donate-checkout-toggle button.active {
  background: var(--pckt-bg-elevated);
  color: var(--pckt-text);
  box-shadow: var(--pckt-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.08));
}

.donate-checkout-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.5rem;
}

.donate-checkout-tier,
.donate-checkout-chips button {
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  color: var(--pckt-text);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.donate-checkout-tier {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.625rem 0.75rem;
  font-family: var(--pckt-font-ui);
  text-align: left;
}

.donate-checkout-tier strong {
  font-size: 1rem;
}

.donate-checkout-tier .muted {
  font-size: 0.75rem;
}

.donate-checkout-tier-label {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pckt-red);
}

.donate-checkout-tier:hover,
.donate-checkout-chips button:hover {
  border-color: var(--pckt-text-muted);
}

.donate-checkout-tier.active,
.donate-checkout-chips button.active {
  border-color: var(--pckt-accent);
  background: color-mix(in srgb, var(--pckt-accent) 8%, var(--pckt-bg-elevated));
}

.donate-checkout-field-label {
  display: block;
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
}

.donate-checkout-amount-row {
  display: flex;
  align-items: center;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-elevated);
  overflow: hidden;
}

.donate-checkout-currency {
  padding: 0 0.25rem 0 0.75rem;
  font-family: var(--pckt-font-ui);
  font-weight: 700;
  color: var(--pckt-text-muted);
}

.donate-checkout-amount-row input,
.donate-checkout-credits input[type='text'],
.donate-checkout-credits input[type='url'] {
  width: 100%;
  border: none;
  background: none;
  padding: 0.625rem 0.75rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  color: var(--pckt-text);
}

.donate-checkout-credits input[type='text'],
.donate-checkout-credits input[type='url'] {
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
}

.donate-checkout-amount-row input:focus-visible,
.donate-checkout-credits input:focus-visible {
  outline: 2px solid var(--pckt-accent);
  outline-offset: -1px;
}

.donate-checkout-amount-row input:focus-visible {
  outline-offset: -2px;
}

.donate-checkout-amount-row input::-webkit-outer-spin-button,
.donate-checkout-amount-row input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.donate-checkout-amount-row input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.donate-checkout-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.donate-checkout-chips button {
  padding: 0.3125rem 0.6875rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
}

.donate-checkout-credits {
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  padding: 0.6875rem 0.875rem;
}

.donate-checkout-credits summary {
  cursor: pointer;
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 700;
  user-select: none;
}

.donate-checkout-credits > *:not(summary) {
  margin-top: 0.625rem;
}

.donate-checkout-check {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--pckt-text-muted);
}

.donate-checkout-error {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--pckt-red);
}

.donate-checkout-submit {
  align-self: flex-start;
}

.donate-checkout-secure {
  margin: -0.25rem 0 0;
  font-size: 0.75rem;
}

.donate-checkout-embedded-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.donate-checkout-done {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.625rem;
}

.donate-checkout-done h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
}

@media (max-width: 480px) {
  .donate-checkout-submit {
    align-self: stretch;
  }
}
</style>
