// Read-only, allowlisted ATS job discovery. Never submit applications here.
import { validateJob } from './core.mjs';

export const DISCOVERY_PROVIDERS = Object.freeze(['greenhouse','lever','ashby']);
const BOARD_RE=/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/;
const SAUDI=/\b(saudi(?: arabia)?|ksa|riyadh|jeddah|dammam|khobar|dhahran|mecca|makkah|medina|madinah|tabuk|abha|taif|jubail|yanbu|qassim|qaseem)\b|السعودية|الرياض|جدة|الدمام|الخبر|الظهران|مكة|المدينة|تبوك|أبها|الطائف|الجبيل|ينبع|القصيم/i;
const RIYADH=/\briyadh\b|الرياض/i;

export function validateBoard(input={}) {
  const provider=String(input.provider||'').trim().toLowerCase();
  const board=String(input.board||'').trim();
  const company=String(input.company||'').trim().slice(0,130);
  if(!DISCOVERY_PROVIDERS.includes(provider)) throw new Error('مزود الوظائف غير مدعوم');
  if(!BOARD_RE.test(board))throw new Error('رمز لوحة التوظيف غير صالح');
  if(!company||company.length<2)throw new Error('اسم الشركة مطلوب');
  return {provider,board,company};
}
export function boardApiUrl(provider,board) {
  const valid=validateBoard({provider,board,company:'Employer'});
  const b=encodeURIComponent(valid.board);
  switch(valid.provider){
    case 'greenhouse':return `https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`;
    case 'lever':return `https://api.lever.co/v0/postings/${b}?mode=json&limit=100`;
    case 'ashby':return `https://api.ashbyhq.com/posting-api/job-board/${b}`;
  }
}
export function saudiLocationRank(location) {
  const s=String(location||'');
  if(RIYADH.test(s))return 0;
  if(SAUDI.test(s))return 1;
  return -1; // Unknown or outside KSA: never silently classify as Saudi.
}
function cleanDescription(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,10000);}
export function normalizeBoardJobs(provider,data,source){
  const {board,company}=validateBoard({...source,provider});
  let items=[];
  if(provider==='greenhouse'){
    if(!Array.isArray(data?.jobs))throw new Error('استجابة Greenhouse غير صالحة');
    items=data.jobs.map(j=>({title:j.title,url:j.absolute_url,location:j.location?.name,description:j.content,department:j.departments?.[0]?.name}));
  } else if(provider==='lever'){
    if(!Array.isArray(data))throw new Error('استجابة Lever غير صالحة');
    items=data.map(j=>({title:j.text,url:j.hostedUrl,location:j.categories?.location || j.categories?.allLocations?.join(', '),description:j.descriptionPlain||j.description,department:j.categories?.team}));
  } else if(provider==='ashby'){
    if(!Array.isArray(data?.jobs))throw new Error('استجابة Ashby غير صالحة');
    items=data.jobs.filter(j=>j.isListed!==false).map(j=>({title:j.title,url:j.jobUrl||j.applyUrl,location:j.location||j.secondaryLocations?.map(x=>x.location).join(', '),description:j.descriptionPlain,department:j.department}));
  } else throw new Error('مزود غير مدعوم');
  const output=[];
  for(const item of items){
    if(!item.title||!item.url||saudiLocationRank(item.location)<0)continue;
    try {
      const v=validateJob({title:item.title,company,city:String(item.location).slice(0,100),url:item.url,description:cleanDescription([item.department,item.description].filter(Boolean).join(' — ')),application_channel:'portal'});
      output.push({...v,priority:saudiLocationRank(item.location),source_provider:provider,source_board:board});
    }catch{ /* ignore malformed provider record; do not abort entire board */ }
  }
  return output.sort((a,b)=>a.priority-b.priority).slice(0,70);
}
export async function fetchPublishedJobs(source,fetcher=fetch) {
  const endpoint=boardApiUrl(source.provider,source.board);
  const res=await fetcher(endpoint,{method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw new Error(`مزود ${source.provider}: HTTP ${res.status}`);
  const declared=Number(res.headers?.get?.('content-length')||0);
  if(declared>1200000)throw new Error('رد مزود الوظائف كبير جدًا');
  const body=await res.text();
  if(body.length>1200000)throw new Error('رد مزود الوظائف كبير جدًا');
  return normalizeBoardJobs(source.provider,JSON.parse(body),source);
}
export async function discoverAndSave(env,fetcher=fetch){
  if(!env.JOBS_DB)throw new Error('D1 غير مربوطة');
  const list=await env.JOBS_DB.prepare('SELECT id,provider,board,company FROM job_sources WHERE enabled=1 ORDER BY created_at ASC LIMIT 6').all();
  const sources=list.results||[];
  let created=0,duplicate=0,seen=0;
  const errors=[];
  for(const source of sources){
    try{
      const jobs=await fetchPublishedJobs(source,fetcher);
      seen+=jobs.length;
      for(const job of jobs){
        const id=crypto.randomUUID();
        const result=await env.JOBS_DB.prepare(`INSERT OR IGNORE INTO jobs (id,dedup_key,title,company,city,url,description,application_channel,recruitment_email,is_linkedin) VALUES (?,?,?,?,?,?,?,?,?,0)`)
          .bind(id,job.dedup_key,job.title,job.company,job.city,job.url,job.description,'portal','').run();
        if(result.meta?.changes)created++;else duplicate++;
      }
    }catch(e){errors.push({provider:source.provider,board:source.board,error:String(e.message||e).slice(0,180)});}
  }
  const stamp=new Date().toISOString();
  await env.JOBS_DB.prepare('INSERT INTO discovery_runs(id,run_at,sources,seen,created,errors) VALUES(?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),stamp,sources.length,seen,created,JSON.stringify(errors)).run();
  return {sources:sources.length,seen,created,duplicate,errors,real_applications_sent:0};
}
