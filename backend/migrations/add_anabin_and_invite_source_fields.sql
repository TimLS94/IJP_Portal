-- Migration: Anabin-Verifizierung und Invite-Source Felder
-- Datum: 2026-05-27
-- Diese Migration fügt Felder für die Anabin-Universitätsverifizierung 
-- und die Partner/Einladungsquellen-Verfolgung hinzu.

-- ========== ANABIN UNI-VERIFIZIERUNG ==========
-- Prüft ob Spalten bereits existieren bevor sie hinzugefügt werden

ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_verified VARCHAR(50) DEFAULT 'not_checked';
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_match_score INTEGER;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_institution_name VARCHAR(500);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_institution_id VARCHAR(100);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_status VARCHAR(50);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_notes TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_checked_at DATE;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_checked_by INTEGER REFERENCES users(id);

-- ========== EINLADUNGS-QUELLE (Partner-Tracking) ==========
-- Wird gesetzt wenn Bewerber sich über Einladungslink/Partner registriert

ALTER TABLE applicants ADD COLUMN IF NOT EXISTS invite_source VARCHAR(255);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS invite_source_country VARCHAR(100);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS invite_token_id INTEGER REFERENCES applicant_invite_tokens(id);

-- Index für schnellere Abfragen nach Einladungsquelle
CREATE INDEX IF NOT EXISTS idx_applicants_invite_source ON applicants(invite_source);
CREATE INDEX IF NOT EXISTS idx_applicants_anabin_verified ON applicants(anabin_verified);
