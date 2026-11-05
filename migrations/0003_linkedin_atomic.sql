-- Atomic slot allocation for human-confirmed LinkedIn applications (max 10/day).
-- This migration must be applied before running the updated Worker.
CREATE TABLE IF NOT EXISTS linkedin_daily_slots (
 day TEXT NOT NULL,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 10),
 application_id TEXT NOT NULL UNIQUE REFERENCES applications(id),
 PRIMARY KEY(day,slot)
);

-- Reserve slots already used before this migration, preventing another 10 on migration day.
-- Host match excludes lookalike domains; email/government channels are not LinkedIn.
INSERT OR IGNORE INTO linkedin_daily_slots(day,slot,application_id)
SELECT sent_day, slot, id FROM (
  SELECT a.sent_day, a.id,
         ROW_NUMBER() OVER (PARTITION BY a.sent_day ORDER BY a.sent_at,a.id) AS slot
  FROM applications a JOIN jobs j ON j.id=a.job_id
  WHERE a.status='manually_sent' AND a.sent_day IS NOT NULL
    AND j.application_channel NOT IN ('email','government')
    AND (
      lower(j.url) LIKE 'https://linkedin.com/%' OR lower(j.url) LIKE 'https://%.linkedin.com/%'
      OR lower(j.url) LIKE 'https://linkedin.com?%' OR lower(j.url) LIKE 'https://%.linkedin.com?%'
      OR lower(j.url) IN ('https://linkedin.com','https://www.linkedin.com')
    )
) WHERE slot BETWEEN 1 AND 10;
