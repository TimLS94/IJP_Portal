"""
Migration: Löschgründe für Stellenangebote
Ausführen in Render Shell: python run_migration_deletion_reason.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL nicht gefunden!")
    exit(1)

# Render verwendet postgres:// aber SQLAlchemy braucht postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

migration_sql = """
-- Enum-Typ für Löschgründe erstellen
DO $$ BEGIN
    CREATE TYPE job_deletion_reason AS ENUM (
        'filled_via_jobon',
        'filled_via_other',
        'position_cancelled',
        'company_closed',
        'seasonal_end',
        'budget_reasons',
        'other'
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
"""

print("🚀 Starte Migration: Löschgründe für Stellenangebote...")

try:
    with engine.connect() as conn:
        conn.execute(text(migration_sql))
        conn.commit()
    print("✅ Migration erfolgreich!")
    print("   - Enum 'job_deletion_reason' erstellt")
    print("   - Spalten 'deletion_reason', 'deletion_reason_note', 'deleted_at' hinzugefügt")
    print("   - Indizes erstellt")
except Exception as e:
    print(f"❌ Fehler bei Migration: {e}")
    exit(1)
