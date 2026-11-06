-- Public employer boards, API responses checked on 2026-11-06.
-- These are discovery sources, not claims that any particular role fits the owner.
-- Existing boards and their enabled/disabled choices are preserved.
INSERT OR IGNORE INTO job_sources(id,provider,board,company) VALUES
 ('d24f84a3-08ed-49ed-bb29-3fb0d19fcc91','greenhouse','tamara','Tamara'),
 ('930a3d86-d01a-4665-915c-732e326c5f1b','greenhouse','brkz','BRKZ'),
 ('14076fc8-a35b-43de-9a40-2db21448902c','greenhouse','minio','MinIO'),
 ('2f01d8f0-7e44-4c98-8009-51bb1bd05084','lever','biocatch','BioCatch');
