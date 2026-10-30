import { describe, expect, it } from 'vitest'
import {
  formatMoney,
  isDonationsConfigured,
  safeExternalUrl,
  tierForAmount,
  timeAgo,
  type DonationTier,
} from '@/lib/donations'

const TIERS: DonationTier[] = [
  { id: 'bronze', label: 'Bronze', amount: 500 },
  { id: 'silver', label: 'Silver', amount: 1000 },
  { id: 'gold', label: 'Gold', amount: 2500 },
]

describe('formatMoney', () => {
  it('formats whole minor units without cents', () => {
    expect(formatMoney(2500, 'USD')).toBe('$25')
  })

  it('keeps cents when the amount has them', () => {
    expect(formatMoney(2550, 'USD')).toBe('$25.50')
  })
})

describe('tierForAmount', () => {
  it('returns the highest tier the amount qualifies for', () => {
    expect(tierForAmount(3000, TIERS)?.label).toBe('Gold')
    expect(tierForAmount(1000, TIERS)?.label).toBe('Silver')
  })

  it('returns null below the cheapest tier', () => {
    expect(tierForAmount(499, TIERS)).toBeNull()
  })
})

describe('timeAgo', () => {
  it('says "just now" within half a minute', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now')
  })

  it('formats minutes with a relative formatter', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(timeAgo(fiveMinutesAgo)).toMatch(/5 minutes? ago/)
  })
})

describe('safeExternalUrl', () => {
  it('allows http(s) URLs', () => {
    expect(safeExternalUrl('https://example.com')).toBe('https://example.com')
    expect(safeExternalUrl('http://example.com/x')).toBe('http://example.com/x')
  })

  it('rejects scheme injection and relative junk', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,<script>')).toBeNull()
    expect(safeExternalUrl(' JAVASCRIPT:alert(1)')).toBeNull()
    expect(safeExternalUrl('//evil.com')).toBeNull()
    expect(safeExternalUrl('not a url')).toBeNull()
    expect(safeExternalUrl('')).toBeNull()
    expect(safeExternalUrl(null)).toBeNull()
  })
})

describe('isDonationsConfigured', () => {
  it('mirrors whether an API URL is baked in at build time', () => {
    expect(isDonationsConfigured()).toBe(Boolean(import.meta.env.VITE_DONATIONS_API_URL))
  })
})
