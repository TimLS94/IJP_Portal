-- Migration: Admin Translation Fields für Job Postings
-- Datum: 2026-03-01
-- Beschreibung: Fügt Felder hinzu um zu tracken ob eine Stelle vom Admin übersetzt wurde

-- Neue Spalten für admin_translated Tracking
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS admin_translated BOOLEAN DEFAULT FALSE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS admin_translated_at TIMESTAMP;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS admin_translated_languages JSON DEFAULT '[]';

-- Index für schnelle Abfragen nach übersetzten Stellen
CREATE INDEX IF NOT EXISTS idx_job_postings_admin_translated ON job_postings(admin_translated) WHERE admin_translated = TRUE;
