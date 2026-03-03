-- Migration: Füge last_login_at Spalte zur users Tabelle hinzu
-- Datum: 2026-03-03
-- Beschreibung: Speichert den letzten Login-Zeitpunkt für Admin-Übersicht

-- Spalte hinzufügen (falls nicht vorhanden)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Optional: Index für Sortierung nach letztem Login
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
