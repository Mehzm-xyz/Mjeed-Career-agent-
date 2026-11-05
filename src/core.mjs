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
  const url = compact(input.url);
  // Use the canonical public URL when present, otherwise company and job title.
  if (url) { const u = new URL(url); if (u.protocol !== 'https:') throw new Error('يسمح فقط بروابط HTTPS'); u.search=''; u.hash=''; return `url:${u.hostname}${u.pathname.replace(/\/$/,'')}`; }
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
