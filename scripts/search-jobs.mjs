// Read-only public employer search. No login, paid API, or application submission.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {fetchPublishedJobs} from '../src/discovery.mjs';
import {rankJobs} from '../src/job-match.mjs';
import {hiringSignals} from '../src/outreach-policy.mjs';
import {extractCvText} from '../src/cv-import.mjs';
import {ORIGINAL_RESUME_URL,ORIGINAL_RESUME_SHA256} from '../src/resume-source.mjs';

const args=process.argv.slice(2);
const flag=name=>{const i=args.indexOf(name);if(i<0)return '';if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+name);return args[i+1]};
const cv=flag('--cv'),output=flag('--out');
let bytes,name;
if(cv){bytes=await readFile(resolve(cv));name='resume'+extname(cv);}
else{
 const response=await fetch(ORIGINAL_RESUME_URL,{signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!response.ok)throw Error('CV download failed: HTTP '+response.status);
 bytes=new Uint8Array(await response.arrayBuffer());name='resume.pdf';
 if(createHash('sha256').update(bytes).digest('hex')!==ORIGINAL_RESUME_SHA256)throw Error('Original CV changed; use --cv with the current approved file');
}
const extracted=await extractCvText(name,bytes);
const profile={resume_text:extracted.text,target_roles:flag('--roles')};
const sources=[{provider:'greenhouse',board:'tamara',company:'Tamara'},{provider:'greenhouse',board:'brkz',company:'BRKZ'},{provider:'greenhouse',board:'minio',company:'MinIO'},{provider:'lever',board:'biocatch',company:'BioCatch'}];
const responses=await Promise.allSettled(sources.map(source=>fetchPublishedJobs(source)));
const errors=[],all=[];
responses.forEach((r,i)=>{if(r.status==='fulfilled')all.push(...r.value);else errors.push({company:sources[i].company,error:String(r.reason.message||r.reason)})});
const unique=[...new Map(all.map(j=>[j.dedup_key,j])).values()];
const ranked=rankJobs(unique,profile).filter(j=>profile.target_roles?j.is_target_role:j.match_score>=20);
const result={searched_at:new Date().toISOString(),sources:sources.length,saudi_jobs:unique.length,candidates:ranked.length,source_errors:errors,company_signals:hiringSignals(ranked),jobs:ranked,applications_sent:0};
if(output){
 const dir=resolve(output);await mkdir(dir,{recursive:true});
 await writeFile(join(dir,'jobs.json'),JSON.stringify(result,null,2));
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 const rows=[['title','company','city','priority_score','reasons','review_notes','url'],...ranked.map(j=>[j.title,j.company,j.city,j.match_score,j.match_reasons.join('؛ '),j.match_review_notes.join('؛ '),j.url])];
 await writeFile(join(dir,'jobs.csv'),'\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'));
}
console.log(JSON.stringify({...result,jobs:ranked.slice(0,10).map(({title,company,city,match_score,match_reasons,match_review_notes,url})=>({title,company,city,match_score,match_reasons,match_review_notes,url}))},null,2));
if(errors.length===sources.length)process.exitCode=1;
