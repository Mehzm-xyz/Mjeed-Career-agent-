/**
 * Optional Gmail connection: read tracked conversations and create drafts only.
 * No method sends a message. Consent is granted by the Google account owner.
 * Script properties: MASAR_SHARED_KEY (32+ chars), MASAR_DRAFTS_ENABLED (true to allow drafts).
 * Deploy as owner, web app access Anyone; the signed timestamp and nonce authenticate calls.
 */
function doPost(e) {
 try {
  if(!e.postData||e.postData.contents.length>3000000)throw Error('invalid_request');
  var obj=JSON.parse(e.postData.contents),p=obj.payload,provided=String(obj.signature||'');
  var props=PropertiesService.getScriptProperties(),secret=String(props.getProperty('MASAR_SHARED_KEY')||'');
  if(secret.length<32||!p||!/^[0-9a-f]{64}$/.test(provided))throw Error('unauthorized');
  var expected=Utilities.computeHmacSha256Signature(JSON.stringify(p),secret).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2)}).join('');
  if(!safeEqual_(provided,expected)||Math.abs(Date.now()-Number(p.issued_at))>300000||!Number.isFinite(Number(p.issued_at)))throw Error('unauthorized');
  if(!/^[a-f0-9-]{36}$/.test(p.request_id||''))throw Error('invalid_nonce');
  var lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error('busy');
  try{
   var cache=CacheService.getScriptCache(),nonce='NONCE_'+p.request_id;
   if(cache.get(nonce))throw Error('replayed_request');cache.put(nonce,'1',600);
  }finally{lock.releaseLock()}
  if(p.action==='identity')return reply_({ok:true,email:Session.getEffectiveUser().getEmail()});
  if(p.action==='read_thread'){
   if(!/^[a-f0-9]{8,40}$/i.test(p.thread_id||''))throw Error('invalid_thread');
   var thread=GmailApp.getThreadById(p.thread_id);if(!thread)throw Error('thread_not_found');
   var messages=thread.getMessages();if(messages.length>100)throw Error('thread_too_large_review_manually');
   return reply_({ok:true,id:thread.getId(),messages:messages.map(function(m){return {
    id:m.getId(),sender:m.getFrom(),to:m.getTo(),subject:m.getSubject(),body:m.getPlainBody().slice(0,16000),received_at:m.getDate().toISOString(),
    headers:{'auto-submitted':m.getHeader('Auto-Submitted'),precedence:m.getHeader('Precedence'),'x-autoreply':m.getHeader('X-Autoreply'),'x-autorespond':m.getHeader('X-Autorespond')}
   }})});
  }
  if(p.action==='create_draft'){
   if(props.getProperty('MASAR_DRAFTS_ENABLED')!=='true')throw Error('drafts_disabled');
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.recipient||''))throw Error('invalid_recipient');
   if(!p.body||!p.subject||!p.attachment_base64)throw Error('incomplete_application');
   var bytes=Utilities.base64Decode(p.attachment_base64);
   if(bytes.length>2097152||bytes.length<5||bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70||bytes[4]!==45)throw Error('pdf_required');
   var draft=GmailApp.createDraft(p.recipient,String(p.subject).replace(/[\r\n]/g,' ').slice(0,220),String(p.body).slice(0,14000),{
    attachments:[Utilities.newBlob(bytes,'application/pdf',String(p.attachment_name||'CV.pdf').replace(/[\r\n]/g,'').slice(0,90))]
   });
   return reply_({ok:true,draft_id:draft.getId(),sent:false});
  }
  throw Error('unsupported_action');
 }catch(err){return reply_({ok:false,error:String(err.message||err).slice(0,120)})}
}
function safeEqual_(a,b){if(a.length!==b.length)return false;var diff=0;for(var i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function reply_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
