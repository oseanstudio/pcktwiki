/**
 * Client for the donations service — a small companion API (see `worker/`)
 * that fronts Stripe the same way support.mesh2motion.org does: the browser
 * never sees a secret key, it only fetches a publishable key and Checkout
 * Session client secrets from the worker, which also records donations for
 * the live totals and supporters credits.
 *
 * When `VITE_DONATIONS_API_URL` is not set the app ships without donations:
 * nav links hide and the donate page renders demo data so the layout stays
 * reviewable.
 */

export const DONATIONS_API_URL: string | null =
  import.meta.env.VITE_DONATIONS_API_URL?.trim().replace(/\/+$/, '') || null

export function isDonationsConfigured(): boolean {
  return DONATIONS_API_URL !== null
}

export type DonationInterval = 'one_time' | 'month'

/** Monthly support tiers, amounts in minor units (cents). */
export interface DonationTier {
  id: string
  label: string
  amount: number
}

export interface DonationsConfig {
  publishableKey: string
  currency: string
  tiers: DonationTier[]
  minAmount: number
  maxAmount: number
}

export interface RecentDonation {
  amount: number
  /** Display name when the donor agreed to be listed, otherwise null. */
  name: string | null
  createdAt: string
}

export interface DonationSummary {
  totalRaised: number
  currency: string
  supporterCount: number
  monthlyTotal: number
  activeMonthlyCount: number
  recent: RecentDonation[]
}

export interface CreditsSupporter {
  name: string
  url: string | null
  /** AT Protocol handle captured at checkout for signed-in donors. */
  handle: string | null
  tier: string | null
  monthlyAmount: number | null
  since: string | null
}

export interface DonationCredits {
  /** Monthly supporters at the highest tier first. */
  corporate: CreditsSupporter[]
  individual: CreditsSupporter[]
  /** Monthly supporters whose subscription has since lapsed. */
  past: CreditsSupporter[]
  oneTime: CreditsSupporter[]
  currency: string
}

export interface CheckoutRequest {
  amount: number
  interval: DonationInterval
  name?: string
  company?: string
  url?: string
  listed?: boolean
  handle?: string
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!DONATIONS_API_URL) {
    throw new Error('Donations are not configured on this site.')
  }
  const response = await fetch(`${DONATIONS_API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || `Donations API error ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function fetchDonationsConfig(): Promise<DonationsConfig> {
  return api<DonationsConfig>('/api/config')
}

export function fetchDonationSummary(): Promise<DonationSummary> {
  return api<DonationSummary>('/api/donations/summary')
}

export function fetchDonationCredits(): Promise<DonationCredits> {
  return api<DonationCredits>('/api/donations/credits')
}

export function createDonationCheckout(request: CheckoutRequest): Promise<{ clientSecret: string }> {
  return api<{ clientSecret: string }>('/api/donations/checkout', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Only http(s) may become a link — donor URLs travel through the donations
 * worker, but the page never trusts that hop blindly. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  return /^https?:\/\//i.test(value) ? value : null
}

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100)
}

const TIME_DIVISIONS: Array<{ limit: number; unit: Intl.RelativeTimeFormatUnit; step: number }> = [
  { limit: 60_000, unit: 'minute', step: 60_000 },
  { limit: 3_600_000, unit: 'minute', step: 60_000 },
  { limit: 86_400_000, unit: 'hour', step: 3_600_000 },
  { limit: 2_592_000_000, unit: 'day', step: 86_400_000 },
  { limit: Infinity, unit: 'month', step: 2_592_000_000 },
]

export function timeAgo(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime()
  if (elapsed < 30_000) return 'just now'
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const { limit, unit, step } of TIME_DIVISIONS) {
    if (elapsed < limit) return formatter.format(-Math.round(elapsed / step), unit)
  }
  return formatter.format(0, 'month')
}

/** Tier label for a monthly amount, or null below every tier. */
export function tierForAmount(amountMinor: number, tiers: DonationTier[]): DonationTier | null {
  const eligible = tiers.filter((tier) => amountMinor >= tier.amount)
  return eligible.length ? eligible[eligible.length - 1] : null
}

/**
 * Self-contained sample data so a site without the worker deployed still
 * shows the full page layout, clearly labelled as demo.
 */
export const DEMO_SUMMARY: DonationSummary = {
  totalRaised: 12_458_000,
  currency: 'USD',
  supporterCount: 342,
  monthlyTotal: 8_940_000,
  activeMonthlyCount: 298,
  recent: [
    { amount: 2500, name: 'Ada W.', createdAt: new Date(Date.now() - 2 * 60_000).toISOString() },
    { amount: 500, name: null, createdAt: new Date(Date.now() - 9 * 60_000).toISOString() },
    { amount: 10_000, name: 'Hexadecimal Labs', createdAt: new Date(Date.now() - 42 * 60_000).toISOString() },
    { amount: 1200, name: null, createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString() },
    { amount: 5000, name: 'Marta Q.', createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString() },
  ],
}

/** Demo tiers matching the worker's defaults (worker/src/config.ts). */
export const DEMO_TIERS: DonationTier[] = [
  { id: 'bronze', label: 'Bronze', amount: 500 },
  { id: 'silver', label: 'Silver', amount: 1000 },
  { id: 'gold', label: 'Gold', amount: 2500 },
]

export const DEMO_CREDITS: DonationCredits = {
  corporate: [
    { name: 'Hexadecimal Labs', url: 'https://example.com', handle: null, tier: 'Gold', monthlyAmount: 25_000, since: '2026-01-04T00:00:00Z' },
    { name: 'Paperclip & Co', url: null, handle: null, tier: 'Silver', monthlyAmount: 10_000, since: '2026-02-11T00:00:00Z' },
  ],
  individual: [
    { name: 'Ada W.', url: 'https://example.com/ada', handle: 'ada.example.com', tier: 'Gold', monthlyAmount: 2500, since: '2025-11-20T00:00:00Z' },
    { name: 'Marta Q.', url: null, handle: null, tier: 'Silver', monthlyAmount: 1000, since: '2026-03-02T00:00:00Z' },
    { name: 'J. Okonkwo', url: null, handle: 'okonkwo.bsky.social', tier: 'Bronze', monthlyAmount: 500, since: '2026-04-18T00:00:00Z' },
  ],
  past: [{ name: 'R. Desmond', url: null, handle: null, tier: 'Silver', monthlyAmount: 1000, since: '2025-09-01T00:00:00Z' }],
  oneTime: [
    { name: '', url: null, handle: null, tier: null, monthlyAmount: null, since: '2026-09-01T00:00:00Z' },
    { name: '', url: null, handle: null, tier: null, monthlyAmount: null, since: '2026-08-28T00:00:00Z' },
  ],
  currency: 'USD',
}
