import test from 'node:test';
import assert from 'node:assert/strict';
import {signedPayload,prepareMailPayload} from '../src/gmail-bridge.mjs';
const sample={recipient:'jobs@example.org',fullName:'Candidate',jobTitle:'Account Manager',company:'Example',coverLetter:'I am Candidate, and I am introducing my experience for the Account Manager role at Example. My CV is attached as a PDF for review.',attachmentPdf:new TextEncoder().encode('%PDF-1.4 fixture only')};
test('HMAC signature created for same payload',async()=>{
 const key='abcdefghijklmnopqrstuvwxyz-1234567890';
 const payload={request_id:'12345678-1234-1234-1234-123456789abc',recipient:'jobs@example.org',body:'hello'};
 const result=await signedPayload(payload,key);
 assert.match(result.signature,/^[a-f0-9]{64}$/);
 assert.equal(result.signature,(await signedPayload(payload,key)).signature);
 await assert.rejects(()=>signedPayload(payload,'short'));
});
test('email cannot fall back to a TXT resume or a generic one-line letter',()=>{
 assert.throws(()=>prepareMailPayload({...sample,recipient:'bad'}));
 assert.throws(()=>prepareMailPayload({...sample,attachmentPdf:new TextEncoder().encode('A text CV')}),/PDF/);
 assert.throws(()=>prepareMailPayload({...sample,coverLetter:'Please see my CV'}));
 assert.throws(()=>prepareMailPayload({...sample,coverLetter:'A generic letter without employer or role. '.repeat(5)}));
 const result=prepareMailPayload(sample);assert.equal(result.attachment_mime,'application/pdf');
 assert.equal(Buffer.from(result.attachment_base64,'base64').toString(),'%PDF-1.4 fixture only');
 assert.match(result.subject,/Account Manager.*Candidate.*Example/);
});
test('an explicit subject is sanitized without losing the selected role',()=>{
 assert.equal(prepareMailPayload({...sample,subject:'Account Manager\r\nTest'}).subject,'Account Manager  Test');
});
