-- Migration: Füge published_at Spalte zur job_postings Tabelle hinzu
-- Datum: 2026-05-30
-- Beschreibung: Speichert das erste Aktivierungsdatum einer Stelle (unabhängig von created_at)
--               Bleibt leer bis zur ersten Aktivierung. Wird bei erneuter Aktivierung NICHT überschrieben.

ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Für bereits aktive Stellen: published_at auf created_at setzen (Fallback)
UPDATE job_postings SET published_at = created_at WHERE is_active = TRUE AND published_at IS NULL;
