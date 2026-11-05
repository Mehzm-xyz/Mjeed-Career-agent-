import { canSubmit, riyadhClock } from './core.mjs';

// Registry of candidate form engines. Discovering a portal does NOT make it an enabled integration.
export const ENGINE_REGISTRY = Object.freeze({
  greenhouse: {label:'Greenhouse', mode:'research', account:'usually_no', code:'dyyfk/auto-apply'},
  ashby: {label:'Ashby', mode:'research', account:'varies', code:'dyyfk/auto-apply'},
  lever: {label:'Lever', mode:'research', account:'varies', code:'dyyfk/auto-apply'},
  workday: {label:'Workday', mode:'research', account:'typically_yes', code:'devdattatalele/auto-apply'},
  oracle: {label:'Oracle Recruiting', mode:'research', account:'typically_yes', code:'none_verified'},
  successfactors: {label:'SAP SuccessFactors', mode:'research', account:'typically_yes', code:'none_verified'},
  smartrecruiters: {label:'SmartRecruiters', mode:'research', account:'varies', code:'none_verified'},
  linkedin: {label:'LinkedIn', mode:'discovery_only', account:'yes', code:'no_authorized_auto_submit'},
  bayt: {label:'Bayt', mode:'research', account:'yes', code:'none_verified'},
  gulftalent: {label:'GulfTalent', mode:'research', account:'yes', code:'none_verified'},
  naukrigulf: {label:'Naukrigulf', mode:'research', account:'yes', code:'none_verified'},
  jadarat: {label:'Jadarat', mode:'handoff', account:'nafath', code:'official_flow'},
  company: {label:'موقع الجهة', mode:'review_required', account:'varies', code:'generic_future'},
  email: {label:'بريد توظيف منشور', mode:'optional', account:'gmail', code:'apps_script_connector'}
});
const matchHost = (host, domain) => host===domain || host.endsWith(`.${domain}`);
export function classifyPortal(address, channel='portal') {
  if(channel==='email')return 'email';
  if(channel==='government')return 'jadarat';
  let u;try{u=new URL(address)}catch{return 'company'}
  if(u.protocol!=='https:' || u.username || u.password) return 'company';
  const h=u.hostname.toLowerCase();
  if(matchHost(h,'linkedin.com')) return 'linkedin';
  if(matchHost(h,'myworkdayjobs.com')) return 'workday';
  if(matchHost(h,'jobs.ashbyhq.com') || matchHost(h,'ashbyhq.com'))return 'ashby';
  if(matchHost(h,'greenhouse.io') || matchHost(h,'greenhouse.com'))return 'greenhouse';
  if(matchHost(h,'lever.co'))return 'lever';
  if(matchHost(h,'oraclecloud.com'))return 'oracle';
  if(matchHost(h,'successfactors.com')||matchHost(h,'successfactors.eu'))return 'successfactors';
  if(matchHost(h,'smartrecruiters.com'))return 'smartrecruiters';
  if(matchHost(h,'bayt.com'))return 'bayt';
  if(matchHost(h,'gulftalent.com'))return 'gulftalent';
  if(matchHost(h,'naukrigulf.com'))return 'naukrigulf';
  if(matchHost(h,'jadarat.sa'))return 'jadarat';
  return 'company';
}
// 'now' and counters are always server-side; never trust an LLM or browser-provided approval.
export function evaluateSendGate({now=new Date(), sentToday=0, reservedToday=0, lastAttemptAt=null, emailVerified=false, explicitApproval=false, channel='portal', enabled=false}) {
  if(!enabled)return {ok:false,reason:'real_submission_disabled'};
  if(!explicitApproval)return {ok:false,reason:'owner_approval_required'};
  if(!canSubmit(now, sentToday+reservedToday, channel))return {ok:false,reason:'outside_hours_or_daily_limit'};
  if(channel==='linkedin' && lastAttemptAt){const t=Date.parse(lastAttemptAt);if(Number.isFinite(t)&&now.getTime()-t<5*60*1000)return {ok:false,reason:'minimum_interval_5_minutes'};}
  if(channel==='email' && !emailVerified)return {ok:false,reason:'recruitment_email_not_verified'};
  return {ok:true,day:riyadhClock(now).day};
}
export function safeHttpDestination(address) {
 let u;try{u=new URL(address)}catch{return false}
 if(u.protocol!=='https:'||u.username||u.password)return false;
 const h=u.hostname.toLowerCase().replace(/\.$/,'');
 if(!h.includes('.')|| h==='localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal'))return false;
 if(/^\d+\.\d+\.\d+\.\d+$/.test(h)||h.startsWith('[')||h.endsWith('.onion'))return false;
 return true;
}
