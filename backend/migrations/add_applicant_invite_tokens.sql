-- Migration: Applicant Invite Tokens Tabelle
-- Datum: 2026-05-28
-- MUSS VOR add_anabin_and_invite_source_fields.sql ausgeführt werden!

-- Tabelle für Bewerber-Einladungslinks (Partner-Tracking)
CREATE TABLE IF NOT EXISTS applicant_invite_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    source_name VARCHAR(255) NOT NULL,
    source_country VARCHAR(100),
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Index für schnelle Token-Suche
CREATE INDEX IF NOT EXISTS idx_applicant_invite_tokens_token ON applicant_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_applicant_invite_tokens_active ON applicant_invite_tokens(is_active);
