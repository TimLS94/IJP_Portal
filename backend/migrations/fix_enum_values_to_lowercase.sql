-- Migration: Konvertiere alle Enum-Werte von UPPERCASE zu lowercase
-- Datum: 2026-01-27
-- WICHTIG: Backup vor Ausführung erstellen!

-- 1. Users: role
UPDATE users SET role = LOWER(role) WHERE role != LOWER(role);

-- 2. Job Postings
UPDATE job_postings SET position_type = LOWER(position_type) WHERE position_type IS NOT NULL AND position_type != LOWER(position_type);
UPDATE job_postings SET employment_type = LOWER(employment_type) WHERE employment_type IS NOT NULL AND employment_type != LOWER(employment_type);
UPDATE job_postings SET german_required = LOWER(german_required) WHERE german_required IS NOT NULL AND german_required != LOWER(german_required);
UPDATE job_postings SET english_required = LOWER(english_required) WHERE english_required IS NOT NULL AND english_required != LOWER(english_required);

-- 3. Applicants
UPDATE applicants SET position_type = LOWER(position_type) WHERE position_type IS NOT NULL AND position_type != LOWER(position_type);
UPDATE applicants SET gender = LOWER(gender) WHERE gender IS NOT NULL AND gender != LOWER(gender);
UPDATE applicants SET german_level = LOWER(german_level) WHERE german_level IS NOT NULL AND german_level != LOWER(german_level);
UPDATE applicants SET english_level = LOWER(english_level) WHERE english_level IS NOT NULL AND english_level != LOWER(english_level);

-- 4. Applications
UPDATE applications SET status = LOWER(status) WHERE status IS NOT NULL AND status != LOWER(status);

-- 5. Documents
UPDATE documents SET document_type = LOWER(document_type) WHERE document_type IS NOT NULL AND document_type != LOWER(document_type);

-- 6. Company Requests
UPDATE company_requests SET request_type = LOWER(request_type) WHERE request_type IS NOT NULL AND request_type != LOWER(request_type);
UPDATE company_requests SET status = LOWER(status) WHERE status IS NOT NULL AND status != LOWER(status);

-- 7. Job Requests
UPDATE job_requests SET position_type = LOWER(position_type) WHERE position_type IS NOT NULL AND position_type != LOWER(position_type);
UPDATE job_requests SET status = LOWER(status) WHERE status IS NOT NULL AND status != LOWER(status);

-- 8. Interviews
UPDATE interviews SET status = LOWER(status) WHERE status IS NOT NULL AND status != LOWER(status);

-- 9. Blog Posts
UPDATE blog_posts SET category = LOWER(category) WHERE category IS NOT NULL AND category != LOWER(category);

-- 10. Company Members
UPDATE company_members SET role = LOWER(role) WHERE role IS NOT NULL AND role != LOWER(role);

