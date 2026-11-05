-- Additive tables. They do not send anything without independent explicit enablement.
CREATE TABLE IF NOT EXISTS dispatch_queue (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL UNIQUE REFERENCES applications(id),
 engine TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','demo_passed','needs_review','unknown','failed','cancelled')),
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS send_intents (
 id TEXT PRIMARY KEY,
 application_id TEXT NOT NULL UNIQUE REFERENCES applications(id),
 channel TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','confirmed','unknown','failed')),
 day TEXT NOT NULL,
 confirmation TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_send_intents_day ON send_intents(day,state);
