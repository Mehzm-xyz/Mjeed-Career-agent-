const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function targetRoles(value){
 const values=Array.isArray(value)?value:String(value||'').split(/[\n,،;]/);
 const roles=[...new Map(values.map(v=>String(v).trim()).filter(Boolean).map(v=>[normalize(v),v])).values()];
 if(roles.length>6)throw Error('الحد الأقصى ستة مناصب مستهدفة');
 if(roles.some(v=>v.length>120||!normalize(v)))throw Error('اكتب مسمى واضحًا بحد أقصى 120 حرفًا');
 return roles;
}
export function matchesTargetRole(title,value){
 const text=' '+normalize(title)+' ';
 return targetRoles(value).some(role=>text.includes(' '+normalize(role)+' '));
}
export function requireTargetRole(title,value){
 if(!targetRoles(value).length)throw Error('حدد منصبًا مستهدفًا على الأقل في ملفك قبل تجهيز أي تقديم');
 if(!matchesTargetRole(title,value))throw Error('هذه الوظيفة خارج المناصب التي اخترتها؛ حدّث خياراتك إن أردتها');
}
