-- Fix jobs that were activated via the company dashboard but still had is_draft=True
-- due to the bug where toggleActive only set is_active but not is_draft=False.
-- Also sets published_at if it was never set.

UPDATE job_postings
SET
    is_draft = FALSE,
    published_at = COALESCE(published_at, updated_at, created_at)
WHERE
    is_active = TRUE
    AND is_draft = TRUE
    AND is_archived = FALSE;
