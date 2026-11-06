// Document ingestion. Never exposes uploaded bytes publicly or sends them to external endpoints.
import {Buffer} from 'node:buffer';
export const MAX_CV_BYTES = 2*1024*1024;
export function cvKind(filename,bytes){
  const name=String(filename||'');
  if(name.length>200 || !/\.(pdf|docx|txt)$/i.test(name))throw new Error('ارفع ملف PDF أو DOCX أو TXT');
  if(!bytes || bytes.byteLength<1 || bytes.byteLength>MAX_CV_BYTES)throw new Error('حجم السيرة يتجاوز 2 ميجابايت أو الملف فارغ');
  const ext=name.split('.').pop().toLowerCase();
  const b=new Uint8Array(bytes);
  if(ext==='pdf' && !(b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70))throw new Error('ملف PDF غير صالح');
  if(ext==='docx' && !(b[0]===80&&b[1]===75))throw new Error('ملف DOCX غير صالح');
  return ext;
}
export async function extractCvText(name,bytes,parsers={}){
  const kind=cvKind(name,bytes);
  let text='';
  if(kind==='txt')text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  else if(kind==='pdf'){
    const pdf=parsers.pdf || await import('unpdf');
    const proxy=await pdf.getDocumentProxy(new Uint8Array(bytes));
    try{
      if(proxy.numPages>25)throw new Error('ملف PDF يتجاوز 25 صفحة');
      const extracted=await pdf.extractText(proxy,{mergePages:true});
      text=extracted.text;
    }finally{if(typeof proxy.destroy==='function')await proxy.destroy();}
  }else{
    const mammoth=parsers.docx || await import('mammoth');
    // The document parser expects a Node Buffer.
    const result=await mammoth.extractRawText({buffer:Buffer.from(new Uint8Array(bytes))});
    text=result.value;
  }
  text=String(text||'').replace(/[\u0000-\u0008\u000B-\u001F]/g,'').trim();
  if(text.length<30)throw new Error('تعذر استخراج نص كافٍ من السيرة؛ يمكن لصق النص يدويًا');
  return {text:text.slice(0,20000),kind,wasTruncated:text.length>20000};
}
export async function importCvToProfile(env,file){
  if(!env.DB)throw new Error('قاعدة البيانات غير مربوطة');
  if(!file || typeof file.arrayBuffer!=='function')throw new Error('اختر ملف السيرة أولًا');
  if(file.size>MAX_CV_BYTES)throw new Error('الحد الأقصى 2 ميجابايت');
  const bytes=await file.arrayBuffer();
  const result=await extractCvText(file.name,bytes);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const mime={pdf:'application/pdf',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}[result.kind];
  await env.DB.batch([
    env.DB.prepare("UPDATE profile SET resume_text=?,resume_source_url='',resume_original_url='local:profile-file',resume_sha256=?,updated_at=CURRENT_TIMESTAMP WHERE id=1").bind(result.text,hash),
    env.DB.prepare(`INSERT INTO profile_files(id,filename,mime_type,content_base64,resume_text,sha256) VALUES(1,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET filename=excluded.filename,mime_type=excluded.mime_type,content_base64=excluded.content_base64,resume_text=excluded.resume_text,sha256=excluded.sha256`)
      .bind(file.name.slice(0,180),mime,Buffer.from(bytes).toString('base64'),result.text,hash)
  ]);
  return {imported:true,format:result.kind,characters:result.text.length,truncated:result.wasTruncated,original_stored:true};
}
