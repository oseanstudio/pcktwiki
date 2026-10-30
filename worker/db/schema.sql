-- Donations ledger for the pckt.wiki donations worker.
-- Apply with:  npx wrangler d1 execute donations --remote --file=db/schema.sql

-- One row per donor identity (Stripe customer). Credit info comes from the
-- checkout metadata the visitor filled in before paying.
CREATE TABLE IF NOT EXISTS supporters (
  customer_id TEXT PRIMARY KEY,
  subscription_id TEXT,
  name TEXT,
  company TEXT,
  url TEXT,
  handle TEXT,
  listed INTEGER NOT NULL DEFAULT 0,
  tier TEXT,
  monthly_amount INTEGER,
  currency TEXT NOT NULL DEFAULT 'usd',
  subscription_status TEXT,          -- 'active' | 'canceled' | NULL (one-time only)
  total_paid INTEGER NOT NULL DEFAULT 0,
  first_paid_at TEXT,
  last_paid_at TEXT,
  updated_at TEXT NOT NULL
);

-- One row per completed payment (one-time charges and monthly renewals).
-- event_id is UNIQUE so Stripe webhook retries never double-count.
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,                -- 'one_time' | 'monthly'
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  session_id TEXT,
  invoice_id TEXT,
  subscription_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donations_created ON donations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_customer ON donations (customer_id);
CREATE INDEX IF NOT EXISTS idx_supporters_listed ON supporters (listed, subscription_status);
