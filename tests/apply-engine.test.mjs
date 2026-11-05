import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPortal,ENGINE_REGISTRY,evaluateSendGate,safeHttpDestination} from '../src/apply-engine.mjs';
test('portals classify by verified host, not substring',()=>{
 assert.equal(classifyPortal('https://jobs.ashbyhq.com/example'),'ashby');
 assert.equal(classifyPortal('https://jobs.lever.co/example'),'lever');
 assert.equal(classifyPortal('https://mycompany.myworkdayjobs.com/en-US'),'workday');
 assert.equal(classifyPortal('https://evil-linkedin.com/careers'),'company');
 assert.equal(classifyPortal('https://www.linkedin.com/jobs/view/1'),'linkedin');
 assert.equal(classifyPortal('','email'),'email');
 assert.equal(classifyPortal('','government'),'jadarat');
 assert.equal(ENGINE_REGISTRY.linkedin.mode,'discovery_only');
});
test('reject untrusted navigation targets',()=>{
 for(const url of ['http://example.com','https://localhost/','https://127.0.0.1/','https://a.internal','https://user:pass@example.com','file:///etc/passwd','https://[::1]/'])assert.equal(safeHttpDestination(url),false,url);
 assert.equal(safeHttpDestination('https://jobs.example.com/careers'),true);
});
test('submission gate blocks time, 10 LinkedIn/day, missing approval, LinkedIn-only interval',()=>{
 const d=new Date('2026-11-05T09:00:00+03:00');
 assert.equal(evaluateSendGate({now:d,enabled:false,explicitApproval:true}).reason,'real_submission_disabled');
 assert.equal(evaluateSendGate({now:d,enabled:true,explicitApproval:false}).reason,'owner_approval_required');
 assert.equal(evaluateSendGate({now:d,enabled:true,explicitApproval:true,channel:'linkedin',sentToday:10}).reason,'outside_hours_or_daily_limit');
 assert.equal(evaluateSendGate({now:d,enabled:true,explicitApproval:true,channel:'workday',sentToday:100}).ok,true);
 assert.equal(evaluateSendGate({now:new Date('2026-11-05T17:00:00+03:00'),enabled:true,explicitApproval:true}).ok,false);
 assert.equal(evaluateSendGate({now:d,enabled:true,explicitApproval:true,channel:'linkedin',lastAttemptAt:'2026-11-05T05:58:00Z'}).reason,'minimum_interval_5_minutes');
 assert.equal(evaluateSendGate({now:d,enabled:true,explicitApproval:true,channel:'greenhouse',lastAttemptAt:'2026-11-05T05:58:00Z'}).ok,true);
 assert.equal(evaluateSendGate({now:d,enabled:true,explicitApproval:true,channel:'email',emailVerified:false}).ok,false);
 assert.equal(evaluateSendGate({now:d,enabled:true,explicitApproval:true}).ok,true);
});
