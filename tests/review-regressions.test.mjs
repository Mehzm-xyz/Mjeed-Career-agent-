import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonicalJobKey, ATOMIC_CONFIRM_APPLICATION_SQL, CLAIM_PREPARATION_SQL, canRetryDemo} from '../src/core.mjs';

const worker=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('BUG-001 job form captured before first await, used after await',()=>{
  assert.match(app,/async function addJob\(e\)\{e\.preventDefault\(\);const form=e\.currentTarget;/);
  assert.match(app,/form\.reset\(\)/);
  assert.doesNotMatch(app,/e\.currentTarget\.reset\(\)/);
});
test('BUG-002 vacancy id preserved; tracking query ignored',()=>{
  const a=canonicalJobKey({url:'https://careers.example/job?id=101&utm_source=foo'});
  const b=canonicalJobKey({url:'https://careers.example/job?id=102&utm_source=foo'});
  assert.notEqual(a,b);
  assert.equal(a,canonicalJobKey({url:'https://careers.example/job?utm_source=bar&id=101'}));
  assert.equal(canonicalJobKey({url:'https://careers.example/job?b=2&a=1'}),canonicalJobKey({url:'https://careers.example/job?a=1&b=2'}));
});
test('BUG-003 reservation query checks duplicates atomically before AI generation',()=>{
  assert.match(CLAIM_PREPARATION_SQL,/NOT EXISTS/);
  const block=worker.split("if(evalMatch[2]==='analyze')")[1].split('const appMatch=')[0];
  assert.ok(block.indexOf('const claimed=')<block.indexOf("aiText(env,p,job,'prepare')"));
});
test('BUG-004 LinkedIn daily guard is single conditional UPDATE',()=>{
  assert.match(ATOMIC_CONFIRM_APPLICATION_SQL,/UPDATE applications/);
  assert.match(ATOMIC_CONFIRM_APPLICATION_SQL,/COUNT\(\*\)/);
  assert.match(ATOMIC_CONFIRM_APPLICATION_SQL,/RETURNING id/);
});
test('BUG-005 browser demo disabled leaves queued attempt retryable',()=>{
  assert.equal(canRetryDemo('queued'),true);
  assert.equal(canRetryDemo('failed'),true);
  assert.equal(canRetryDemo('demo_passed'),false);
  const block=worker.split("if(queueDemoMatch && request.method==='POST')")[1].split("if(path==='/api/connectors'")[0];
  assert.ok(block.indexOf("env.ENABLE_BROWSER_DEMO!=='true'")<block.indexOf('const result=await browserDemo'));
  assert.ok(block.indexOf('!env.MYBROWSER')<block.indexOf('const result=await browserDemo'));
});
