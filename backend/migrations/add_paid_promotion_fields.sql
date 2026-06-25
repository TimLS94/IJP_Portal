-- Migration: Einmalig bezahlte Promotions (Boost/Hervorheben) für Nicht-Premium
-- Run this in Render Shell: psql $DATABASE_URL -f migrations/add_paid_promotion_fields.sql

-- Herkunft der Promotion: "premium" (Abo-Kontingent) | "paid" (Stripe-Einmalzahlung)
ALTER TABLE job_promotions ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'premium';

-- Stripe Checkout-Session der Einmalzahlung (Idempotenz im Webhook)
ALTER TABLE job_promotions ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);

-- Index für schnelle Dedupe-Abfrage im Webhook
CREATE INDEX IF NOT EXISTS idx_job_promotions_stripe_session ON job_promotions(stripe_session_id);
