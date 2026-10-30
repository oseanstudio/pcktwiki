import Stripe from 'stripe'
import type { Env } from './types'

let stripe: Stripe | null = null
let cryptoProvider: Stripe.CryptoProvider | null = null

/**
 * stripe-node runs on Workers with the fetch HTTP client. Webhook signature
 * verification is async on this runtime (no Node crypto), so it needs the
 * SubtleCrypto provider — both cached per isolate.
 */
export function getStripe(env: Env): Stripe {
  stripe ??= new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  })
  return stripe
}

export function verifyWebhookEvent(
  stripe: Stripe,
  payload: string,
  signature: string,
  secret: string,
): Promise<Stripe.Event> {
  cryptoProvider ??= Stripe.createSubtleCryptoProvider()
  return stripe.webhooks.constructEventAsync(payload, signature, secret, undefined, cryptoProvider)
}

export interface CheckoutInput {
  amount: number
  interval: 'one_time' | 'month'
  currency: string
  donor: {
    name: string
    company: string
    url: string
    handle: string
    listed: boolean
  }
  tierLabel: string | null
  siteName: string
}

/**
 * Creates an Embedded Checkout Session (what support.mesh2motion.org does):
 * the browser mounts the session's client_secret and Stripe renders the
 * payment form inline. Donor credit info rides along in metadata so the
 * webhook can build the supporters page without extra round-trips.
 */
export async function createDonationCheckout(
  stripe: Stripe,
  input: CheckoutInput,
): Promise<string> {
  const monthly = input.interval === 'month'
  const productName = monthly
    ? `${input.siteName} monthly support${input.tierLabel ? ` — ${input.tierLabel}` : ''}`
    : `${input.siteName} one-time donation`

  const metadata: Record<string, string> = {
    donor_name: input.donor.name,
    donor_company: input.donor.company,
    donor_url: input.donor.url,
    donor_handle: input.donor.handle,
    donor_listed: input.donor.listed ? '1' : '0',
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: monthly ? 'subscription' : 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency,
          unit_amount: input.amount,
          product_data: { name: productName },
          ...(monthly ? { recurring: { interval: 'month' as const } } : {}),
        },
      },
    ],
    metadata,
    ...(monthly
      ? { subscription_data: { metadata } }
      : { submit_type: 'donate' as const }),
  })

  return session.client_secret as string
}
