-- Fügt fehlende Enum-Werte zu job_deletion_reason hinzu
-- Muss in Render → PostgreSQL → Query ausgeführt werden

ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'filled_via_jobon';
ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'filled_via_other';
ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'position_cancelled';
ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'company_closed';
ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'seasonal_end';
ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'budget_reasons';
ALTER TYPE job_deletion_reason ADD VALUE IF NOT EXISTS 'other';
