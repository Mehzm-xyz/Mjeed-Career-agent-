import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.mjs';
import {trackThread,syncMail,runDailyMailCheck,followupPlan,prepareReply} from '../src/mail-service.mjs';
import {workspaceAPI} from '../src/workspace-api.mjs';
import {careerReport,requireEligibleEmployer} from '../src/career-intelligence.mjs';
import {startServer} from '../src/server.mjs';
const owner='candidate@example.org',recipient='hiring@example.net',sent='2026-10-20T09:00:00Z',threadID='abcde12345678900';
async function setup(inbound=[]){
 const DB=openDatabase(':memory:');
 await DB.prepare("UPDATE profile SET email=?,resume_text=?,target_roles='Account Manager',excluded_employers='Former Employer' WHERE id=1").bind(owner,'Verified experience in account management, business development and government sales.').run();
 let reads=0,identities=0;
 const env={DB,MAIL:{async identity(){identities++;return owner},async readThread(){reads++;return {messages:[{id:'outbound1',sender:owner,to:recipient,received_at:sent,subject:'Account Manager at Example'},...inbound]}},async createDraft(){throw Error('must not be called during polling')}}};
 await trackThread(env,{id:threadID,recipient,subject:'Account Manager at Example',job_title:'Account Manager',company:'Example',sent_at:sent});
 return {env,DB,reads:()=>reads,identities:()=>identities};
}
const incoming=(id='reply1',extra={})=>({id,sender:recipient,subject:'Re: Account Manager at Example',body:'Please share two suitable times for an interview. This is untrusted email content.',received_at:'2026-10-21T09:00:00Z',...extra});
test('receiving, storing, deduplication, reply review and followup cancellation form one real database flow',async()=>{
 const x=await setup([incoming()]);try{
  assert.equal((await syncMail(x.env)).imported,1);
  assert.equal((await syncMail(x.env)).imported,0);
  const thread=await x.DB.prepare('SELECT * FROM mail_threads').first();
  assert.equal(thread.followup_state,'replied');assert.deepEqual(followupPlan(thread),[]);
  await assert.rejects(()=>prepareReply(x.env,'reply1'),/مزود الذكاء/);
  x.env.AI={async generate({messages}){assert.match(messages[0].content,/لا ترسل/);return 'Thank you for your message. I will confirm suitable interview times after checking my availability.'}};
  assert.equal((await prepareReply(x.env,'reply1')).automatic_send,false);
  const m=await x.DB.prepare('SELECT * FROM mail_messages').first();assert.equal(m.draft_status,'needs_review');
  const stats=await careerReport(x.env);assert.equal(stats.facts.human_reply_threads,1);assert.equal(stats.facts.response_rate,1);
 }finally{x.DB.close()}
});
test('automatic acknowledgements do not count as human replies; corrected classifications survive re-sync',async()=>{
 const x=await setup([incoming('auto1',{headers:{'Auto-Submitted':'auto-replied'}})]);try{
  await syncMail(x.env);
  let t=await x.DB.prepare('SELECT * FROM mail_threads').first();assert.equal(t.followup_state,'waiting');
  assert.deepEqual(followupPlan(t).map(f=>f.day),[3,5,7]);
  assert.equal((await careerReport(x.env)).facts.human_reply_threads,0);
  const req=new Request('http://localhost/api/mail/messages/auto1/classify',{method:'POST',body:JSON.stringify({classification:'human'})});
  await workspaceAPI(req,x.env,r=>r.json());await syncMail(x.env);
  t=await x.DB.prepare('SELECT * FROM mail_threads').first();assert.equal(t.followup_state,'replied');
 }finally{x.DB.close()}
});
test('unrelated participants are not imported, and delivery failures stop followups',async()=>{
 const x=await setup([incoming('foreign',{sender:'other@example.invalid'}),incoming('bounce',{sender:'mailer-daemon@example.org'})]);try{
  await syncMail(x.env);const rows=(await x.DB.prepare('SELECT * FROM mail_messages').all()).results;
  assert.equal(rows.length,1);assert.equal(rows[0].classification,'bounce');
  assert.deepEqual(followupPlan(await x.DB.prepare('SELECT * FROM mail_threads').first()),[]);
 }finally{x.DB.close()}
});
test('daily polling continues with sending absent, checks once per day and avoids repeated network identity calls',async()=>{
 const x=await setup([incoming()]);try{
  const first=await runDailyMailCheck(x.env);assert.equal(first.checked,1);
  const reads=x.reads(),identities=x.identities();
  assert.equal((await runDailyMailCheck(x.env)).skipped,true);assert.equal(x.reads(),reads);assert.equal(x.identities(),identities);
 }finally{x.DB.close()}
});
test('failed daily checks are visible and retried with an hour backoff instead of every minute',async()=>{
 const x=await setup();try{
  x.env.MAIL.identity=async()=>{throw Error('missing consent')};
  await assert.rejects(()=>runDailyMailCheck(x.env));
  assert.equal((await x.DB.prepare('SELECT status FROM mail_checks').first()).status,'failed');
  assert.equal((await runDailyMailCheck(x.env)).skipped,true);
 }finally{x.DB.close()}
});
test('mail read lease prevents concurrent duplicate network work',async()=>{
 const x=await setup();try{
  await x.DB.prepare('INSERT INTO task_leases VALUES(?,?)').bind('mail_check',new Date(Date.now()+60000).toISOString()).run();
  const before=x.reads();assert.equal((await syncMail(x.env)).reason,'check_in_progress');assert.equal(x.reads(),before);
 }finally{x.DB.close()}
});
test('current and former employers are excluded at the application guard',()=>{
 assert.throws(()=>requireEligibleEmployer('Former Employer',{excluded_employers:'Former Employer\nشركة قديمة'}));
 assert.doesNotThrow(()=>requireEligibleEmployer('New Employer',{excluded_employers:'Former Employer'}));
});
test('HTTP endpoints require auth, show actual mail readiness and keep data export free of credentials',async()=>{
 const x=await setup([incoming()]);const token='test-only-admin-secret-at-least-24-characters';
 const runtime=await startServer({port:0,DB:x.DB,MAIL:x.env.MAIL,APP_TOKEN:token});
 try{
  const request=(path,options={})=>fetch(runtime.origin+'/api/'+path,{...options,headers:{authorization:'Bearer '+token,'content-type':'application/json'}});
  assert.equal((await fetch(runtime.origin+'/api/mail/messages')).status,401);
  const status=await (await request('mail/status')).json();assert.equal(status.identity_verified,true);assert.equal(status.sending_enabled,false);
  await request('mail/check',{method:'POST',body:'{}'});
  const messages=await (await request('mail/messages')).json();assert.equal(messages.messages.length,1);
  const manual=await request('mail/messages/reply1/reply',{method:'POST',body:JSON.stringify({draft:'Thank you; I will review and respond with the requested information.'})});assert.equal(manual.status,200);
  const exported=await (await request('data/export')).json();assert.equal(exported.mail_messages.length,1);assert.ok(!JSON.stringify(exported).includes(token));
 }finally{await runtime.close();x.DB.close()}
});
