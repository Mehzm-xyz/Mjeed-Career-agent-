-- Schema intentionally separates factual resume from generated drafts.
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id=1),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  resume_text TEXT NOT NULL DEFAULT '',
  target_roles TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'الرياض',
  relocation INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO profile(id) VALUES (1);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  dedup_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  application_channel TEXT NOT NULL DEFAULT 'portal',
  recruitment_email TEXT NOT NULL DEFAULT '',
  analysis TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','manually_sent','unknown','cancelled')),
  tailored_resume TEXT NOT NULL DEFAULT '',
  cover_letter TEXT NOT NULL DEFAULT '',
  confirmation TEXT NOT NULL DEFAULT '',
  sent_at TEXT,
  sent_day TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_daily (
  day TEXT NOT NULL,
  category TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,category)
);
