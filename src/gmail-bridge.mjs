// Optional connector. The endpoint remains off unless BOTH Cloudflare and Apps Script opt in.
export async function signedPayload(payload, key) {
 if(typeof key!=='string' || key.length<32)throw new Error('GMAIL_HMAC_KEY must be at least 32 characters');
 const body=JSON.stringify(payload);
 const keyBytes=new TextEncoder().encode(key);
 const hmacKey=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',hmacKey,new TextEncoder().encode(body)));
 return {payload,signature:[...signature].map(n=>n.toString(16).padStart(2,'0')).join('')};
}
export function prepareMailPayload({recipient,fullName,jobTitle,company,coverLetter,attachmentName,attachmentText,subject,language}) {
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient||''))throw new Error('invalid recipient');
 if(!coverLetter?.trim()||!attachmentText?.trim())throw new Error('missing resume or letter');
 const arabic=language==='ar'||(!language&&(coverLetter.match(/[\u0600-\u06ff]/g)||[]).length>(coverLetter.match(/[a-z]/gi)||[]).length);
 const title=String(subject||`${arabic?'طلب توظيف':'Application'}: ${jobTitle} — ${fullName}`).replace(/[\r\n]/g,' ').slice(0,220);
 return {recipient,subject:title,body:coverLetter.slice(0,14000),attachment_name:attachmentName||'Resume.txt',attachment_text:attachmentText.slice(0,21000),company:company.slice(0,150)};
}
