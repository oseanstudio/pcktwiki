import type { Stripe } from 'stripe'
import { getStripe, createDonationCheckout, verifyWebhookEvent } from './stripe'
import {
  getCredits,
  getSummary,
  markSubscriptionCanceled,
  recordCompletedCheckout,
  recordMonthlyRenewal,
} from './db'
import { MAX_AMOUNT, MIN_AMOUNT, TIERS, tierForAmount } from './config'
import type { Env } from './types'

const json = (body: unknown, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...cors,
    },
  })

/** Fixed-window guard for endpoints that cost Stripe/D1 work per call. */
async function allowRequest(env: Env, request: Request): Promise<boolean> {
  if (!env.RATE_LIMITER) return true
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  try {
    return (await env.RATE_LIMITER.limit({ key: ip })).success
  } catch {
    // Fail open: a broken limiter should not take donations down.
    return true
  }
}

const classError = (message: string, status: number, cors: Record<string, string>) =>
  json({ error: message }, cors, status)

function corsHeaders(env: Env, requestOrigin: string | null, wildcard = false): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (wildcard) {
    headers['Access-Control-Allow-Origin'] = '*'
  } else {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)
    if (requestOrigin && (allowed.includes('*') || allowed.includes(requestOrigin))) {
      headers['Access-Control-Allow-Origin'] = requestOrigin
    }
  }
  return headers
}

/** Site-owned endpoints (config, checkout) must be called from an allowed origin. */
function originAllowed(env: Env, requestOrigin: string | null): boolean {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)
  return allowed.includes('*') || (requestOrigin !== null && allowed.includes(requestOrigin))
}

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function cleanUrl(value: unknown): string {
  const raw = cleanString(value, 300)
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : ''
  } catch {
    return ''
  }
}

interface CheckoutBody {
  amount: number
  interval: 'one_time' | 'month'
  donor: { name: string; company: string; url: string; handle: string; listed: boolean }
}

function parseCheckoutBody(raw: unknown): CheckoutBody | string {
  if (typeof raw !== 'object' || raw === null) return 'Body must be a JSON object.'
  const body = raw as Record<string, unknown>

  const amount = body.amount
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return `Amount must be a whole number between ${MIN_AMOUNT / 100} and ${MAX_AMOUNT / 100}.`
  }

  const interval = body.interval
  if (interval !== 'one_time' && interval !== 'month') {
    return "Interval must be 'one_time' or 'month'."
  }

  const donorRaw = body as Record<string, unknown>
  return {
    amount,
    interval,
    donor: {
      name: cleanString(donorRaw.name, 120),
      company: cleanString(donorRaw.company, 120),
      url: cleanUrl(donorRaw.url),
      handle: cleanString(donorRaw.handle, 120),
      listed: donorRaw.listed === true,
    },
  }
}

/** Stripe event timestamps are unix seconds. */
function isoFromUnix(seconds: number | null | undefined): string {
  return new Date((seconds ?? Math.floor(Date.now() / 1000)) * 1000).toISOString()
}

function donorFromMetadata(metadata: Stripe.Metadata | null): { name: string; company: string; url: string; handle: string; listed: boolean } {
  const meta = metadata ?? {}
  return {
    name: cleanString(meta.donor_name, 120),
    company: cleanString(meta.donor_company, 120),
    url: cleanUrl(meta.donor_url),
    handle: cleanString(meta.donor_handle, 120),
    listed: meta.donor_listed === '1',
  }
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text()
  // Webhook auth is the signature, but reading an unbounded body first is a
  // DoS handle; real Stripe events are orders of magnitude smaller.
  if (rawBody.length > 400_000) {
    return json({ error: 'Payload too large.' }, {}, 413)
  }
  const signature = request.headers.get('stripe-signature')
  if (!signature) return classError('Missing stripe-signature header.', 400, {})

  const stripe = getStripe(env)
  let event: Stripe.Event
  try {
    event = await verifyWebhookEvent(stripe, rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (cause) {
    return json(
      { error: `Webhook signature verification failed: ${cause instanceof Error ? cause.message : 'unknown'}` },
      {},
      400,
    )
  }

  const currency = (env.CURRENCY ?? 'usd').toLowerCase()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        // paid covers cards; async methods arrive via async_payment_succeeded.
        if (session.payment_status === 'unpaid') break
        if (typeof session.customer !== 'string' || session.amount_total === null) break
        const donor = donorFromMetadata(session.metadata)
        await recordCompletedCheckout(env, {
          eventId: event.id,
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          mode: session.mode === 'subscription' ? 'subscription' : 'payment',
          amount: session.amount_total,
          currency: session.currency ?? currency,
          createdAt: isoFromUnix(event.created),
          donor,
        })
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        // subscription_create is the first invoice, already recorded by
        // checkout.session.completed — only renewal cycles add money here.
        if (invoice.billing_reason !== 'subscription_cycle') break
        if (typeof invoice.customer !== 'string') break
        const subscription = invoice.parent?.subscription_details?.subscription
        if (typeof subscription !== 'string') break
        await recordMonthlyRenewal(env, {
          eventId: event.id,
          customerId: invoice.customer,
          subscriptionId: subscription,
          amount: invoice.amount_paid,
          currency: invoice.currency ?? currency,
          paidAt: isoFromUnix(invoice.status_transitions?.paid_at ?? invoice.created),
        })
        break
      }
      case 'customer.subscription.deleted': {
        await markSubscriptionCanceled(env, event.data.object.id)
        break
      }
      case 'customer.subscription.updated': {
        if (event.data.object.status === 'canceled') {
          await markSubscriptionCanceled(env, event.data.object.id)
        }
        break
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break
    }
  } catch (cause) {
    console.error(`Webhook ${event.id} (${event.type}) failed:`, cause)
    // 500 makes Stripe retry with backoff — correct for transient D1 errors.
    return json({ error: 'Webhook processing failed.' }, {}, 500)
  }

  return json({ received: true }, {})
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const siteCors = corsHeaders(env, origin)
    const publicCors = corsHeaders(env, origin, true)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...siteCors, ...publicCors } })
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/config') {
        if (!originAllowed(env, origin)) return classError('Origin not allowed.', 403, siteCors)
        if (!(await allowRequest(env, request))) {
          return classError('Too many requests.', 429, siteCors)
        }
        return json(
          {
            publishableKey: env.STRIPE_PUBLISHABLE_KEY,
            currency: (env.CURRENCY ?? 'usd').toLowerCase(),
            tiers: TIERS,
            minAmount: MIN_AMOUNT,
            maxAmount: MAX_AMOUNT,
          },
          siteCors,
        )
      }

      if (request.method === 'POST' && url.pathname === '/api/donations/checkout') {
        if (!originAllowed(env, origin)) return classError('Origin not allowed.', 403, siteCors)
        if (!(await allowRequest(env, request))) {
          return classError('Too many requests.', 429, siteCors)
        }
        const parsed = parseCheckoutBody(await request.json().catch(() => null))
        if (typeof parsed === 'string') return classError(parsed, 400, siteCors)

        const stripe = getStripe(env)
        const clientSecret = await createDonationCheckout(stripe, {
          amount: parsed.amount,
          interval: parsed.interval,
          currency: (env.CURRENCY ?? 'usd').toLowerCase(),
          donor: parsed.donor,
          tierLabel: parsed.interval === 'month' ? (tierForAmount(parsed.amount)?.label ?? null) : null,
          siteName: env.SITE_NAME ?? 'pckt.wiki',
        })
        return json({ clientSecret }, siteCors)
      }

      if (request.method === 'GET' && url.pathname === '/api/donations/summary') {
        return json(await getSummary(env, (env.CURRENCY ?? 'usd').toLowerCase()), publicCors)
      }

      if (request.method === 'GET' && url.pathname === '/api/donations/credits') {
        return json(await getCredits(env, (env.CURRENCY ?? 'usd').toLowerCase()), publicCors)
      }

      if (request.method === 'POST' && url.pathname === '/api/webhook') {
        return await handleWebhook(request, env)
      }

      if (url.pathname === '/' && request.method === 'GET') {
        return json({ ok: true, service: 'pckt.wiki donations' }, publicCors)
      }

      return classError('Not found.', 404, publicCors)
    } catch (cause) {
      console.error('Request failed:', cause)
      return classError('Internal error.', 500, publicCors)
    }
  },
} satisfies ExportedHandler<Env>
