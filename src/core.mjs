export const LIMITS = Object.freeze({ maxLinkedInApplicationsPerDay:10, maxAIRequestsPerDay:5, sendStartMinute:9*60, sendEndMinute:17*60 });
export function riyadhClock(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone:'Asia/Riyadh', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date).filter(p => p.type !== 'literal').map(p=>[p.type,p.value]));
  return { day:`${parts.year}-${parts.month}-${parts.day}`, minute:Number(parts.hour)*60+Number(parts.minute), hour:parts.hour, minuteText:parts.minute };
}
export function canSubmit(date = new Date(), linkedInSentToday = 0, channel = 'company') {
  const c = riyadhClock(date);
  // The ten-per-day cap applies ONLY to LinkedIn, not other destinations.
  // Other providers may have their own restrictions, and all channels share the Saudi time window.
  const inWindow = c.minute >= LIMITS.sendStartMinute && c.minute < LIMITS.sendEndMinute;
  return inWindow && (channel !== 'linkedin' || linkedInSentToday < LIMITS.maxLinkedInApplicationsPerDay);
}
export function canonicalJobKey(input) {
  const compact = s => String(s || '').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
  const url = String(input.url||'').trim();
  // Preserve vacancy identifiers (id, jobId, gh_jid, etc.); remove known attribution only.
  if (url) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password) throw new Error('يسمح فقط بروابط HTTPS آمنة');
    u.hash='';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_.*|ref|referrer|source|trk|tracking|gclid|fbclid|msclkid|mc_cid|mc_eid|li_fat_id)$/i.test(key)) u.searchParams.delete(key);
    }
    const entries=[...u.searchParams.entries()].sort(([a,x],[b,y])=>a.localeCompare(b)||x.localeCompare(y));
    const params=new URLSearchParams(); for(const [k,v] of entries)params.append(k,v);
    const pathname=u.pathname.replace(/\/+$/,'')||'/';
    return `url:${u.host.toLowerCase()}${pathname}${params.size?'?'+params.toString():''}`;
  }
  return `job:${compact(input.company)}::${compact(input.title)}`;
}
export function validateJob(input) {
  if (!input || typeof input !== 'object') throw new Error('بيانات الوظيفة غير صالحة');
  const clean={title:String(input.title||'').trim(),company:String(input.company||'').trim(),city:String(input.city||'الرياض').trim(),url:String(input.url||'').trim(),description:String(input.description||'').trim(),application_channel:String(input.application_channel||'portal'),recruitment_email:String(input.recruitment_email||'').trim()};
  if (!clean.title || !clean.company) throw new Error('أدخل المسمى والجهة');
  if (clean.title.length>180 || clean.company.length>180 || clean.description.length>18000 || clean.city.length>100 || clean.url.length>1400) throw new Error('الحقول أطول من الحد المسموح');
  if (!['portal','email','government','manual'].includes(clean.application_channel)) throw new Error('قناة تقديم غير صالحة');
  if (clean.recruitment_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean.recruitment_email)) throw new Error('بريد التوظيف غير صالح');
  clean.dedup_key=canonicalJobKey(clean); return clean;
}
export function safeText(s,max=4000) { return String(s??'').trim().slice(0,max); }


// Both checks and mutations run inside ONE SQLite statement. Never split quota checks
// from writes into independent D1 requests: concurrent confirmations can pass both.
export const ATOMIC_CONFIRM_APPLICATION_SQL = `UPDATE applications
  SET status='manually_sent', confirmation=?, sent_at=?, sent_day=?
  WHERE id=? AND status!='manually_sent'
    AND (
      NOT EXISTS (SELECT 1 FROM jobs j WHERE j.id=applications.job_id AND j.is_linkedin=1)
      OR (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id=a.job_id
          WHERE a.status='manually_sent' AND a.sent_day=? AND j.is_linkedin=1) < 10
    )
  RETURNING id`;

// Prevent duplicate simultaneous AI generation, with a 10-minute lease so failures
// cannot strand a job permanently. Existing applications always take precedence.
export const CLAIM_PREPARATION_SQL = `UPDATE jobs
  SET prepare_claim=?, prepare_claim_at=CURRENT_TIMESTAMP
  WHERE id=? AND (prepare_claim='' OR prepare_claim_at < datetime('now','-10 minutes'))
    AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_id=jobs.id)
  RETURNING id`;

export function canRetryDemo(status) {
  return status === 'queued' || status === 'failed';
}
