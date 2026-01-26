-- Migration: Neue Felder für Stellenangebote und Bewerber hinzufügen
-- Datum: 2026-01-26
-- Beschreibung: Fügt neue Felder für Jobs und Bewerber hinzu

-- ==================== JOB POSTINGS ====================

-- 1. Employment Type (Vollzeit/Teilzeit)
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20);

-- 2. Aufgaben
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS tasks TEXT;

-- 3. Adresse & PLZ
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS address VARCHAR(255);

ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- 4. Kontaktperson
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- ==================== BEWERBER (APPLICANTS) ====================

-- 5. Geschlecht
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- 6. Datenschutz
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT FALSE;

ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS privacy_accepted_at DATE;

-- Bestätigung
SELECT 'job_postings' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'job_postings' 
AND column_name IN ('employment_type', 'tasks', 'address', 'postal_code', 'contact_person', 'contact_phone', 'contact_email')
UNION ALL
SELECT 'applicants' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applicants' 
AND column_name IN ('gender', 'privacy_accepted', 'privacy_accepted_at');

