import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBoard, boardApiUrl, saudiLocationRank, normalizeBoardJobs, fetchPublishedJobs, discoverAndSave} from '../src/discovery.mjs';
const source={provider:'greenhouse',board:'example',company:'Example Co'};
test('strict allowlisted ATS and slugs prevent arbitrary outgoing requests',()=>{
 assert.throws(()=>validateBoard({...source,provider:'arbitrary'}));
 assert.throws(()=>validateBoard({...source,board:'https://127.0.0.1'}));
 assert.throws(()=>validateBoard({...source,board:'x/../private'}));
 assert.match(boardApiUrl('greenhouse','example'),/^https:\/\/boards-api\.greenhouse\.io\//);
 assert.match(boardApiUrl('lever','example'),/^https:\/\/api\.lever\.co\//);
 assert.match(boardApiUrl('ashby','example'),/^https:\/\/api\.ashbyhq\.com\//);
});
test('Riyadh priority, other KSA second, unknown/foreign excluded',()=>{
 assert.equal(saudiLocationRank('Riyadh, Saudi Arabia'),0);
 assert.equal(saudiLocationRank('الرياض'),0);
 assert.equal(saudiLocationRank('Jeddah, Saudi Arabia'),1);
 assert.equal(saudiLocationRank('London, UK'),-1);
 assert.equal(saudiLocationRank('Remote, EMEA'),-1);
});
test('Greenhouse only published Saudi vacancies, Riyadh first, unique identifiers preserved',()=>{
 const jobs=normalizeBoardJobs('greenhouse',{jobs:[
   {title:'Analyst',absolute_url:'https://boards.greenhouse.io/x/jobs/1',location:{name:'Jeddah'},content:'<p>Great</p>'},
   {title:'Analyst',absolute_url:'https://boards.greenhouse.io/x/jobs/2',location:{name:'Riyadh'},content:'<p>Better</p>'},
   {title:'Engineer',absolute_url:'https://boards.greenhouse.io/x/jobs/3',location:{name:'London'}}
 ]},source);
 assert.equal(jobs.length,2);assert.equal(jobs[0].priority,0);assert.equal(jobs[0].city,'Riyadh');
 assert.notEqual(jobs[0].dedup_key,jobs[1].dedup_key);
});
test('Lever and Ashby adapt source job records without applying',()=>{
 const lever=normalizeBoardJobs('lever',[{text:'Designer',hostedUrl:'https://jobs.lever.co/co/123',categories:{location:'Riyadh'}}],{provider:'lever',board:'co',company:'Co'});
 const ashby=normalizeBoardJobs('ashby',{jobs:[
   {title:'Analyst',jobUrl:'https://jobs.ashbyhq.com/co/1',location:'Riyadh',isListed:true},
   {title:'Hidden',jobUrl:'https://jobs.ashbyhq.com/co/2',location:'Riyadh',isListed:false}
 ]},{provider:'ashby',board:'co',company:'Co'});
 assert.equal(lever.length,1);assert.equal(ashby.length,1);
});
test('HTTP failures fail closed without any POST or arbitrary destinations',async()=>{
 let sent=0;
 await assert.rejects(fetchPublishedJobs(source,async(url,opts)=>{sent++;assert.equal(opts.method,'GET');return {ok:false,status:429};}),/429/);
 assert.equal(sent,1);
});
test('discovery persists only unique jobs, reports source failures without fake submissions',async()=>{
 let inserts=0;
 const db={
   prepare(q){return {
     bind(...args){return {
       async run(){if(q.includes('INSERT OR IGNORE'))inserts++;return {meta:{changes:1}};}
     };},
     async all(){return {results:[source]};}
   };}
 };
 const fetcher=async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({jobs:[{title:'Analyst',absolute_url:'https://boards.greenhouse.io/x/jobs/1',location:{name:'Riyadh'}}]})});
 const r=await discoverAndSave({JOBS_DB:db},fetcher);
 assert.equal(inserts,1);assert.equal(r.created,1);assert.equal(r.real_applications_sent,0);
});
