-- Migration: Draft und Keep-Archived Felder für Job Postings + Job Templates
-- Datum: 2026-03-01
-- Beschreibung: Fügt is_draft und keep_archived Felder hinzu, erstellt job_templates Tabelle

-- Neue Spalten für job_postings
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS keep_archived BOOLEAN DEFAULT FALSE;

-- Index für Drafts (Firmen-Abfragen)
CREATE INDEX IF NOT EXISTS idx_job_postings_is_draft ON job_postings(is_draft);
CREATE INDEX IF NOT EXISTS idx_job_postings_keep_archived ON job_postings(keep_archived);

-- Job Templates Tabelle
CREATE TABLE IF NOT EXISTS job_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    position_type VARCHAR(50),
    position_types JSON DEFAULT '[]',
    employment_type VARCHAR(50),
    description TEXT,
    tasks TEXT,
    requirements TEXT,
    benefits TEXT,
    location VARCHAR(255),
    address VARCHAR(255),
    postal_code VARCHAR(20),
    remote_possible BOOLEAN DEFAULT FALSE,
    accommodation_provided BOOLEAN DEFAULT FALSE,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    salary_type VARCHAR(50),
    german_required VARCHAR(50),
    english_required VARCHAR(50),
    other_languages_required JSON DEFAULT '[]',
    additional_requirements JSON DEFAULT '{}',
    translations JSON DEFAULT '{}',
    available_languages JSON DEFAULT '["de"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_templates_company_id ON job_templates(company_id);
