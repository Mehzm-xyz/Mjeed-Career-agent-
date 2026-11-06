import {Buffer} from 'node:buffer';
// Optional signed connector; sending is not implemented.
export async function signedPayload(payload, key) {
 if(typeof key!=='string' || key.length<32)throw new Error('GMAIL_HMAC_KEY must be at least 32 characters');
 const body=JSON.stringify(payload);
 const keyBytes=new TextEncoder().encode(key);
 const hmacKey=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',hmacKey,new TextEncoder().encode(body)));
 return {payload,signature:[...signature].map(n=>n.toString(16).padStart(2,'0')).join('')};
}
export function prepareMailPayload({recipient,fullName,jobTitle,company,coverLetter,attachmentName,attachmentPdf,subject,language}) {
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient||''))throw new Error('invalid recipient');
 for(const value of [fullName,jobTitle,company])if(!String(value||'').trim()||/[\r\n]/.test(value))throw Error('name, role and employer are required');
 if(!coverLetter?.trim()||coverLetter.trim().length<100)throw new Error('a specific professional letter is required');
 if(!coverLetter.toLowerCase().includes(jobTitle.toLowerCase())||!coverLetter.toLowerCase().includes(company.toLowerCase()))throw Error('letter must identify role and employer');
 const bytes=new Uint8Array(attachmentPdf||[]);
 if(bytes.byteLength<5||bytes.byteLength>2097152||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('original PDF attachment is required');
 const arabic=language==='ar'||(!language&&(coverLetter.match(/[\u0600-\u06ff]/g)||[]).length>(coverLetter.match(/[a-z]/gi)||[]).length);
 const title=String(subject||`${jobTitle} — ${fullName} — ${company}`).replace(/[\r\n]/g,' ').slice(0,220);
 return {recipient,subject:title,body:coverLetter.slice(0,14000),attachment_name:(attachmentName||'CV.pdf').replace(/[\r\n]/g,'').slice(0,90),attachment_mime:'application/pdf',attachment_base64:Buffer.from(bytes).toString('base64'),company,language:arabic?'ar':'en'};
}
