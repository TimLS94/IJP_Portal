-- Migration: Löschgründe für Stellenangebote
-- Datum: 2026-03-27

-- Enum-Typ für Löschgründe erstellen
DO $$ BEGIN
    CREATE TYPE job_deletion_reason AS ENUM (
        'filled_via_jobon',      -- Bewerber über JobOn gefunden (ERFOLG!)
        'filled_via_other',      -- Bewerber über andere Plattform gefunden
        'position_cancelled',    -- Stelle wird nicht mehr besetzt
        'company_closed',        -- Unternehmen geschlossen/pausiert
        'seasonal_end',          -- Saison beendet
        'budget_reasons',        -- Budgetgründe
        'other'                  -- Sonstiges
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Neue Spalten zur job_postings Tabelle hinzufügen
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS deletion_reason job_deletion_reason,
ADD COLUMN IF NOT EXISTS deletion_reason_note TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Index für Statistik-Abfragen
CREATE INDEX IF NOT EXISTS idx_job_postings_deletion_reason ON job_postings(deletion_reason) WHERE deletion_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_deleted_at ON job_postings(deleted_at) WHERE deleted_at IS NOT NULL;
