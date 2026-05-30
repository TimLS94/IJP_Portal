-- Migration: Company Digest und Score-Filter Felder
-- Datum: 2026-05-28
-- Fügt Bewerber-Digest und Score-Filter Einstellungen zur companies Tabelle hinzu

-- Bewerber-Digest E-Mail Einstellungen
ALTER TABLE companies ADD COLUMN IF NOT EXISTS applicant_digest_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS applicant_digest_days VARCHAR(20) DEFAULT '1,2,3,4,5';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS applicant_digest_hour INTEGER DEFAULT 8;

-- Score-Filter Einstellungen (ehemals Auto-Reject)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_reject_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_reject_threshold INTEGER DEFAULT 50;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_reject_delay_days INTEGER DEFAULT 7;

-- Rejection E-Mail Einstellungen (falls noch nicht vorhanden)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rejection_email_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rejection_email_subject VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rejection_email_text TEXT;
