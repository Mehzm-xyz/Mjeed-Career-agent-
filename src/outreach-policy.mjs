export function outreachPolicy(job={}){
 let officialDomain=false;
 try{officialDomain=/(^|\.)gov\.sa$/i.test(new URL(job.url).hostname)}catch{}
 const knownGovernment=/وزارة|الهيئة العامة|أمانة منطقة|بلدية|\bministry\b|\bmunicipality\b|government authority/i.test(String(job.company||''));
 const government=job.employer_type==='government'||(job.employer_type!=='private'&&(officialDomain||knownGovernment));
 return {
  language:government?'ar':'job_posting_language',
  instruction:(government?'اكتب السيرة الموجهة ورسالة التقديم بالعربية لأن الجهة حكومية.':'اكتب السيرة الموجهة ورسالة التقديم باللغة الأساسية لإعلان الوظيفة؛ لا تفترض أن كل الشركات تتواصل بالإنجليزية.')+
   ' استخدم أسلوبًا مهنيًا طبيعيًا ومختصرًا، دون تكلف أو مبالغة أو جمل قالبية طويلة. اذكر ملاءمة محددة من السيرة وإعلان الوظيفة، وخاتمة واضحة. عرّف بالاسم والمسمى المستهدف والجهة، وقدّم نقطتي قيمة مرتبطتين بمتطلبات الدور ومن حقائق السيرة. اكتب بثقة هادئة دون استعطاف أو غرور، ولا تنسخ هذه التعليمات حرفيًا. تجنب عبارة أشارككم سيرتي العامة كمقدمة وحيدة؛ قدّم سببًا مهنيًا لقراءة المرفق. ملف السيرة PDF مرفق، والرابط المهني اختياري. استخدم بيانات التواصل الحالية. لا تختلق اسم مسؤول أو احتياجًا أو خبرة.'
 };
}
export function hiringSignals(jobs){
 const companies=new Map();
 for(const job of jobs){
  if(!companies.has(job.company))companies.set(job.company,{company:job.company,signal:'published_vacancies',vacancies:0,evidence_urls:[]});
  const row=companies.get(job.company);row.vacancies++;if(!row.evidence_urls.includes(job.url))row.evidence_urls.push(job.url);
 }
 return [...companies.values()].map(x=>({...x,interpretation:'إعلانات توظيف منشورة؛ لا تثبت خروج موظف أو خطة توظيف غير معلنة'}));
}
