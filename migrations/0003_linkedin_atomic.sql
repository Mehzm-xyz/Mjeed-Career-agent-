-- Atomic slot allocation for human-confirmed LinkedIn applications (max 10/day).
-- This migration must be applied before running the updated Worker.
CREATE TABLE IF NOT EXISTS linkedin_daily_slots (
 day TEXT NOT NULL,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 10),
 application_id TEXT NOT NULL UNIQUE REFERENCES applications(id),
 PRIMARY KEY(day,slot)
);
