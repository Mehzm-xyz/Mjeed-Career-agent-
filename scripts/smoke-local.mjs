// Full HTTP runtime check with a temporary database, without external services.
import assert from 'node:assert/strict';
import {startServer} from '../src/server.mjs';
import {openDatabase} from '../src/database.mjs';
const DB=openDatabase(':memory:');
const token='local-test-token-with-at-least-24-chars';
const runtime=await startServer({port:0,DB,APP_TOKEN:token});
try{
 const call=(path,options={})=>fetch(runtime.origin+'/api/'+path,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...options.headers}});
 const health=await fetch(runtime.origin+'/api/health');assert.equal((await health.json()).real_submissions_enabled,false);
 assert.equal((await fetch(runtime.origin+'/api/profile')).status,401);
 assert.equal((await fetch(runtime.origin+'/src/server.mjs')).status,404);
 assert.equal((await fetch(runtime.origin+'/')).status,200);
 const profile=(await (await call('profile')).json()).profile;assert.equal(profile.phone,'0550200170');
 const input={title:'Integration test',company:'Test only',city:'Riyadh',url:'https://example.org/jobs/CaseSensitive-ID?utm_source=test',description:'Local test only',application_channel:'portal'};
 const created=await call('jobs',{method:'POST',body:JSON.stringify(input)});assert.equal(created.status,201);const {id}=await created.json();
 assert.equal((await call('jobs',{method:'POST',body:JSON.stringify({...input,url:input.url.replace('utm_source=test','utm_source=other')})})).status,409);
 const noAI=await call(`jobs/${id}/analyze`,{method:'POST',body:'{}'});assert.equal(noAI.status,400);assert.match((await noAI.json()).error,/AI/);
 const text='Real local TXT import with professional sales and business development experience.';
 const form=new FormData();form.set('file',new File([text],'resume.txt',{type:'text/plain'}));
 const upload=await fetch(runtime.origin+'/api/cv/import',{method:'POST',headers:{authorization:`Bearer ${token}`},body:form});assert.equal(upload.status,200);
 const original=await call('cv/original');assert.equal(await original.text(),text);
 const mail=await (await call('mail/status')).json();assert.equal(mail.connected,false);assert.equal(mail.sending_enabled,false);
 const intelligence=await (await call('intelligence')).json();assert.equal(intelligence.ai_selected,false);assert.equal(intelligence.facts.vacancies,1);
 const data=await (await call('data/export')).json();assert.ok(data.profile_files.length);assert.ok(!JSON.stringify(data).includes(token));
 assert.equal((await call('browser-demo',{method:'POST',body:'{}'})).status,403);
 console.log('PASS: portable HTTP server, migrations, exact CV import/download, auth, vacancy deduplication, no default AI, mail status, career report and protected data export; no external sends');
}finally{await runtime.close();DB.close()}
