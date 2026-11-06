import test from 'node:test';
import assert from 'node:assert/strict';
import {rankJobs} from '../src/job-match.mjs';
const profile={resume_text:'Business development, B2B B2G enterprise sales, software solutions, tenders, CRM, pipeline and partnerships.'};
test('sales and BD outrank technical roles with explainable CV-derived signals',()=>{
 const jobs=rankJobs([{title:'Software Engineer',city:'Riyadh',description:'Work with sales team'},{title:'Business Development Manager',city:'Riyadh',description:'B2B enterprise sales, tenders and CRM'}],profile);
 assert.equal(jobs[0].title,'Business Development Manager');assert.ok(jobs[0].match_reasons.length);
 assert.match(jobs[1].match_review_notes.join(' '),/تخصص/);
});
test('missing CV is explicit and senior requirements are flagged rather than invented',()=>{
 assert.equal(rankJobs([{title:'Sales',city:'Riyadh'}],{})[0].match_score,0);
 const r=rankJobs([{title:'Sales Director',city:'Riyadh',description:'10+ years of experience'}],profile)[0];
 assert.match(r.match_review_notes.join(' '),/10\+ years/);
});
