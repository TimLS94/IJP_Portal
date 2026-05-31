-- Add language field to blog_posts (de/en/es)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'de';
CREATE INDEX IF NOT EXISTS ix_blog_posts_language ON blog_posts (language);
