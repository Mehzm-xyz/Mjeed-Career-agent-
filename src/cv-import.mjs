// Document ingestion. Never exposes uploaded bytes publicly or sends them to external endpoints.
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
    if(proxy.numPages>25)throw new Error('ملف PDF يتجاوز 25 صفحة');
    const extracted=await pdf.extractText(proxy,{mergePages:true});
    text=extracted.text;
    if(typeof proxy.destroy==='function')await proxy.destroy();
  }else{
    const mammoth=parsers.docx || await import('mammoth');
    const result=await mammoth.extractRawText({arrayBuffer:bytes});
    text=result.value;
  }
  text=String(text||'').replace(/[\u0000-\u0008\u000B-\u001F]/g,'').trim();
  if(text.length<30)throw new Error('تعذر استخراج نص كافٍ من السيرة؛ يمكن لصق النص يدويًا');
  return {text:text.slice(0,20000),kind,wasTruncated:text.length>20000};
}
export async function importCvToProfile(env,file){
  if(!env.JOBS_DB)throw new Error('قاعدة البيانات غير مربوطة');
  if(!file || typeof file.arrayBuffer!=='function')throw new Error('اختر ملف السيرة أولًا');
  if(file.size>MAX_CV_BYTES)throw new Error('الحد الأقصى 2 ميجابايت');
  const bytes=await file.arrayBuffer();
  const result=await extractCvText(file.name,bytes);
  // Store extracted text in D1 for AI; original binary in R2 only when explicitly configured.
  const stored=Boolean(env.RESUME_BUCKET && env.ENABLE_CV_FILE_STORAGE==='true');
  const id=crypto.randomUUID();
  if(stored){
    await env.RESUME_BUCKET.put(`private/resumes/${id}`,bytes,{httpMetadata:{contentType:file.type||'application/octet-stream'},customMetadata:{filename:file.name.slice(0,180)}});
  }
  try{
    await env.JOBS_DB.prepare('UPDATE profile SET resume_text=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(result.text).run();
  }catch(e){if(stored)await env.RESUME_BUCKET.delete(`private/resumes/${id}`).catch(()=>{});throw e;}
  return {imported:true,format:result.kind,characters:result.text.length,truncated:result.wasTruncated,original_stored_in_r2:stored};
}
