import test from 'node:test';
import assert from 'node:assert/strict';
import {canSubmit,riyadhClock,canonicalJobKey,validateJob} from '../src/core.mjs';

test('Riyadh window excludes night and 17:00 sharp',()=>{
  assert.equal(canSubmit(new Date('2026-11-05T05:59:00Z')),false); // 08:59
  assert.equal(canSubmit(new Date('2026-11-05T06:00:00Z')),true); // 09:00
  assert.equal(canSubmit(new Date('2026-11-05T13:59:00Z')),true); // 16:59
  assert.equal(canSubmit(new Date('2026-11-05T14:00:00Z')),false); // 17:00
  assert.equal(riyadhClock(new Date('2026-11-05T14:00:00Z')).day,'2026-11-05');
  assert.equal(canSubmit(new Date('2026-11-05T07:00:00Z'),10,'linkedin'),false);
  assert.equal(canSubmit(new Date('2026-11-05T07:00:00Z'),100,'company'),true);
  assert.equal(canSubmit(new Date('2026-11-05T07:00:00Z'),100,'email'),true);
});
test('normalized URLs deduplicate tracking parameters',()=>{
  assert.equal(canonicalJobKey({url:'https://example.com/jobs/42?ref=a'}),canonicalJobKey({url:'https://example.com/jobs/42?ref=b'}));
  assert.throws(()=>canonicalJobKey({url:'http://example.com/job'}));
});
test('reject malformed or untrusted job payloads',()=>{
  assert.throws(()=>validateJob({title:'x',company:'y',application_channel:'hidden'}));
  assert.throws(()=>validateJob({title:'',company:'y'}));
  assert.equal(validateJob({title:'Head of Partnerships',company:'Example',url:''}).dedup_key,'job:example::head of partnerships');
});

test('job query identifiers are distinct while tracking tags do not affect identity',()=>{
  const a=canonicalJobKey({url:'https://careers.example.com/job?id=101&utm_source=one'});
  const b=canonicalJobKey({url:'https://careers.example.com/job?utm_source=two&id=102'});
  assert.notEqual(a,b);
  assert.equal(a,canonicalJobKey({url:'https://careers.example.com/job?utm_source=other&id=101'}));
  assert.equal(a,canonicalJobKey({url:'https://careers.example.com/job?id=101'}));
  assert.equal(canonicalJobKey({url:'https://careers.example.com/job?b=2&a=1'}),canonicalJobKey({url:'https://careers.example.com/job?a=1&b=2'}));
});
