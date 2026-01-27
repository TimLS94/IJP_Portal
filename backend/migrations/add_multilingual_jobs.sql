-- Migration: Mehrsprachige Stellenausschreibungen
-- Datum: 2026-01-27

-- Neue Felder für Übersetzungen
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS translations JSON DEFAULT '{}';
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS available_languages JSON DEFAULT '["de"]';

-- Kommentar: 
-- translations Format: {"en": {"title": "...", "description": "...", "tasks": "...", "requirements": "...", "benefits": "..."}, "es": {...}, "ru": {...}}
-- available_languages: ["de", "en", "es", "ru"] - Liste der verfügbaren Sprachen für diese Stelle

