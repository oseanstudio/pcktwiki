<script setup lang="ts">
import { computed } from 'vue'
import { safeExternalUrl, type CreditsSupporter, type DonationCredits, type DonationTier } from '@/lib/donations'

/**
 * Blender-fund-style credits: corporate sponsors first, then individual
 * monthly supporters grouped by tier, then past and one-time supporters.
 * Only donors who ticked "list me" ever appear here.
 */
const props = defineProps<{ credits: DonationCredits; tiers: DonationTier[] }>()

const corporate = computed(() =>
  [...props.credits.corporate].sort((a, b) => (b.monthlyAmount ?? 0) - (a.monthlyAmount ?? 0)),
)

/** Individual supporters grouped by tier, highest tier first. */
const tierGroups = computed(() => {
  const order = [...props.tiers].sort((a, b) => b.amount - a.amount)
  return order
    .map((tier) => ({
      tier,
      supporters: props.credits.individual.filter((s) => s.tier === tier.label),
    }))
    .filter((group) => group.supporters.length > 0)
})

/** Any individual supporters whose tier label no longer matches the configured tiers. */
const otherIndividuals = computed(() => {
  const known = new Set(tierGroups.value.flatMap((group) => group.supporters))
  return props.credits.individual.filter((supporter) => !known.has(supporter))
})

function profileUrl(supporter: CreditsSupporter): string | null {
  const donorUrl = safeExternalUrl(supporter.url)
  if (donorUrl) return donorUrl
  if (supporter.handle) return `https://bsky.app/profile/${encodeURIComponent(supporter.handle)}`
  return null
}

function displayName(supporter: CreditsSupporter): string {
  return supporter.name || (supporter.handle ? `@${supporter.handle}` : 'Anonymous')
}
</script>

<template>
  <section id="supporters" class="supporters card" data-kb-section>
    <h2>Supporters</h2>
    <p class="supporters-lead muted">
      The people and companies keeping pckt.wiki alive. Donate to add your name.
    </p>

    <div v-if="corporate.length" class="supporters-group">
      <h3>Corporate sponsors</h3>
      <ul class="supporters-corporate">
        <li v-for="supporter in corporate" :key="supporter.name">
          <component
            :is="profileUrl(supporter) ? 'a' : 'span'"
            :href="profileUrl(supporter) ?? undefined"
            :target="profileUrl(supporter) ? '_blank' : undefined"
            :rel="profileUrl(supporter) ? 'noopener noreferrer' : undefined"
            class="supporters-corporate-name"
          >
            {{ supporter.name }}
          </component>
          <span v-if="supporter.tier" class="supporters-tier-badge">{{ supporter.tier }}</span>
        </li>
      </ul>
    </div>

    <div v-for="group in tierGroups" :key="group.tier.id" class="supporters-group">
      <h3>{{ group.tier.label }} <span class="muted">— {{ group.tier.amount / 100 }}/mo</span></h3>
      <ul class="supporters-names">
        <li v-for="supporter in group.supporters" :key="displayName(supporter)">
          <component
            :is="profileUrl(supporter) ? 'a' : 'span'"
            :href="profileUrl(supporter) ?? undefined"
            :target="profileUrl(supporter) ? '_blank' : undefined"
            :rel="profileUrl(supporter) ? 'noopener noreferrer' : undefined"
          >
            {{ displayName(supporter) }}
          </component>
        </li>
      </ul>
    </div>

    <div v-if="otherIndividuals.length" class="supporters-group">
      <h3>Supporters</h3>
      <ul class="supporters-names">
        <li v-for="supporter in otherIndividuals" :key="displayName(supporter)">
          {{ displayName(supporter) }}
        </li>
      </ul>
    </div>

    <div v-if="credits.past.length" class="supporters-group">
      <h3>Past supporters</h3>
      <p class="supporters-names-muted muted">
        {{ credits.past.map(displayName).join(' · ') }}
      </p>
    </div>

    <div v-if="credits.oneTime.length" class="supporters-group">
      <h3>One-time supporters</h3>
      <p class="supporters-names-muted muted">
        {{ credits.oneTime.map(displayName).join(' · ') }}
      </p>
    </div>

    <p
      v-if="
        !corporate.length &&
        !tierGroups.length &&
        !otherIndividuals.length &&
        !credits.past.length &&
        !credits.oneTime.length
      "
      class="supporters-empty muted"
    >
      Nobody yet — be the first supporter.
    </p>
  </section>
</template>

<style scoped>
.supporters {
  padding: 1.25rem 1.375rem;
  scroll-margin-top: 5rem;
}

.supporters h2 {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.1875rem;
  font-weight: 900;
}

.supporters-lead {
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

.supporters-group {
  padding: 0.875rem 0;
  border-top: 1px solid var(--pckt-border);
}

.supporters-group h3 {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 800;
}

.supporters-group h3 .muted {
  font-size: 0.75rem;
  font-weight: 600;
}

.supporters-corporate {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 0.375rem 1rem;
}

.supporters-corporate li {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.supporters-corporate-name {
  font-family: var(--pckt-font-ui);
  font-weight: 800;
  color: var(--pckt-text);
  text-decoration: none;
}

.supporters-corporate-name:hover {
  text-decoration: underline;
}

.supporters-tier-badge {
  font-family: var(--pckt-font-ui);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.0625rem 0.375rem;
  border-radius: var(--pckt-radius-pill);
  background: color-mix(in srgb, var(--pckt-yellow) 16%, transparent);
  color: color-mix(in srgb, var(--pckt-yellow) 70%, var(--pckt-text));
}

.supporters-names {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.875rem;
  font-size: 0.875rem;
}

.supporters-names a {
  color: var(--pckt-text);
  text-decoration: none;
}

.supporters-names a:hover {
  color: var(--pckt-blue);
  text-decoration: underline;
}

.supporters-names-muted {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.7;
}

.supporters-empty {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
}
</style>
