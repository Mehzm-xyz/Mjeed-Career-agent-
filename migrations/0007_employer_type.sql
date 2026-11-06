ALTER TABLE jobs ADD COLUMN employer_type TEXT NOT NULL DEFAULT 'unknown'
 CHECK(employer_type IN ('unknown','government','private'));
