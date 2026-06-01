-- Migration: Add missing employment type enum values
-- Run this in Render Shell: psql $DATABASE_URL -f migrations/add_employment_type_values.sql

-- Add new enum values to employmenttype
ALTER TYPE employmenttype ADD VALUE IF NOT EXISTS 'mini_job';
ALTER TYPE employmenttype ADD VALUE IF NOT EXISTS 'seasonal';
ALTER TYPE employmenttype ADD VALUE IF NOT EXISTS 'internship';
