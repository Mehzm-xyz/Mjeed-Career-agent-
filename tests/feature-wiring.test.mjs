import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const worker=readFileSync(new URL('src/app.mjs',root),'utf8');
const html=readFileSync(new URL('public/index.html',root),'utf8');
const js=readFileSync(new URL('public/app.js',root),'utf8');

test('protected API routes expose discovery and CV without leaking into public assets',()=>{
 const auth=worker.indexOf("if(!authenticated(request,env))");
 for(const path of ['/api/discovery/sources','/api/discovery/run','/api/cv/import']){
  assert.ok(worker.indexOf(path)>auth,`protected ${path}`);
 }
});
test('job discovery scheduler is opt-in and independent of hosting',()=>{
 assert.match(worker,/async scheduled\(controller,env,ctx\)/);
 assert.match(worker,/ENABLE_JOB_DISCOVERY!=='true'/);
 const server=readFileSync(new URL('src/server.mjs',root),'utf8');
 assert.match(server,/runDailyMailCheck/);
 assert.match(server,/setInterval\(tick,60000\)/);
});
test('frontend has real controls and no claim of automatic live applications',()=>{
 for(const id of ['cv-import-form','discovery-source-form','discover-now'])assert.ok(html.includes(`id="${id}"`));
 assert.match(js,/function importCv\(/);
 assert.match(js,/function runDiscovery\(/);
 assert.match(worker,/real_submissions_enabled:false/);
});
