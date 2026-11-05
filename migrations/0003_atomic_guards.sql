-- Additive migration: serializable LinkedIn cap and an expiring preparation lease.
ALTER TABLE jobs ADD COLUMN is_linkedin INTEGER NOT NULL DEFAULT 0 CHECK(is_linkedin IN (0,1));
ALTER TABLE jobs ADD COLUMN prepare_claim TEXT NOT NULL DEFAULT '';
ALTER TABLE jobs ADD COLUMN prepare_claim_at TEXT;
-- Backfill only recognized HTTPS LinkedIn hosts for existing jobs.
UPDATE jobs SET is_linkedin=1
  WHERE application_channel NOT IN ('email','government')
    AND (
      lower(url) LIKE 'https://linkedin.com/%' OR lower(url) LIKE 'https://linkedin.com?%'
      OR lower(url)='https://linkedin.com'
      OR lower(url) LIKE 'https://%.linkedin.com/%'
      OR lower(url) LIKE 'https://%.linkedin.com?%'
      OR lower(url) LIKE 'https://%.linkedin.com'
    );
CREATE INDEX IF NOT EXISTS ix_linkedin_jobs ON jobs(is_linkedin);
CREATE INDEX IF NOT EXISTS ix_app_sent_day ON applications(status,sent_day);
