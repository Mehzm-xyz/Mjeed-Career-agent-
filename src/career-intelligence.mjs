import {rankJobs} from './job-match.mjs';
import {hiringSignals} from './outreach-policy.mjs';
export function employerKey(value){return String(value||'').toLowerCase().normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/[^\p{L}\p{N}]/gu,'')}
export function excludedEmployer(company,excluded){
 const key=employerKey(company);
 return String(excluded||'').split(/[\n,،;]/).map(employerKey).filter(Boolean).some(x=>key===x||key.length>3&&x.length>3&&(key.startsWith(x)||x.startsWith(key)));
}
export function requireEligibleEmployer(company,profile){
 if(excludedEmployer(company,profile.excluded_employers))throw Error('هذه جهة عمل حالية أو سابقة ضمن قائمة الاستبعاد');
}
export async function careerReport(env){
 const p=await env.DB.prepare('SELECT * FROM profile WHERE id=1').first();
 const jobs=(await env.DB.prepare('SELECT * FROM jobs').all()).results;
 const applications=(await env.DB.prepare('SELECT * FROM applications').all()).results;
 const threads=(await env.DB.prepare('SELECT * FROM mail_threads').all()).results;
 const counts=(await env.DB.prepare('SELECT classification,COUNT(*) n FROM mail_messages GROUP BY classification').all()).results;
 const evidence=(await env.DB.prepare('SELECT * FROM market_evidence ORDER BY observed_at DESC LIMIT 100').all()).results;
 const humanThreads=threads.filter(t=>t.last_human_reply_at).length;
 const aged=threads.filter(t=>Date.now()-Date.parse(t.sent_at)>=7*86400000);
 const agedReplies=aged.filter(t=>t.last_human_reply_at).length;
 const candidates=rankJobs(jobs.filter(j=>!excludedEmployer(j.company,p.excluded_employers)),p);
 const matching=candidates.filter(j=>j.is_target_role);
 const supportedSignals=evidence.filter(e=>e.status==='verified'&&Date.now()-Date.parse(e.observed_at)<=90*86400000);
 const marketPriorities=new Map();
 for(const e of supportedSignals){
  const k=employerKey(e.company);if(excludedEmployer(e.company,p.excluded_employers))continue;
  if(!marketPriorities.has(k))marketPriorities.set(k,{company:e.company,evidence:[],interpretation:[]});
  const row=marketPriorities.get(k);row.evidence.push({kind:e.kind,url:e.source_url,observed_at:e.observed_at,summary:e.summary});
  const note=e.kind==='vacancy'?'إعلان توظيف موثق؛ تحقق من المسمى وملاءمته قبل التقديم':e.kind==='expansion'?'توسع موثق يستحق البحث عن وظائف مرتبطة؛ لا يثبت وجود شاغر':e.kind==='employee_departure'?'مغادرة موثقة؛ لا تثبت أن الجهة ستعيّن بديلًا':'دليل موثق يحتاج ربطًا بفرصة فعلية';
  if(!row.interpretation.includes(note))row.interpretation.push(note);
 }
 const recommendations=[];
 if(!p.resume_text)recommendations.push('أضف السيرة قبل تقييم الملاءمة');
 if(!p.target_roles)recommendations.push('حدد المناصب المرغوبة في الحقول الستة');
 if(aged.length<20)recommendations.push('العينة الناضجة أقل من 20 محادثة: لا تكفي لتشخيص سبب ضعف التجاوب');
 else if(agedReplies/aged.length<0.1)recommendations.push('التجاوب البشري منخفض في العينة التي مضى عليها أسبوع: اختبر الاستهداف ثم مقدمة البريد ثم السيرة، عاملًا واحدًا كل مرة؛ هذا اقتراح اختبار وليس إثباتًا للسبب');
 const skills=[['المبيعات الحكومية والمؤسسية',/b2[bg]|government sales|enterprise sales|مبيعات حكوم|المبيعات الحكومية/i],
  ['تطوير الأعمال',/business development|تطوير الأعمال|تطوير الاعمال/i],['المنافسات والعروض',/tenders?|rfp|rfq|proposal|منافسات|مناقصات/i],
  ['إدارة الحسابات والعلاقات',/account management|stakeholder|client acquisition|إدارة الحسابات|العلاقات/i],
  ['النمو وإدارة فرص البيع',/pipeline|growth|crm|lead generation|نمو|فرص البيع/i],['الإدارة والقيادة',/managed a team|team leadership|direct reports|إدارة فريق|قيادة فريق/i]];
 const strengths=skills.flatMap(([skill,pattern])=>{const line=String(p.resume_text||'').split(/\n/).find(x=>pattern.test(x));return line?[{skill,evidence_quote:line.trim().slice(0,300)}]:[]});
 return {facts:{vacancies:jobs.length,applications:applications.length,tracked_threads:threads.length,human_reply_threads:humanThreads,
  response_rate:threads.length?humanThreads/threads.length:null,mature_threads:aged.length,mature_response_rate:aged.length?agedReplies/aged.length:null,
  message_counts:counts,employer_signals:hiringSignals(jobs)},
  professional_profile:{strengths,selected_roles:String(p.target_roles||'').split('\n').filter(Boolean),excluded_employers:String(p.excluded_employers||'').split('\n').filter(Boolean)},
  market_analysis:{window_days:90,source:'أدلة محفوظة راجعها المستخدم، لا مسح شامل للسوق',priorities:[...marketPriorities.values()]},
  analysis:{method:'قواعد وترتيب كلمات موثقة، وليست توقعًا أو قرارًا من نموذج ذكاء',recommendations,ranked_opportunities:matching.slice(0,25),
   limitations:['إعلان وظيفة لا يثبت خروج موظف','غياب الرد لا يثبت ضعف السيرة','البيانات المحفوظة لا تمثل السوق كله']},
  market_evidence:evidence,ai_selected:Boolean(env.AI)};
}
