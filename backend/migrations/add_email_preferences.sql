-- Migration: E-Mail-Präferenzen für Benutzer (DSGVO-konform)
-- Ermöglicht Benutzern, verschiedene E-Mail-Typen abzubestellen

-- E-Mail-Präferenzen hinzufügen (Standard: aktiviert)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_newsletter BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_job_alerts BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;

-- Kommentare für Dokumentation
COMMENT ON COLUMN users.email_newsletter IS 'Newsletter und Marketing E-Mails';
COMMENT ON COLUMN users.email_job_alerts IS 'Benachrichtigungen über neue passende Stellen';
COMMENT ON COLUMN users.email_notifications IS 'Allgemeine Benachrichtigungen (Bewerbungsstatus, Interview-Updates, etc.)';
