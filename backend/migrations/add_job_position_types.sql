-- Migration: Add position_types (JSON array) to job_postings
-- Ermöglicht Mehrfachauswahl von Stellenarten (z.B. Fachkraft + Saisonjob + Work & Holiday)
-- Das bestehende position_type Feld bleibt für Abwärtskompatibilität erhalten

-- 1. Neue Spalte position_types hinzufügen (JSON Array)
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS position_types JSON DEFAULT '[]';

-- 2. Bestehende Daten migrieren: position_type -> position_types Array
-- Für alle Jobs, die bereits einen position_type haben, diesen in das Array übernehmen
UPDATE job_postings 
SET position_types = JSON_ARRAY(position_type)
WHERE position_type IS NOT NULL 
  AND (position_types IS NULL OR position_types = '[]' OR position_types = 'null');

-- 3. Index für bessere Abfrage-Performance (optional, für große Datenmengen)
-- CREATE INDEX IF NOT EXISTS idx_job_postings_position_types ON job_postings ((CAST(position_types AS CHAR(255))));

-- Hinweis: Nach dieser Migration werden neue Jobs mit position_types erstellt.
-- Das position_type Feld wird weiterhin synchron gehalten (erster Wert aus position_types)
-- für Abwärtskompatibilität mit altem Code/Frontend.
