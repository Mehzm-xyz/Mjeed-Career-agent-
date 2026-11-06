// Explainable ordering, not an eligibility decision or a probability of acceptance.
import {saudiLocationRank} from './discovery.mjs';
import {targetRoles,matchesTargetRole} from './target-roles.mjs';
const GROUPS=[
 ['تطوير الأعمال',/business development|تطوير الأعمال|تطوير الاعمال/i,35],
 ['مبيعات المؤسسات',/enterprise sales|b2b|b2g|corporate sales|مبيعات مؤسس|مبيعات حكوم/i,25],
 ['المبيعات والحسابات',/\bsales\b|account (?:executive|manager|director)|المبيعات|مدير حساب|تنفيذي حساب/i,20],
 ['العروض والمنافسات',/tenders?|procurement|rfp|rfq|proposals?|مناقص|منافسات|عروض فني/i,15],
 ['الشراكات والعلاقات',/partnerships?|stakeholder|الشراكات|أصحاب المصلحة/i,12],
 ['الحلول التقنية',/software|saas|digital experience|تقنية|رقمية/i,8],
 ['إدارة فرص البيع',/pipeline|lead generation|crm|hubspot/i,8]
];
export function rankJobs(jobs,profile={}){
 const resume=String(profile.resume_text||'');
 const competencies=GROUPS.filter(([,pattern])=>pattern.test(resume));
 const targets=targetRoles(profile.target_roles);
 return jobs.map(job=>{
  const title=String(job.title||'');const text=title+' '+String(job.description||'');
  let score=0;const reasons=[],notes=[];
  for(const [label,pattern,weight] of competencies){
   if(pattern.test(title)){score+=weight;reasons.push(label+' في المسمى');}
   else if(pattern.test(text)){score+=Math.ceil(weight/3);reasons.push(label+' في الوصف');}
  }
  const selected=matchesTargetRole(title,targets);
  if(selected){score+=35;reasons.unshift('يطابق مسمى اخترته');}
  const location=saudiLocationRank(job.city);
  if(resume.trim()&&location===0){score+=5;reasons.push('الرياض');}
  if(/\b(?:engineer|developer|accountant|intern(?:ship)?|graduate)\b|مهندس|مبرمج|محاسب|تدريب تعاوني/i.test(title)){
   score-=35;notes.push('المسمى يتطلب تخصصًا أو مسارًا مختلفًا؛ راجع الوصف');
  }
  const years=text.match(/\b(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\+?\s+years?\b/i);
  if(years&&Number(years[1])>=8)notes.push('الإعلان يذكر '+years[0]+'؛ تحقق من شرط سنوات الخبرة');
  if(location<0)notes.push('الموقع خارج السعودية أو غير واضح');
  if(!resume.trim())notes.push('أضف سيرتك قبل الاعتماد على الترتيب');
  return {...job,is_target_role:selected,match_score:Math.max(0,score),match_reasons:reasons,match_review_notes:notes};
 }).sort((a,b)=>Number(b.is_target_role)-Number(a.is_target_role)||b.match_score-a.match_score||a.title.localeCompare(b.title));
}
