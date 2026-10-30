import type { DonorInfo, Env } from './types'
import { tierForAmount } from './config'

interface PaymentInput {
  eventId: string
  kind: 'one_time' | 'monthly'
  amount: number
  currency: string
  customerId: string
  subscriptionId: string | null
  sessionId?: string | null
  invoiceId?: string | null
  paidAt: string
}

function donationInsertStmt(env: Env, input: PaymentInput) {
  return env.DB.prepare(
    `INSERT INTO donations
       (event_id, kind, amount, currency, customer_id, session_id, invoice_id, subscription_id, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  ).bind(
    input.eventId,
    input.kind,
    input.amount,
    input.currency,
    input.customerId,
    input.sessionId ?? null,
    input.invoiceId ?? null,
    input.subscriptionId,
    input.paidAt,
  )
}

/**
 * Credit info rides in the INSERT values; ON CONFLICT folds the new payment
 * into the existing row. Donor-entered fields only move forward: new
 * non-empty values win, and once someone agreed to be listed they stay
 * listed. One-time payments (NULL monthly fields) never disturb an existing
 * subscription state.
 */
function supporterUpsertStmt(env: Env, input: PaymentInput, donor: DonorInfo) {
  const monthly = input.kind === 'monthly'
  return env.DB.prepare(
    `INSERT INTO supporters
       (customer_id, subscription_id, name, company, url, handle, listed, tier,
        monthly_amount, currency, subscription_status, total_paid, first_paid_at,
        last_paid_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14)
     ON CONFLICT(customer_id) DO UPDATE SET
       name = CASE WHEN excluded.name != '' THEN excluded.name ELSE supporters.name END,
       company = CASE WHEN excluded.company != '' THEN excluded.company ELSE supporters.company END,
       url = CASE WHEN excluded.url != '' THEN excluded.url ELSE supporters.url END,
       handle = CASE WHEN excluded.handle != '' THEN excluded.handle ELSE supporters.handle END,
       listed = MAX(supporters.listed, excluded.listed),
       tier = COALESCE(excluded.tier, supporters.tier),
       monthly_amount = COALESCE(excluded.monthly_amount, supporters.monthly_amount),
       subscription_id = COALESCE(excluded.subscription_id, supporters.subscription_id),
       subscription_status = COALESCE(excluded.subscription_status, supporters.subscription_status),
       total_paid = supporters.total_paid + excluded.total_paid,
       first_paid_at = COALESCE(supporters.first_paid_at, excluded.first_paid_at),
       last_paid_at = excluded.last_paid_at,
       updated_at = excluded.updated_at`,
  ).bind(
    input.customerId,
    input.subscriptionId,
    donor.name,
    donor.company,
    donor.url,
    donor.handle,
    donor.listed ? 1 : 0,
    monthly ? (tierForAmount(input.amount)?.label ?? null) : null,
    monthly ? input.amount : null,
    input.currency,
    monthly ? 'active' : null,
    input.amount,
    input.paidAt,
    new Date().toISOString(),
  )
}

/** D1 surfaces constraint violations as plain SQLite error messages. */
function isUniqueViolation(cause: unknown): boolean {
  return cause instanceof Error && /UNIQUE constraint failed/i.test(cause.message)
}

/**
 * Record a completed payment. Each payment is written as ONE transaction:
 * the donations row (whose event_id is UNIQUE) and the supporters upsert
 * either both apply or neither does. A Stripe retry after a partial failure
 * therefore replays the whole batch instead of skipping the supporter write,
 * and a retry after full success no-ops on the UNIQUE constraint — money is
 * counted exactly once, no matter how the webhook is delivered.
 */
export async function recordCompletedCheckout(
  env: Env,
  checkout: {
    eventId: string
    sessionId: string
    customerId: string
    subscriptionId: string | null
    mode: 'payment' | 'subscription'
    amount: number
    currency: string
    createdAt: string
    donor: DonorInfo
  },
): Promise<void> {
  const input: PaymentInput = {
    eventId: checkout.eventId,
    kind: checkout.mode === 'subscription' ? 'monthly' : 'one_time',
    amount: checkout.amount,
    currency: checkout.currency,
    customerId: checkout.customerId,
    subscriptionId: checkout.subscriptionId,
    sessionId: checkout.sessionId,
    paidAt: checkout.createdAt,
  }
  try {
    await env.DB.batch([donationInsertStmt(env, input), supporterUpsertStmt(env, input, checkout.donor)])
  } catch (cause) {
    if (isUniqueViolation(cause)) return
    throw cause
  }
}

/** invoice.paid (billing_reason = subscription_cycle) — a monthly renewal. */
export async function recordMonthlyRenewal(
  env: Env,
  input: {
    eventId: string
    customerId: string
    subscriptionId: string
    amount: number
    currency: string
    paidAt: string
  },
): Promise<void> {
  try {
    await env.DB.batch([
      donationInsertStmt(env, {
        eventId: input.eventId,
        kind: 'monthly',
        amount: input.amount,
        currency: input.currency,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId,
        paidAt: input.paidAt,
      }),
      env.DB.prepare(
        `UPDATE supporters SET
           subscription_status = 'active',
           total_paid = total_paid + ?2,
           last_paid_at = ?3,
           updated_at = ?4
         WHERE customer_id = ?1`,
      ).bind(input.customerId, input.amount, input.paidAt, new Date().toISOString()),
    ])
  } catch (cause) {
    if (isUniqueViolation(cause)) return
    throw cause
  }
}

/** customer.subscription.deleted / updated-to-canceled — drop out of the
 * monthly totals and move to the "past supporters" credits section. */
export async function markSubscriptionCanceled(
  env: Env,
  subscriptionId: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE supporters SET
       subscription_status = 'canceled',
       monthly_amount = NULL,
       updated_at = ?2
     WHERE subscription_id = ?1`,
  )
    .bind(subscriptionId, new Date().toISOString())
    .run()
}

export interface DonationSummary {
  totalRaised: number
  currency: string
  supporterCount: number
  monthlyTotal: number
  activeMonthlyCount: number
  recent: Array<{ amount: number; name: string | null; createdAt: string }>
}

export async function getSummary(env: Env, currency: string): Promise<DonationSummary> {
  const totals = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(DISTINCT customer_id) AS supporters
     FROM donations WHERE currency = ?1`,
  )
    .bind(currency)
    .first<{ total: number; supporters: number }>()

  const monthly = await env.DB.prepare(
    `SELECT COALESCE(SUM(monthly_amount), 0) AS monthly, COUNT(*) AS active
     FROM supporters WHERE subscription_status = 'active' AND monthly_amount IS NOT NULL AND currency = ?1`,
  )
    .bind(currency)
    .first<{ monthly: number; active: number }>()

  const recent = await env.DB.prepare(
    `SELECT d.amount, d.created_at AS createdAt,
            CASE WHEN s.listed = 1 THEN COALESCE(NULLIF(s.name, ''), s.handle) END AS name
     FROM donations d LEFT JOIN supporters s ON s.customer_id = d.customer_id
     WHERE d.currency = ?1
     ORDER BY d.created_at DESC LIMIT 8`,
  )
    .bind(currency)
    .all<{ amount: number; createdAt: string; name: string | null }>()

  return {
    totalRaised: totals?.total ?? 0,
    currency,
    supporterCount: totals?.supporters ?? 0,
    monthlyTotal: monthly?.monthly ?? 0,
    activeMonthlyCount: monthly?.active ?? 0,
    recent: recent.results ?? [],
  }
}

export interface CreditsResult {
  corporate: Array<{ name: string; url: string | null; tier: string | null; monthlyAmount: number | null; since: string | null }>
  individual: Array<{ name: string; url: string | null; handle: string | null; tier: string | null; monthlyAmount: number | null; since: string | null }>
  past: Array<{ name: string; url: string | null; handle: string | null; tier: string | null; monthlyAmount: number | null; since: string | null }>
  oneTime: Array<{ name: string; url: string | null; handle: string | null; since: string | null }>
}

export async function getCredits(env: Env, currency: string): Promise<CreditsResult> {
  const selectBase = `url, tier, first_paid_at AS since`

  const corporate = await env.DB.prepare(
    `SELECT company AS name, ${selectBase}, monthly_amount AS monthlyAmount
     FROM supporters
     WHERE listed = 1 AND subscription_status = 'active' AND COALESCE(company, '') != '' AND currency = ?1
     ORDER BY monthly_amount DESC LIMIT 100`,
  )
    .bind(currency)
    .all<CreditsResult['corporate'][number]>()

  const individualName = `COALESCE(NULLIF(name, ''), handle) AS name`
  const individual = await env.DB.prepare(
    `SELECT ${individualName}, url, handle, tier, monthly_amount AS monthlyAmount, first_paid_at AS since
     FROM supporters
     WHERE listed = 1 AND subscription_status = 'active' AND COALESCE(company, '') = '' AND currency = ?1
     ORDER BY monthly_amount DESC LIMIT 200`,
  )
    .bind(currency)
    .all<CreditsResult['individual'][number]>()

  const past = await env.DB.prepare(
    `SELECT COALESCE(NULLIF(company, ''), NULLIF(name, ''), handle) AS name,
            url, handle, tier, monthly_amount AS monthlyAmount, first_paid_at AS since
     FROM supporters
     WHERE listed = 1 AND subscription_status = 'canceled' AND currency = ?1
     ORDER BY last_paid_at DESC LIMIT 100`,
  )
    .bind(currency)
    .all<CreditsResult['past'][number]>()

  const oneTime = await env.DB.prepare(
    `SELECT ${individualName}, url, handle, first_paid_at AS since
     FROM supporters
     WHERE listed = 1 AND subscription_id IS NULL AND currency = ?1 AND total_paid > 0
     ORDER BY last_paid_at DESC LIMIT 100`,
  )
    .bind(currency)
    .all<CreditsResult['oneTime'][number]>()

  return {
    corporate: corporate.results ?? [],
    individual: individual.results ?? [],
    past: past.results ?? [],
    oneTime: oneTime.results ?? [],
  }
}
