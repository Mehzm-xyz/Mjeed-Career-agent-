import test from 'node:test';
import assert from 'node:assert/strict';
import {signedPayload,prepareMailPayload} from '../src/gmail-bridge.mjs';
test('HMAC signature created for same payload',async()=>{
 const key='abcdefghijklmnopqrstuvwxyz-1234567890';
 const payload={request_id:'12345678-1234-1234-1234-123456789abc',recipient:'jobs@example.org',body:'hello'};
 const result=await signedPayload(payload,key);
 assert.match(result.signature,/^[a-f0-9]{64}$/);
 assert.equal(result.signature,(await signedPayload(payload,key)).signature);
 await assert.rejects(()=>signedPayload(payload,'short'));
});
test('email payload requires verified address, cover letter and resume',()=>{
 assert.throws(()=>prepareMailPayload({recipient:'bad',coverLetter:'x',attachmentText:'cv'}));
 assert.throws(()=>prepareMailPayload({recipient:'careers@example.com',coverLetter:'',attachmentText:'cv'}));
 assert.equal(prepareMailPayload({recipient:'careers@example.com',fullName:'Test',jobTitle:'Partnerships',company:'Example',coverLetter:'Letter',attachmentText:'CV'}).recipient,'careers@example.com');
});
