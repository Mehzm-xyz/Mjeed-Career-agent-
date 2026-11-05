import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
const frontend=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../migrations/0003_linkedin_atomic.sql',import.meta.url),'utf8');
test('addJob captures form before await',()=>{
  assert.match(frontend,/async function addJob\(e\)\{e.preventDefault\(\);const form=e.currentTarget/);
  assert.match(frontend,/closeModal\('job-modal'\);form.reset\(\)/);
});
test('prepare checks duplicate before requesting AI',()=>{
  const section=worker.split("if(evalMatch[2]==='analyze')")[1].split('const appMatch=')[0];
  assert.ok(section.indexOf("SELECT id FROM applications WHERE job_id=?")<section.indexOf("aiText(env,p,job,'prepare')"));
});
test('LinkedIn daily confirmation uses transactional unique slot allocation',()=>{
  assert.match(worker,/JOBS_DB.batch\(\[reserve,confirm\]\)/);
  assert.match(worker,/INSERT OR IGNORE INTO linkedin_daily_slots/);
  assert.match(migration,/PRIMARY KEY\(day,slot\)/);
  assert.match(migration,/application_id TEXT NOT NULL UNIQUE/);
});
test('browser demo precondition does not mutate queue',()=>{
  const section=worker.split('const queueDemoMatch=')[1].split("if(path==='/api/connectors'")[0];
  assert.ok(section.indexOf("if(env.ENABLE_BROWSER_DEMO!=='true')")<section.indexOf('const result=await browserDemo'));
  assert.match(section,/passed\?'demo_passed':'queued'/);
});

test('migration reserves LinkedIn slots for preexisting human-confirmed applications',()=>{
  assert.match(migration,/INSERT OR IGNORE INTO linkedin_daily_slots\(day,slot,application_id\)/);
  assert.match(migration,/ROW_NUMBER\(\) OVER \(PARTITION BY a\.sent_day/);
});
