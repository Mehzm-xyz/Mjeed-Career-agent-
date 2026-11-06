import {Buffer} from 'node:buffer';
import {ORIGINAL_RESUME_URL,ORIGINAL_RESUME_SHA256} from './resume-source.mjs';
export async function originalResume(env,p,fetcher=fetch){
 const local=await env.DB.prepare('SELECT * FROM profile_files WHERE id=1').first();
 if(local&&local.resume_text===p.resume_text){
  return {bytes:Buffer.from(local.content_base64,'base64'),mime:local.mime_type,filename:local.filename};
 }
 if(p.resume_original_url!==ORIGINAL_RESUME_URL||p.resume_sha256!==ORIGINAL_RESUME_SHA256)throw Error('لا توجد نسخة أصلية مطابقة للسيرة الحالية؛ ارفع ملف PDF');
 const res=await fetcher(ORIGINAL_RESUME_URL,{redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!res.ok||Number(res.headers.get('content-length')||0)>2097152)throw Error('تعذر تنزيل ملف السيرة');
 const bytes=Buffer.from(await res.arrayBuffer());if(bytes.length>2097152)throw Error('حجم السيرة يتجاوز الحد');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==ORIGINAL_RESUME_SHA256)throw Error('تغير أصل السيرة؛ أعد رفع الملف قبل استخدامه');
 return {bytes,mime:'application/pdf',filename:'Abdulmajeed-Alamri-CV.pdf'};
}
