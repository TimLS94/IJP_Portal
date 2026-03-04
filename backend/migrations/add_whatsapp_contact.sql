-- Migration: WhatsApp und bevorzugter Kontaktweg für Stellenangebote
-- Datum: 2026-03-04

-- Neue Spalten für job_postings
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS contact_whatsapp VARCHAR(50);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20);

-- Neue Spalten für job_templates (falls verwendet)
ALTER TABLE job_templates ADD COLUMN IF NOT EXISTS contact_whatsapp VARCHAR(50);
ALTER TABLE job_templates ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20);
