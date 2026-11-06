ALTER TABLE profile ADD COLUMN excluded_employers TEXT NOT NULL DEFAULT '';
UPDATE profile SET phone='0550200170' WHERE id=1 AND email='abdulmjedalamri1@gmail.com';
UPDATE profile SET excluded_employers='eSense
Kite
Green Sustainability
Nexus
Your Event
Tejoury
تجوري' WHERE id=1 AND email='abdulmjedalamri1@gmail.com';
CREATE TABLE profile_files (
 id INTEGER PRIMARY KEY CHECK(id=1),
 filename TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 content_base64 TEXT NOT NULL,
 resume_text TEXT NOT NULL,
 sha256 TEXT NOT NULL
);
CREATE TABLE mail_threads (
 id TEXT PRIMARY KEY,
 application_id TEXT REFERENCES applications(id),
 recipient TEXT NOT NULL,
 subject TEXT NOT NULL,
 job_title TEXT NOT NULL DEFAULT '',
 company TEXT NOT NULL DEFAULT '',
 sent_at TEXT NOT NULL,
 last_checked_at TEXT,
 followup_state TEXT NOT NULL DEFAULT 'waiting',
 last_human_reply_at TEXT,
 UNIQUE(application_id)
);
CREATE TABLE mail_messages (
 id TEXT PRIMARY KEY,
 thread_id TEXT NOT NULL REFERENCES mail_threads(id) ON DELETE CASCADE,
 direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
 sender TEXT NOT NULL,
 body TEXT NOT NULL,
 received_at TEXT NOT NULL,
 classification TEXT NOT NULL,
 reply_draft TEXT NOT NULL DEFAULT '',
 draft_status TEXT NOT NULL DEFAULT 'needs_review'
);
CREATE TABLE mail_checks (
 id TEXT PRIMARY KEY,
 started_at TEXT NOT NULL,
 finished_at TEXT,
 status TEXT NOT NULL,
 checked INTEGER NOT NULL DEFAULT 0,
 imported INTEGER NOT NULL DEFAULT 0,
 error TEXT NOT NULL DEFAULT ''
);
CREATE TABLE task_leases (name TEXT PRIMARY KEY,expires_at TEXT NOT NULL);
CREATE TABLE market_evidence (
 id TEXT PRIMARY KEY,
 company TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('vacancy','expansion','employee_departure','other')),
 source_url TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 summary TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','verified','rejected')),
 UNIQUE(source_url,kind)
);
CREATE TABLE audit_log (
 id INTEGER PRIMARY KEY,
 action TEXT NOT NULL,
 entity_id TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
