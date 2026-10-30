/** Shared worker configuration: donation limits and monthly support tiers. */

export interface Tier {
  id: string
  label: string
  /** Monthly amount in minor units (cents). */
  amount: number
}

/**
 * Monthly tiers, cheapest first — matching fund.blender.org's Bronze/Silver/Gold
 * ladder. `webhook/tier.ts`-style lookup: a monthly amount gets the highest tier
 * it qualifies for, so custom amounts between tiers keep the lower label.
 */
export const TIERS: Tier[] = [
  { id: 'bronze', label: 'Bronze', amount: 500 },
  { id: 'silver', label: 'Silver', amount: 1000 },
  { id: 'gold', label: 'Gold', amount: 2500 },
]

export const MIN_AMOUNT = 100 // $1 — below this fees eat everything
export const MAX_AMOUNT = 1_000_000 // $10,000 — anything larger, email us

/** Highest tier whose floor is <= the monthly amount, or null below Bronze. */
export function tierForAmount(amount: number): Tier | null {
  let match: Tier | null = null
  for (const tier of TIERS) {
    if (amount >= tier.amount) match = tier
  }
  return match
}
