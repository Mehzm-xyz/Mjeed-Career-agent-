/**
 * Optional Google Apps Script connector. Deploy ONLY after explicit owner approval.
 * Script Properties: MASAR_SHARED_KEY (random 32+ chars), MASAR_SENDING_ENABLED (must be "true").
 * Execute as the account owner; web app access: Anyone (required for a server-to-server webhook).
 * HMAC is the gate on requests. Never expose this URL or key publicly.
 * OAuth consent is performed by the Google account owner, not by ChatGPT.
 */
function doPost(e) {
  try {
    const obj = JSON.parse(e.postData.contents || '{}');
    const p = obj.payload;
    const provided = String(obj.signature || '');
    const props = PropertiesService.getScriptProperties();
    const secret = String(props.getProperty('MASAR_SHARED_KEY') || '');
    if (secret.length < 32 || !p || !/^[0-9a-f]{64}$/.test(provided)) throw Error('unauthorized');
    const signed = Utilities.computeHmacSha256Signature(JSON.stringify(p), secret);
    const expected = signed.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
    if (!safeEqual_(provided, expected)) throw Error('unauthorized');
    if (props.getProperty('MASAR_SENDING_ENABLED') !== 'true') throw Error('sending_disabled');

    const tz = 'Asia/Riyadh';
    const minutes = Number(Utilities.formatDate(new Date(), tz, 'H')) * 60 + Number(Utilities.formatDate(new Date(), tz, 'm'));
    if (minutes < 540 || minutes >= 1020) throw Error('outside_sending_hours');
    const day = Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) throw Error('busy');
    try {
      const key = 'SENT_' + day;
      const count = Number(props.getProperty(key) || 0);
      if (count >= 10 || MailApp.getRemainingDailyQuota() < 1) throw Error('daily_limit');
      // Dedup is reserved before the external side-effect, to avoid retries after ambiguity.
      const id = 'ONCE_' + String(p.request_id || '');
      if (!/^ONCE_[a-f0-9-]{20,50}$/.test(id)) throw Error('invalid_request_id');
      if (props.getProperty(id)) throw Error('request_already_attempted');
      const to=String(p.recipient || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))throw Error('invalid_recipient');
      const content=String(p.body || '').slice(0,14000);
      const attachment=String(p.attachment_text||'').slice(0,21000);
      if (!content || !attachment) throw Error('incomplete_application');
      props.setProperty(id,'reserved');
      props.setProperty(key,String(count+1));
      MailApp.sendEmail({
        to: to,
        subject: String(p.subject||'طلب توظيف').slice(0,220),
        body: content,
        attachments: [Utilities.newBlob(attachment, 'text/plain', String(p.attachment_name || 'Resume.txt').slice(0,90))]
      });
      props.setProperty(id,'sent');
      return reply_({ok:true,request_id:p.request_id,channel:'gmail',accepted:true});
    } finally { lock.releaseLock(); }
  } catch(err) { return reply_({ok:false,error:String(err.message||err).slice(0,120)}); }
}
function safeEqual_(a,b){
  if(a.length!==b.length)return false;
  var diff=0;for(var i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
function reply_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
