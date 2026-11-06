import test from 'node:test';
import assert from 'node:assert/strict';
import {outreachPolicy,hiringSignals} from '../src/outreach-policy.mjs';
test('government is Arabic and private employers follow the posting language',()=>{
 assert.equal(outreachPolicy({employer_type:'government'}).language,'ar');
 assert.equal(outreachPolicy({company:'وزارة الطاقة'}).language,'ar');
 assert.equal(outreachPolicy({url:'https://careers.example.gov.sa/job'}).language,'ar');
 assert.equal(outreachPolicy({company:'Company',employer_type:'private'}).language,'job_posting_language');
});
test('published hiring evidence makes no employee departure claim',()=>{
 const signals=hiringSignals([{company:'Test',url:'https://example.org/1'},{company:'Test',url:'https://example.org/2'}]);
 assert.equal(signals[0].vacancies,2);assert.equal(signals[0].evidence_urls.length,2);
 assert.match(signals[0].interpretation,/لا تثبت خروج/);
});
