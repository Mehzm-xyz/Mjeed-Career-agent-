const $=sel=>document.querySelector(sel);
const $$=sel=>[...document.querySelectorAll(sel)];
const esc=(s='')=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mode = location.protocol==='file:' || new URLSearchParams(location.search).get('demo')==='1' ? 'demo' : 'cloud';
const state={jobs:[],applications:[],profile:{full_name:'',email:'',phone:'',resume_text:'',target_roles:'',city:'الرياض',relocation:1},status:{jobs:0,applications:0,sent_today:0,ai_used:0,ai_daily_cap:5}};
let token=sessionStorage.getItem('masar_token')||'';
let feedbackTimer;
function flash(message,good=false){const el=$('#feedback');el.textContent=message;el.classList.remove('hidden');el.classList.toggle('good',good);clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>el.classList.add('hidden'),7000);window.scrollTo({top:0,behavior:'smooth'});}
async function api(path,options={}){
  const res=await fetch(`/api/${path}`,{...options,headers:{'authorization':`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}});
  let result;try{result=await res.json()}catch{throw Error(`فشل الاتصال: HTTP ${res.status}`)}
  if(!res.ok)throw Error(result.error||`HTTP ${res.status}`);return result;
}
async function refresh(){
 if(mode==='demo')return renderAll();
 if(!token){$('#connection-indicator').textContent='يحتاج ربطًا';openModal('auth-modal');return}
 try{
 const [status,p,j,a]=await Promise.all([api('status'),api('profile'),api('jobs'),api('applications')]);
 state.status=status;state.profile=p.profile;state.jobs=j.jobs;state.applications=a.applications;
 $('#connection-indicator').textContent='متصل بـCloudflare';renderAll();
 }catch(e){$('#connection-indicator').textContent='الاتصال غير متاح';flash(e.message);if(e.message.includes('غير مصرح'))openModal('auth-modal')}
}
function go(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));$$('.nav-btn').forEach(p=>p.classList.toggle('active',p.dataset.page===page));$('#crumb-name').textContent=({'dashboard':'نظرة عامة','jobs':'الفرص الوظيفية','profile':'ملفي المهني','applications':'طلبات التقديم','settings':'الإعدادات والتجارب'})[page]||'مسار';window.scrollTo({top:0,behavior:'smooth'});}
function empty(icon,title,detail){return `<div class="empty-state"><div class="empty-icon">${icon}</div><strong>${title}</strong><p>${detail}</p></div>`}

async function renderSourceGroups(){
 const el=$('#source-groups');if(!el)return;
 if(mode==='demo'){el.innerHTML='<p class="body-copy">قائمة المصادر مضافة لنسخة Cloudflare المنشورة، وليست اتصالات فعالة في هذه المعاينة.</p>';return;}
 try{const res=await api('source-groups');
  el.innerHTML=res.groups.map(g=>`<article class="panel"><h3>${esc(g.name)}</h3><div class="body-copy">${g.items.map(i=>`<div style="margin:10px 0"><strong>${esc(i.name)}</strong> <small style="color:var(--muted)">[${esc(i.status)}]</small><div>${esc(i.apply)}</div></div>`).join('')}</div></article>`).join('');
 }catch(e){el.textContent='لم تُحمّل قنوات البحث: '+e.message;}
}

function renderAll(){
 $('#mode-label').textContent=mode==='demo'?'استعراض محلي (غير متصل)':'Cloudflare Worker';
 $('#connection-indicator').textContent=mode==='demo'?'وضع استعراض':'متصل بـCloudflare';
 $('#stat-jobs').textContent=state.jobs.length;
 $('#stat-apps').textContent=state.applications.length;
 $('#stat-sent').textContent=mode==='demo' ? state.applications.filter(a=>a.status==='manually_sent' && isLinkedInApp(a)).length : (state.status.linkedin_sent_today||0);
 $('#ai-counter').textContent=`${state.status.ai_used||0} / 5`;
 $('#jobs-count').textContent=`${state.jobs.length} فرصة`;
 const recent=state.jobs.slice(0,4);
 $('#recent-jobs').innerHTML=recent.length?recent.map(j=>`<div class="recent-item"><div class="company-logo">${esc(j.company.slice(0,1))}</div><div><strong>${esc(j.title)}</strong><p>${esc(j.company)} • ${esc(j.city)}</p></div><button class="small-link" data-go="jobs">عرض ←</button></div>`).join(''):empty('⌕','لا توجد فرص محفوظة','سنختار مصادر البحث بعد إضافة سيرتك والمناصب التي تريدها.');
 renderJobs();renderApplications();fillProfile();renderSourceGroups();
}
function renderJobs(){
 const filter=($('#job-filter').value||'').toLocaleLowerCase();
 const jobs=state.jobs.filter(x=>`${x.title} ${x.company} ${x.city}`.toLocaleLowerCase().includes(filter));
 $('#jobs-list').innerHTML=jobs.length?jobs.map(j=>`<article class="job-card"><div class="job-meta"><div class="company-logo">${esc(j.company.slice(0,1))}</div><span class="subtle-text">${j.application_channel==='email'?'تقديم عبر البريد':j.application_channel==='government'?'بوابة رسمية':j.application_channel==='portal'?'موقع الجهة':'تقديم يدوي'}</span></div><h3 class="job-title">${esc(j.title)}</h3><div class="company-name">${esc(j.company)}</div><span class="job-loc">◉ ${esc(j.city)}</span><div class="job-desc">${esc(j.description||'لم يُضف وصف الوظيفة بعد.')}</div>${j.analysis?`<details><summary class="small-link">عرض تقييم AI</summary><div class="draft-preview">${esc(j.analysis)}</div></details>`:''}<div class="job-actions"><button class="outline-btn" data-analyze="${esc(j.id)}">تحليل الملاءمة</button><button class="primary-btn" data-prepare="${esc(j.id)}">تجهيز طلب</button>${j.url?`<a class="text-link" target="_blank" rel="noopener noreferrer" href="${esc(j.url)}">الإعلان ↗</a>`:''}</div></article>`).join(''):empty('◇','لا توجد فرص هنا','أضف رابطًا ووصفًا لوظيفة حقيقية عندما يصبح ملفك جاهزًا.');
}
function renderApplications(){
 $('#applications-list').innerHTML=state.applications.length?state.applications.map(a=>`<article class="app-card"><div style="flex:1"><h3>${esc(a.title||findJob(a.job_id)?.title||'طلب وظيفي')}</h3><p>${esc(a.company||findJob(a.job_id)?.company||'')} • ${esc(a.status==='manually_sent'?'تم تسجيل إرسال مؤكد':a.status==='review'?'يحتاج مراجعة':a.status==='unknown'?'النتيجة غير مؤكدة':a.status==='cancelled'?'ملغي':'مسودة غير مرسلة')}</p>${a.tailored_resume?`<details><summary class="small-link">النص المخصص</summary><div class="draft-preview">${esc(a.tailored_resume)}</div></details>`:''}</div><div class="app-actions"><span class="status-pill ${a.status==='manually_sent'?'ok':a.status==='unknown'?'unknown':''}">${esc(a.status)}</span>${a.tailored_resume?`<button class="outline-btn" data-download="${esc(a.id)}">تنزيل النص</button>`:''}${a.status!=='manually_sent'?`<button class="outline-btn" data-mark="${esc(a.id)}">تحديث الحالة</button>`:''}</div></article>`).join(''):empty('▤','لا توجد طلبات','عند تجهيز طلب من صفحة الفرص سيظهر هنا.');
}
function findJob(id){return state.jobs.find(j=>j.id===id)}
function isLinkedInApp(a){try{return /(^|\.)linkedin\.com$/i.test(new URL(findJob(a.job_id)?.url||'').hostname)}catch{return false}}
function fillProfile(){const form=$('#profile-form');for(const [k,v] of Object.entries(state.profile)){if(form.elements[k]){if(form.elements[k].type==='checkbox')form.elements[k].checked=Boolean(v);else form.elements[k].value=v||'';}}}
function openModal(id){$('#'+id).classList.remove('hidden');}
function closeModal(id){$('#'+id).classList.add('hidden');}
async function addJob(e){e.preventDefault();const form=e.currentTarget;const v=Object.fromEntries(new FormData(form).entries());try{
 if(mode==='demo'){
  if(state.jobs.some(x=>x.url&&v.url&&x.url.split('?')[0]===v.url.split('?')[0]))throw Error('هذه الفرصة موجودة مسبقًا');
  state.jobs.unshift({...v,id:crypto.randomUUID(),analysis:''});
 }else await api('jobs',{method:'POST',body:JSON.stringify(v)});
 closeModal('job-modal');form.reset();flash(mode==='demo'?'أُضيفت فرصة تجريبية محليًا، ولم تحفظ في السحابة':'حُفظت الفرصة',true);await refresh();go('jobs');
 }catch(err){flash(err.message)}}
async function saveProfile(e){e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget).entries());v.relocation=Boolean(e.currentTarget.elements.relocation.checked);try{if(mode==='demo'){state.profile=v;flash('المعلومات في ذاكرة الاستعراض فقط؛ لا تضع سيرتك الحقيقية هنا.',true)}else{await api('profile',{method:'PUT',body:JSON.stringify(v)});flash('حُفظ ملفك المهني في قاعدة البيانات',true);await refresh()}}catch(err){flash(err.message)}}
async function analyzeJob(id,prepare=false){try{
 const job=findJob(id);if(!job)return;
 if(!state.profile.resume_text?.trim())throw Error('أدخل نص سيرتك أولًا ثم حدد المناصب المستهدفة.');
 if(mode==='demo'){
  if(prepare){if(state.applications.find(x=>x.job_id===id))throw Error('طلب هذه الفرصة موجود مسبقًا');const a={id:crypto.randomUUID(),job_id:id,status:'draft',tailored_resume:'[استعراض فقط] هذه مسودة تجريبية. لم يُستدعَ AI ولم يُنشأ طلب حقيقي.\n\nأضف ملفك إلى النظام المنشور لاستخدام التخصيص الحقيقي.'};state.applications.unshift(a);flash('أُنشئت مسودة استعراض غير مرسلة',true)}
  else{job.analysis='استعراض فقط — لم يتم الاتصال بـWorkers AI. بعد نشر Cloudflare سيحلل وصف الوظيفة مقابل سيرتك.';flash('عرض توضيحي فقط',true)}
 }else{
  const r=await api(`jobs/${encodeURIComponent(id)}/${prepare?'prepare':'analyze'}`,{method:'POST',body:'{}'});
  flash(prepare?'تم تجهيز مسودة للمراجعة ولم تُرسل':'اكتمل تحليل أولي بالذكاء الاصطناعي',true);
 }
 await refresh();
 if(prepare)go('applications');else go('jobs');
 }catch(e){flash(e.message)}}
async function markStatus(id){const app=state.applications.find(a=>a.id===id);if(!app)return;const choice=prompt('اكتب حالة الطلب:\nreview = يحتاج مراجعة\nunknown = نتيجة غير مؤكدة\ncancelled = إلغاء\nmanually_sent = أُرسل يدويًا بتأكيد','review');if(!choice)return;if(!['review','unknown','cancelled','manually_sent'].includes(choice)){flash('حالة غير صالحة');return}let confirmation='';if(choice==='manually_sent'){confirmation=prompt('اكتب تأكيدًا حقيقيًا من الجهة أو رقم الطلب. لا تستخدم هذا للإرسال الفعلي.','')||'';if(confirmation.length<5){flash('لا يمكن تسجيل إرسال دون تأكيد');return}}
 try{if(mode==='demo'){if(choice==='manually_sent' && isLinkedInApp(app) && state.applications.filter(a=>a.status==='manually_sent' && isLinkedInApp(a)).length>=10)throw Error('اكتمل الحد اليومي لتقديمات LinkedIn (10)');app.status=choice;app.confirmation=confirmation;flash('حُدثت حالة الاستعراض فقط',true)}else{await api(`applications/${id}/status`,{method:'POST',body:JSON.stringify({status:choice,confirmation})});flash('حُدثت الحالة',true)}await refresh()}catch(e){flash(e.message)}}
function downloadText(id){const app=state.applications.find(a=>a.id===id);if(!app)return;const blob=new Blob([app.tailored_resume||''],{type:'text/plain;charset=utf-8'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='tailored-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
async function browserTest(){const b=$('#run-browser-test'),out=$('#browser-test-result');b.disabled=true;out.textContent='يجري اختبار نموذج وهمي فقط…';try{if(mode==='demo'){out.textContent='نجاح الاستعراض المحلي: تم التحقق من نموذج وهمي على الصفحة فقط. لا يوجد متصفح Cloudflare فعلي هنا.';flash('نجحت محاكاة الواجهة، ويظل اختبار Cloudflare الحقيقي معلّقًا',true)}else{const r=await api('browser-demo',{method:'POST',body:'{}'});out.textContent=`${r.message} • ${r.confirmation} • ${r.duration_ms} مللي ثانية`;flash('نجح اختبار المتصفح السحابي الوهمي',true)}}catch(e){out.textContent=e.message;flash(e.message)}finally{b.disabled=false}}
function authSave(e){e.preventDefault();const t=$('#admin-token').value.trim();if(t.length<24){flash('يجب إدخال رمز طويل لا يقل عن 24 حرفًا');return}token=t;sessionStorage.setItem('masar_token',t);closeModal('auth-modal');refresh();}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
document.addEventListener('click',e=>{const el=e.target.closest('[data-go],[data-analyze],[data-prepare],[data-download],[data-mark],[data-close]');if(!el)return;if(el.dataset.go)go(el.dataset.go);if(el.dataset.analyze)analyzeJob(el.dataset.analyze);if(el.dataset.prepare)analyzeJob(el.dataset.prepare,true);if(el.dataset.download)downloadText(el.dataset.download);if(el.dataset.mark)markStatus(el.dataset.mark);if(el.dataset.close)closeModal(el.dataset.close)});
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
$('#add-job-open').addEventListener('click',()=>openModal('job-modal'));
$('#auth-open').addEventListener('click',()=>openModal('auth-modal'));
$('#open-auth-settings').addEventListener('click',()=>openModal('auth-modal'));
$('#job-form').addEventListener('submit',addJob);
$('#profile-form').addEventListener('submit',saveProfile);
$('#auth-form').addEventListener('submit',authSave);
$('#clear-auth').addEventListener('click',()=>{sessionStorage.removeItem('masar_token');token='';$('#admin-token').value='';flash('مسح الرمز من جلسة المتصفح',true)});
$('#job-filter').addEventListener('input',renderJobs);
$('#run-browser-test').addEventListener('click',browserTest);
window.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal-backdrop').forEach(m=>closeModal(m.id))});
renderAll();refresh();
