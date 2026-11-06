// Real local workerd + D1 checks. No Cloudflare account or live mail/application sends.
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
const wrangler=join(root,'node_modules/wrangler/bin/wrangler.js');
const temporary=await mkdtemp(join(tmpdir(),'masar-smoke-'));
const configPath=join(root,'.wrangler.smoke.jsonc');
const config=JSON.parse(await readFile(join(root,'wrangler.jsonc'),'utf8'));
config.d1_databases[0].database_id='00000000-0000-4000-8000-000000000000';
delete config.browser;delete config.ai;delete config.triggers;
const token=randomBytes(24).toString('hex');
config.vars.APP_TOKEN=token;
const childEnv={...process.env,WRANGLER_SEND_METRICS:'false',BROWSER:'none'};
const exec=promisify(execFile);
const port=await new Promise((resolvePort,reject)=>{
 const server=createServer();server.on('error',reject);
 server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolvePort(port))});
});
let worker,logs='';
try{
 await writeFile(configPath,JSON.stringify(config),{mode:0o600});
 await exec(process.execPath,[wrangler,'d1','migrations','apply','JOBS_DB','--local','--config',configPath,'--persist-to',temporary],{cwd:root,env:childEnv,timeout:60000,maxBuffer:1000000});
 worker=spawn(process.execPath,[wrangler,'dev','--local','--config',configPath,'--port',String(port),'--ip','127.0.0.1','--persist-to',temporary],{cwd:root,env:childEnv,stdio:['ignore','pipe','pipe']});
 for(const stream of [worker.stdout,worker.stderr])stream.on('data',b=>{logs=(logs+b.toString()).slice(-16000)});
 const origin=`http://127.0.0.1:${port}`;
 let ready=false;
 for(let i=0;i<150;i++){
  if(worker.exitCode!==null)throw Error(`Local worker exited (${worker.exitCode})`);
  try{const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 assert.ok(ready,'Local worker became ready');
 const call=(path,options={})=>fetch(origin+'/api/'+path,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...options.headers}});
 const health=await fetch(origin+'/api/health');assert.equal((await health.json()).real_submissions_enabled,false);
 assert.equal((await fetch(origin+'/api/profile')).status,401);
 const profile=(await (await call('profile')).json()).profile;
 assert.equal(profile.full_name,'Abdulmajeed Alamri');
 assert.match(profile.resume_text,/Bachelor's Degree in Hebrew Language/);
 assert.match(profile.resume_text,/39M\+/);
 assert.equal(profile.target_roles,'');
 assert.match(profile.resume_sha256,/^[a-f0-9]{64}$/);
 const sources=await (await call('discovery/sources')).json();assert.equal(sources.sources.length,4);
 const sourceLeak=await fetch(origin+'/migrations/0005_owner_resume.sql');
 assert.ok(!(await sourceLeak.text()).includes(profile.email),'Source migrations are not public assets');
 const input={title:'Integration test',company:'Test only',city:'Riyadh',url:'https://example.org/jobs/CaseSensitive-ID?utm_source=test',description:'Local test only',application_channel:'portal'};
 const created=await call('jobs',{method:'POST',body:JSON.stringify(input)});assert.equal(created.status,201);
 const {id}=await created.json();
 assert.equal((await call('jobs',{method:'POST',body:JSON.stringify({...input,url:input.url.replace('utm_source=test','utm_source=other')})})).status,409);
 const jobs=await (await call('jobs')).json();assert.equal(jobs.jobs.length,1);
 const noAI=await call(`jobs/${id}/analyze`,{method:'POST',body:'{}'});assert.equal(noAI.status,400);
 assert.match((await noAI.json()).error,/AI/);
 const text='Real local TXT import with professional sales and business development experience.';
 const form=new FormData();form.set('file',new File([text],'resume.txt',{type:'text/plain'}));
 const upload=await fetch(origin+'/api/cv/import',{method:'POST',headers:{authorization:`Bearer ${token}`},body:form});
 assert.equal(upload.status,200);assert.equal((await upload.json()).format,'txt');
 const changed=(await (await call('profile')).json()).profile;
 assert.equal(changed.resume_text,text);assert.equal(changed.resume_original_url,'');
 assert.equal((await call('cv/original')).status,404);
 assert.equal((await call('browser-demo',{method:'POST',body:'{}'})).status,403);
 console.log('PASS: real local Worker + D1 migrations + seeded CV + four employer boards + protected API + real TXT import + deduplication + disabled external sends');
}catch(error){
 console.error(logs.replaceAll(token,'[test-token]'));throw error;
}finally{
 if(worker){worker.kill('SIGTERM');await Promise.race([new Promise(r=>worker.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);if(worker.exitCode===null)worker.kill('SIGKILL')}
 await rm(configPath,{force:true});await rm(temporary,{recursive:true,force:true});
}
