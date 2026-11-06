-- NULL sorts first in SQLite, so every existing source receives a first turn.
ALTER TABLE job_sources ADD COLUMN last_checked_at TEXT;
CREATE INDEX IF NOT EXISTS ix_job_sources_rotation ON job_sources(enabled, last_checked_at, created_at, id);
