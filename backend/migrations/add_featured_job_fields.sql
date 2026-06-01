-- Migration: Add featured/highlighted job fields
-- Run this in Render Shell: psql $DATABASE_URL -f migrations/add_featured_job_fields.sql

-- Premium: Hervorgehobene Anzeigen
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS featured_by_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS featured_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS featured_approved_at TIMESTAMP WITH TIME ZONE;

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_job_postings_is_featured ON job_postings(is_featured) WHERE is_featured = TRUE;
