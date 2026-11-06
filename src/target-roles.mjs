const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export const ROLE_FAMILIES=Object.freeze([
 {label:'المبيعات الحكومية / Government Sales',aliases:['Government Sales','Public Sector Sales','B2G Sales','مبيعات حكومية','المبيعات الحكومية','مبيعات القطاع الحكومي','مبيعات القطاع العام']},
 {label:'المنافسات والمناقصات / Tenders & Bids',aliases:['Tender','Tenders','Tendering','Bid','Bids','Bidding','منافسات','المنافسات','مناقصات','المناقصات','عطاءات','العطاءات']},
 {label:'تطوير الأعمال / Business Development',aliases:['Business Development','BD','تطوير الأعمال','تطوير الاعمال']},
 {label:'إدارة الحسابات / Account Management',aliases:['Account Manager','Key Account Manager','Account Management','Account Director','Head of Accounts','مدير حساب','مدير الحساب','مدير حسابات','مدير الحسابات','إدارة الحسابات','ادارة الحسابات']},
 {label:'النمو / Growth',aliases:['Growth','النمو','نمو']},
 {label:'الإدارة التجارية / Commercial Management',aliases:['Commercial Director','Commercial Manager','Head of Commercial','Commercial Specialist','Commercial Sector','مدير قطاع تجاري','مدير القطاع التجاري','المدير التجاري','مدير تجاري','الإدارة التجارية','الادارة التجارية','رئيس القطاع التجاري','أخصائي تجاري','اخصائي تجاري']}
]);
export function targetRoles(value){
 const values=Array.isArray(value)?value:String(value||'').split(/[\n,،;]/);
 const roles=[...new Map(values.map(v=>String(v).trim()).filter(Boolean).map(v=>[normalize(v),v])).values()];
 if(roles.length>6)throw Error('الحد الأقصى ستة مناصب مستهدفة');
 if(roles.some(v=>v.length>120||!normalize(v)))throw Error('اكتب مسمى واضحًا بحد أقصى 120 حرفًا');
 return roles;
}
export function matchesTargetRole(title,value){
 const text=' '+normalize(title)+' ';
 return targetRoles(value).some(role=>{
  const family=ROLE_FAMILIES.find(x=>normalize(x.label)===normalize(role));
  if(family&&/\b(?:engineer|developer|intern(?:ship)?|graduate)\b|مهندس|مبرمج|تدريب تعاوني/i.test(title))return false;
  return (family?.aliases||[role]).some(alias=>text.includes(' '+normalize(alias)+' '));
 });
}
export function requireTargetRole(title,value){
 if(!targetRoles(value).length)throw Error('حدد منصبًا مستهدفًا على الأقل في ملفك قبل تجهيز أي تقديم');
 if(!matchesTargetRole(title,value))throw Error('هذه الوظيفة خارج المناصب التي اخترتها؛ حدّث خياراتك إن أردتها');
}
