-- Migration: Draft und Keep-Archived Felder für Job Postings
-- Datum: 2026-03-01
-- Beschreibung: Fügt is_draft und keep_archived Felder hinzu

-- Neue Spalten
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS keep_archived BOOLEAN DEFAULT FALSE;

-- Index für Drafts (Firmen-Abfragen)
CREATE INDEX IF NOT EXISTS idx_job_postings_is_draft ON job_postings(is_draft);
CREATE INDEX IF NOT EXISTS idx_job_postings_keep_archived ON job_postings(keep_archived);
