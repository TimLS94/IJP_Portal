-- Migration: Add indexes for application performance optimization
-- Date: 2026-06-10
-- Description: Adds indexes on foreign keys to speed up application queries

-- Index on applications.applicant_id (for joins with applicants table)
CREATE INDEX IF NOT EXISTS ix_applications_applicant_id ON applications(applicant_id);

-- Index on applications.job_posting_id (for joins with job_postings table)
CREATE INDEX IF NOT EXISTS ix_applications_job_posting_id ON applications(job_posting_id);

-- Index on applications.applied_at (for sorting by date)
CREATE INDEX IF NOT EXISTS ix_applications_applied_at ON applications(applied_at DESC);

-- Index on applications.is_filtered (for filtering)
CREATE INDEX IF NOT EXISTS ix_applications_is_filtered ON applications(is_filtered);

-- Index on application_documents.application_id
CREATE INDEX IF NOT EXISTS ix_application_documents_application_id ON application_documents(application_id);

-- Index on application_documents.document_id
CREATE INDEX IF NOT EXISTS ix_application_documents_document_id ON application_documents(document_id);

-- Composite index for common company query pattern
CREATE INDEX IF NOT EXISTS ix_applications_job_posting_filtered ON applications(job_posting_id, is_filtered);
