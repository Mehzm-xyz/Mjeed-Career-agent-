-- Safe source catalog: caller selects ATS provider + board token, never an arbitrary URL.
CREATE TABLE IF NOT EXISTS job_sources (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('greenhouse','lever','ashby')),
  board TEXT NOT NULL,
  company TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,board)
);
CREATE TABLE IF NOT EXISTS discovery_runs (
  id TEXT PRIMARY KEY,
  run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sources INTEGER NOT NULL DEFAULT 0,
  seen INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL DEFAULT 0,
  errors TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS ix_discovery_runs_at ON discovery_runs(run_at);
