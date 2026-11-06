const $=sel=>document.querySelector(sel);
const $$=sel=>[...document.querySelectorAll(sel)];
const esc=(s='')=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mode = location.protocol==='file:' || new URLSearchParams(location.search).get('demo')==='1' ? 'demo' : 'server';
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
 const refreshToken=token;
 try{
 const [status,p,j,a]=await Promise.all([api('status'),api('profile'),api('jobs'),api('applications')]);
 if(token!==refreshToken)return;
 state.status=status;state.profile=p.profile;state.jobs=j.jobs;state.applications=a.applications;
 $('#connection-indicator').textContent='متصل بخادم مسار';renderAll();await loadDiscoverySources();
 }catch(e){$('#connection-indicator').textContent='الاتصال غير متاح';flash(e.message);if(e.message.includes('غير مصرح'))openModal('auth-modal')}
}
function go(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));$$('.nav-btn').forEach(p=>p.classList.toggle('active',p.dataset.page===page));$('#crumb-name').textContent=({'dashboard':'نظرة عامة','jobs':'الفرص الوظيفية','profile':'ملفي المهني','applications':'طلبات التقديم','settings':'الإعدادات والتجارب'})[page]||'مسار';window.scrollTo({top:0,behavior:'smooth'});}
function empty(icon,title,detail){return `<div class="empty-state"><div class="empty-icon">${icon}</div><strong>${title}</strong><p>${detail}</p></div>`}

async function renderSourceGroups(){
 const el=$('#source-groups');if(!el)return;
 if(mode==='demo'){el.innerHTML='<p class="body-copy">قنوات البحث متاحة عند تشغيل الخادم؛ هذه معاينة غير متصلة.</p>';return;}
 if(!token){el.textContent='اربط التطبيق أولًا لعرض المصادر.';return;}
 try{const res=await api('source-groups');
  el.innerHTML=res.groups.map(g=>`<article class="panel"><h3>${esc(g.name)}</h3><div class="body-copy">${g.items.map(i=>`<div style="margin:10px 0"><strong>${esc(i.name)}</strong> <small style="color:var(--muted)">[${esc(i.status)}]</small><div>${esc(i.apply)}</div></div>`).join('')}</div></article>`).join('');
 }catch(e){el.textContent='لم تُحمّل قنوات البحث: '+e.message;}
}

function renderAll(){
 $('#mode-label').textContent=mode==='demo'?'استعراض محلي (غير متصل)':'خادم مسار';
 $('#connection-indicator').textContent=mode==='demo'?'وضع استعراض':'متصل بخادم مسار';
 $('#stat-jobs').textContent=state.jobs.length;
 $('#stat-apps').textContent=state.applications.length;
 $('#stat-sent').textContent=mode==='demo' ? state.applications.filter(a=>a.status==='manually_sent' && isLinkedInApp(a)).length : (state.status.linkedin_sent_today||0);
 $('#ai-counter').textContent=`${state.status.ai_used||0} / 5`;
 $('#jobs-count').textContent=`${state.jobs.length} فرصة`;
 const recent=state.jobs.slice(0,4);
 $('#recent-jobs').innerHTML=recent.length?recent.map(j=>`<div class="recent-item"><div class="company-logo">${esc(j.company.slice(0,1))}</div><div><strong>${esc(j.title)}</strong><p>${esc(j.company)} • ${esc(j.city)}</p></div><button class="small-link" data-go="jobs">عرض ←</button></div>`).join(''):empty('⌕','لا توجد فرص محفوظة','سنختار مصادر البحث بعد إضافة سيرتك والمناصب التي تريدها.');
 renderJobs();renderApplications();fillProfile();renderSourceGroups();
 const options=$('#mail-preview-job');if(options){const selected=options.value;options.innerHTML='<option value="">اختر فرصة محفوظة</option>'+state.jobs.map(j=>`<option value="${esc(j.id)}">${esc(j.title)} — ${esc(j.company)}</option>`).join('');options.value=selected;}
}
function renderJobs(){
 const filter=($('#job-filter').value||'').toLocaleLowerCase();
 const selectedRoles=String(state.profile.target_roles||'').trim();
 const jobs=state.jobs.filter(x=>!selectedRoles || x.is_target_role).filter(x=>`${x.title} ${x.company} ${x.city}`.toLocaleLowerCase().includes(filter));
 $('#jobs-list').innerHTML=jobs.length?jobs.map(j=>`<article class="job-card"><div class="job-meta"><div class="company-logo">${esc(j.company.slice(0,1))}</div><span class="subtle-text">${j.application_channel==='email'?'تقديم عبر البريد':j.application_channel==='government'?'بوابة رسمية':j.application_channel==='portal'?'موقع الجهة':'تقديم يدوي'}</span></div><h3 class="job-title">${esc(j.title)}</h3><div class="company-name">${esc(j.company)}</div>${j.match_score!==undefined?`<p class="body-copy">مؤشر الترتيب: ${esc(j.match_score)} • ${esc((j.match_reasons||[]).join('، '))}</p>${j.match_review_notes?.length?`<p class="body-copy">للمراجعة: ${esc(j.match_review_notes.join('؛ '))}</p>`:''}`:''}<span class="job-loc">◉ ${esc(j.city)}</span><div class="job-desc">${esc(j.description||'لم يُضف وصف الوظيفة بعد.')}</div>${j.analysis?`<details><summary class="small-link">عرض تقييم AI</summary><div class="draft-preview">${esc(j.analysis)}</div></details>`:''}<div class="job-actions"><button class="outline-btn" data-analyze="${esc(j.id)}">تحليل الملاءمة</button><button class="primary-btn" data-prepare="${esc(j.id)}">تجهيز طلب</button>${j.url?`<a class="text-link" target="_blank" rel="noopener noreferrer" href="${esc(j.url)}">الإعلان ↗</a>`:''}</div></article>`).join(''):empty('◇','لا توجد فرص هنا','أضف رابطًا ووصفًا لوظيفة حقيقية عندما يصبح ملفك جاهزًا.');
}
function renderApplications(){
 $('#applications-list').innerHTML=state.applications.length?state.applications.map(a=>`<article class="app-card"><div style="flex:1"><h3>${esc(a.title||findJob(a.job_id)?.title||'طلب وظيفي')}</h3><p>${esc(a.company||findJob(a.job_id)?.company||'')} • ${esc(a.status==='manually_sent'?'تم تسجيل إرسال مؤكد':a.status==='review'?'يحتاج مراجعة':a.status==='unknown'?'النتيجة غير مؤكدة':a.status==='cancelled'?'ملغي':'مسودة غير مرسلة')}</p>${a.tailored_resume?`<details><summary class="small-link">النص المخصص</summary><div class="draft-preview">${esc(a.tailored_resume)}</div></details>`:''}</div><div class="app-actions"><span class="status-pill ${a.status==='manually_sent'?'ok':a.status==='unknown'?'unknown':''}">${esc(a.status)}</span>${a.tailored_resume?`<button class="outline-btn" data-download="${esc(a.id)}">تنزيل النص</button>`:''}${a.status!=='manually_sent'?`<button class="outline-btn" data-mark="${esc(a.id)}">تحديث الحالة</button>`:''}</div></article>`).join(''):empty('▤','لا توجد طلبات','عند تجهيز طلب من صفحة الفرص سيظهر هنا.');
}
function findJob(id){return state.jobs.find(j=>j.id===id)}
function isLinkedInApp(a){try{return /(^|\.)linkedin\.com$/i.test(new URL(findJob(a.job_id)?.url||'').hostname)}catch{return false}}
function fillProfile(){const form=$('#profile-form');for(const [k,v] of Object.entries(state.profile)){if(form.elements[k]){if(form.elements[k].type==='checkbox')form.elements[k].checked=Boolean(v);else form.elements[k].value=v||'';}}for(let i=1;i<=6;i++){const field=form.elements['target_role_'+i];if(field)field.value=String(state.profile.target_roles||'').split(/[,،;\n]/).map(x=>x.trim()).filter(Boolean)[i-1]||'';}const original=$('#download-original-cv');if(original)original.hidden=!state.profile.resume_original_url;}
function openModal(id){$('#'+id).classList.remove('hidden');}
function closeModal(id){$('#'+id).classList.add('hidden');}
async function addJob(e){e.preventDefault();const form=e.currentTarget;const v=Object.fromEntries(new FormData(form).entries());try{
 if(mode==='demo'){
  if(state.jobs.some(x=>x.url&&v.url&&x.url.split('?')[0]===v.url.split('?')[0]))throw Error('هذه الفرصة موجودة مسبقًا');
  state.jobs.unshift({...v,id:crypto.randomUUID(),analysis:''});
 }else await api('jobs',{method:'POST',body:JSON.stringify(v)});
 closeModal('job-modal');form.reset();flash(mode==='demo'?'أُضيفت فرصة تجريبية محليًا، ولم تحفظ في السحابة':'حُفظت الفرصة',true);await refresh();go('jobs');
 }catch(err){flash(err.message)}}
async function saveProfile(e){e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget).entries());v.target_roles=Array.from({length:6},(_,i)=>String(v['target_role_'+(i+1)]||'').trim()).filter(Boolean).join('\n');for(let i=1;i<=6;i++)delete v['target_role_'+i];v.relocation=Boolean(e.currentTarget.elements.relocation.checked);try{if(mode==='demo'){state.profile=v;flash('المعلومات في ذاكرة الاستعراض فقط؛ لا تضع سيرتك الحقيقية هنا.',true)}else{await api('profile',{method:'PUT',body:JSON.stringify(v)});flash('حُفظ ملفك المهني في قاعدة البيانات',true);await refresh()}}catch(err){flash(err.message)}}
async function analyzeJob(id,prepare=false){try{
 const job=findJob(id);if(!job)return;
 if(!state.profile.resume_text?.trim())throw Error('أدخل نص سيرتك أولًا ثم حدد المناصب المستهدفة.');
 if(mode==='demo'){
  if(prepare){if(state.applications.find(x=>x.job_id===id))throw Error('طلب هذه الفرصة موجود مسبقًا');const a={id:crypto.randomUUID(),job_id:id,status:'draft',tailored_resume:'[استعراض فقط] هذه مسودة تجريبية. لم يُستدعَ AI ولم يُنشأ طلب حقيقي.\n\nأضف ملفك إلى النظام المنشور لاستخدام التخصيص الحقيقي.'};state.applications.unshift(a);flash('أُنشئت مسودة استعراض غير مرسلة',true)}
  else{job.analysis='استعراض فقط — لم يُحدد مزود الذكاء بعد. التحليل الفعلي يتطلب ربط مزود تختاره لاحقًا.';flash('عرض توضيحي فقط',true)}
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
async function downloadOriginalCv(){try{const response=await fetch('/api/cv/original',{headers:{authorization:`Bearer ${token}`}});if(!response.ok){const r=await response.json();throw Error(r.error||'تعذر تنزيل السيرة')}const href=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=href;a.download=(response.headers.get('content-disposition')||'').match(/filename="([^"]+)"/)?.[1]||'Resume';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}catch(e){flash(e.message)}}
async function browserTest(){const b=$('#run-browser-test'),out=$('#browser-test-result');b.disabled=true;out.textContent='يجري اختبار نموذج وهمي فقط…';try{if(mode==='demo'){out.textContent='نجاح الاستعراض المحلي: تم التحقق من نموذج وهمي على الصفحة فقط. لم يُربط مزود متصفح فعلي.';flash('نجحت محاكاة الواجهة، واختبار المتصفح الفعلي يتطلب اختيار مزوده',true)}else{const r=await api('browser-demo',{method:'POST',body:'{}'});out.textContent=`${r.message} • ${r.confirmation} • ${r.duration_ms} مللي ثانية`;flash('نجح اختبار المتصفح السحابي الوهمي',true)}}catch(e){out.textContent=e.message;flash(e.message)}finally{b.disabled=false}}
function authSave(e){e.preventDefault();const t=$('#admin-token').value.trim();if(t.length<24){flash('يجب إدخال رمز طويل لا يقل عن 24 حرفًا');return}token=t;sessionStorage.setItem('masar_token',t);closeModal('auth-modal');refresh();}

async function loadDiscoverySources(){
 const el=$('#discovery-sources');if(!el)return;
 if(mode==='demo'){el.textContent='البحث الفعلي يتطلب تشغيل الخادم.';return;}
 if(!token){el.textContent='اربط التطبيق أولًا لعرض مصادر الوظائف.';return;}
 try {const r=await api('discovery/sources');
  el.innerHTML=r.sources.length?r.sources.map(x=>`<div class="setting-row"><span>${esc(x.company)} • ${esc(x.provider)} / ${esc(x.board)}</span><button type="button" class="outline-btn" data-remove-source="${esc(x.id)}">حذف</button></div>`).join(''):'لا توجد مصادر مضافة.';
 }catch(e){el.textContent=e.message;}
}
async function addDiscoverySource(e){
 e.preventDefault();if(mode==='demo'){flash('الاستعراض لا يحفظ مصادر حقيقية');return}
 const form=e.currentTarget;
 try{const v=Object.fromEntries(new FormData(form).entries());await api('discovery/sources',{method:'POST',body:JSON.stringify(v)});form.reset();await loadDiscoverySources();flash('أُضيف مصدر الوظائف',true)}catch(e){flash(e.message)}
}
async function runDiscovery(){const out=$('#discovery-result');if(mode==='demo'){out.textContent='لا يوجد بحث شبكي في وضع الاستعراض';return}
 out.textContent='جلب بيانات الوظائف المنشورة...';try{const r=await api('discovery/run',{method:'POST',body:'{}'});out.textContent=`تم العثور على ${r.seen} وظيفة بالسعودية؛ أُضيفت ${r.created} فرصة جديدة. أخطاء المصادر: ${r.errors.length}`;await refresh()}catch(e){out.textContent=e.message;}
}
async function importCv(e){e.preventDefault();const out=$('#cv-import-result');if(mode==='demo'){out.textContent='استيراد الملفات يعمل عند تشغيل الخادم؛ لا تضع بياناتك في الاستعراض.';return}
 const form=e.currentTarget;const data=new FormData(form);out.textContent='جاري استخراج نص السيرة...';
 try{const response=await fetch('/api/cv/import',{method:'POST',headers:{authorization:`Bearer ${token}`},body:data});const r=await response.json();if(!response.ok)throw Error(r.error||'فشل الاستيراد');out.textContent=`استُخرج ${r.characters} حرفًا (${r.format}). النسخة الأصلية ${r.original_stored?'محفوظة بشكل خاص':'غير محفوظة'}.`;await refresh();flash('تم تحديث السيرة الأصلية بالنص المستخرج',true)}catch(e){out.textContent=e.message;flash(e.message)}
}

function requireLiveWorkspace(){if(mode==='demo')throw Error('هذه معاينة غير متصلة؛ شغّل الخادم أولًا');if(!token)throw Error('أدخل رمز الإدارة أولًا');return token;}
function clearWorkspaceViews(){
 for(const id of ['mail-status','mail-threads','mail-messages','career-report','market-evidence','mail-preview','data-export-result']){const el=$('#'+id);if(el)el.textContent='';}
 for(const id of ['mail-thread-form','mail-preview-form','market-evidence-form'])$('#'+id)?.reset();
}
async function loadMailWorkspace(){
 const savedToken=requireLiveWorkspace();
 const [status,t,m]=await Promise.all([api('mail/status'),api('mail/threads'),api('mail/messages')]);
 if(token!==savedToken)return;
 const last=status.last_check;
 $('#mail-status').textContent=`${status.connected?'موصل البريد مُعدّ':'موصل البريد غير مُعدّ'} • ${status.identity_verified?'تم التحقق من الحساب':'هوية الحساب لم تُتحقق بعد'} • الإرسال متوقف • الفحص اليومي ${status.daily_check_enabled?'مفعّل أثناء تشغيل الخادم':'غير مفعّل'}${last?` • آخر فحص: ${last.finished_at||last.started_at||'غير مكتمل'} (${last.status||''})`:''}`;
 const threads=t.threads||[];
 $('#mail-threads').innerHTML=threads.length?threads.map(x=>`<article class="app-card"><div><h3>${esc(x.job_title)} • ${esc(x.company)}</h3><p>${esc(x.recipient)} • ${esc(x.subject)}</p><p>${esc(x.followup_state)} • آخر فحص ${esc(x.last_checked_at||'لم يُفحص بعد')}</p>${x.followups?`<p>${x.followups.map(f=>`${esc(f.kind)}: ${esc(f.due_at)}`).join(' • ')}</p>`:''}</div></article>`).join(''):empty('✉','لا توجد محادثات للمتابعة','أضف معرّف محادثة أُرسلت بالفعل بعد ربط الحساب.');
 const messages=m.messages||[];
 const labels={human:'رد بشري (تصنيف أولي)',automatic:'تأكيد أو رد آلي',bounce:'تعذر التسليم'};
 $('#mail-messages').innerHTML=messages.map(x=>`<article class="panel"><h3>${esc(x.sender)} • ${esc(labels[x.classification]||x.classification)}</h3><p>${esc(x.received_at)}</p><div class="draft-preview">${esc(x.body)}</div><label>تصحيح التصنيف<select data-reclassify="${esc(x.id)}"><option value="human" ${x.classification==='human'?'selected':''}>بشري</option><option value="automatic" ${x.classification==='automatic'?'selected':''}>آلي</option><option value="bounce" ${x.classification==='bounce'?'selected':''}>تعذر التسليم</option></select></label>${x.classification==='human'?`<details><summary class="small-link">مسودة رد للمراجعة</summary><textarea id="reply-${esc(x.id)}" rows="5">${esc(x.reply_draft||'')}</textarea><button class="outline-btn" type="button" data-reply-generate="${esc(x.id)}">توليد مسودة بعد ربط الذكاء</button> <button class="outline-btn" type="button" data-reply-save="${esc(x.id)}">حفظ تعديلي فقط</button><p class="body-copy">المسودة تحتاج مراجعتك ولا تُرسل تلقائيًا.</p></details>`:''}</article>`).join('');
}
async function checkMail(){
 const b=$('#mail-check-now');b.disabled=true;
 try{requireLiveWorkspace();$('#mail-status').textContent='يجري فحص المحادثات المتابعة فقط…';const r=await api('mail/check',{method:'POST',body:'{}'});await loadMailWorkspace();flash(r.skipped?'هناك فحص جارٍ أو لم يحن الفحص الدوري':`فُحصت ${r.checked||0} محادثة، وأُضيف ${r.imported||0} رد. لم يُرسل بريد.`,true)}catch(e){$('#mail-status').textContent=e.message;flash(e.message)}finally{b.disabled=false}
}
async function addMailThread(e){
 e.preventDefault();const form=e.currentTarget;
 try{requireLiveWorkspace();const v=Object.fromEntries(new FormData(form).entries());v.sent_at=new Date(v.sent_at).toISOString();await api('mail/threads',{method:'POST',body:JSON.stringify(v)});form.reset();await loadMailWorkspace();flash('أُضيفت المحادثة للمتابعة؛ لم يُرسل بريد',true)}catch(error){flash(error.message)}
}
async function handleReply(id,generate=false){
 try{requireLiveWorkspace();const payload=generate?{}:{draft:document.getElementById('reply-'+id)?.value||''};await api('mail/messages/'+encodeURIComponent(id)+'/reply',{method:'POST',body:JSON.stringify(payload)});await loadMailWorkspace();flash('حُفظت مسودة الرد للمراجعة، ولم تُرسل',true)}catch(e){flash(e.message)}
}
async function loadCareerReport(){
 const savedToken=requireLiveWorkspace();const r=await api('intelligence');if(token!==savedToken)return;
 const f=r.facts||{},a=r.analysis||{};
 $('#career-report').innerHTML=`<h3>الحقائق من البيانات المحفوظة</h3><p>فرص: ${esc(f.vacancies||0)} • تقديمات: ${esc(f.applications||0)} • محادثات متابعة: ${esc(f.tracked_threads||0)} • محادثات برد بشري: ${esc(f.human_reply_threads||0)}</p><p>نسبة التجاوب البشري: ${f.response_rate===null||f.response_rate===undefined?'لا توجد عينة':esc((100*f.response_rate).toFixed(1))+'%'} • العينة التي مضى عليها أسبوع: ${esc(f.mature_threads||0)}</p><h3>التحليل والتوصيات</h3><p>${esc(a.method||'')}</p><ul>${(a.recommendations||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${(a.ranked_opportunities||[]).map(x=>`<p>${esc(x.title)} — ${esc(x.company)} • مؤشر ترتيب ${esc(x.match_score)}</p>`).join('')}<p>${(a.limitations||[]).map(esc).join(' • ')}</p><p>مزود الذكاء: ${r.ai_selected?'مربوط':'لم يُحدد بعد'}</p>`;
 const evidence=r.market_evidence||[];
 $('#market-evidence').innerHTML=evidence.length?evidence.map(x=>`<article class="panel"><h3>${esc(x.company)} • ${esc(x.kind)}</h3><p>${esc(x.summary)}</p><p>${esc(x.observed_at)} • ${esc(x.status)}</p><p dir="ltr">${esc(x.source_url)}</p><button class="outline-btn" data-verify-evidence="${esc(x.id)}">اعتماد المصدر بعد مراجعته</button> <button class="ghost-btn" data-delete-evidence="${esc(x.id)}">حذف الدليل</button></article>`).join(''):'لا توجد أدلة سوق محفوظة.';
}
async function addMarketEvidence(e){
 e.preventDefault();const form=e.currentTarget;
 try{requireLiveWorkspace();const v=Object.fromEntries(new FormData(form).entries());v.observed_at=new Date(v.observed_at).toISOString();await api('market/evidence',{method:'POST',body:JSON.stringify(v)});form.reset();await loadCareerReport();flash('حُفظ الدليل بوصفه غير متحقق، ولا يتحول إلى حقيقة تلقائيًا',true)}catch(error){flash(error.message)}
}
async function exportWorkspace(){
 const out=$('#data-export-result');
 try{const savedToken=requireLiveWorkspace();const response=await fetch('/api/data/export',{headers:{authorization:`Bearer ${token}`}});if(!response.ok){const r=await response.json();throw Error(r.error||'فشل تصدير البيانات')}const blob=await response.blob();if(token!==savedToken)return;const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='masar-data-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);out.textContent='نُزلت نسخة خاصة من بياناتك. احفظها في مكان مناسب.';}catch(e){out.textContent=e.message;flash(e.message)}
}
async function previewMail(e,save=false){
 e?.preventDefault();const form=$('#mail-preview-form');
 try{const savedToken=requireLiveWorkspace();const v=Object.fromEntries(new FormData(form).entries());if(!v.job_id)throw Error('اختر فرصة أولًا');const r=await api('jobs/'+encodeURIComponent(v.job_id)+(save?'/mail-draft':'/mail-preview'),{method:'POST',body:JSON.stringify({body:v.body})});if(token!==savedToken)return;const p=r.preview||r;$('#mail-preview').textContent=save?'حُفظت مسودة في Gmail فقط، ولم يُرسل بريد.':`${p.subject||''}

${p.body||''}

المرفق: ${p.attachment_name||''} • ${p.attachment_mime||'application/pdf'} • ${p.attachment_bytes||0} بايت`;flash(save?'حُفظت مسودة Gmail بدون إرسال':'المعاينة جاهزة للمراجعة',true)}catch(error){flash(error.message)}
}

$$('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
document.addEventListener('click',e=>{const el=e.target.closest('[data-go],[data-analyze],[data-prepare],[data-download],[data-mark],[data-close],[data-remove-source]');if(!el)return;if(el.dataset.go)go(el.dataset.go);if(el.dataset.analyze)analyzeJob(el.dataset.analyze);if(el.dataset.prepare)analyzeJob(el.dataset.prepare,true);if(el.dataset.download)downloadText(el.dataset.download);if(el.dataset.mark)markStatus(el.dataset.mark);if(el.dataset.close)closeModal(el.dataset.close);if(el.dataset.removeSource&&mode!=='demo')api('discovery/sources/'+encodeURIComponent(el.dataset.removeSource),{method:'DELETE'}).then(loadDiscoverySources).catch(e=>flash(e.message))});
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
$('#add-job-open').addEventListener('click',()=>openModal('job-modal'));
$('#auth-open').addEventListener('click',()=>openModal('auth-modal'));
$('#open-auth-settings').addEventListener('click',()=>openModal('auth-modal'));
$('#job-form').addEventListener('submit',addJob);
$('#cv-import-form').addEventListener('submit',importCv);
$('#download-original-cv').addEventListener('click',downloadOriginalCv);
$('#discovery-source-form').addEventListener('submit',addDiscoverySource);
$('#discover-now').addEventListener('click',runDiscovery);
$('#profile-form').addEventListener('submit',saveProfile);
$('#auth-form').addEventListener('submit',authSave);
$('#clear-auth').addEventListener('click',()=>{sessionStorage.removeItem('masar_token');token='';$('#admin-token').value='';state.jobs=[];state.applications=[];state.profile={};state.status={};clearWorkspaceViews();$('#profile-form').reset();renderAll();$('#connection-indicator').textContent='يحتاج ربطًا';flash('مسح الرمز وبيانات الجلسة من الصفحة',true)});
$('#job-filter').addEventListener('input',renderJobs);
$('#run-browser-test').addEventListener('click',browserTest);
$('#mail-status-refresh').addEventListener('click',()=>loadMailWorkspace().catch(e=>flash(e.message)));
$('#mail-check-now').addEventListener('click',checkMail);
$('#mail-thread-form').addEventListener('submit',addMailThread);
$('#career-report-refresh').addEventListener('click',()=>loadCareerReport().catch(e=>flash(e.message)));
$('#market-evidence-form').addEventListener('submit',addMarketEvidence);
$('#data-export').addEventListener('click',exportWorkspace);
$('#mail-preview-form').addEventListener('submit',previewMail);
$('#mail-save-draft').addEventListener('click',()=>previewMail(null,true));
document.addEventListener('click',e=>{const b=e.target.closest('[data-reply-generate],[data-reply-save]');if(!b)return;if(b.dataset.replyGenerate)handleReply(b.dataset.replyGenerate,true);if(b.dataset.replySave)handleReply(b.dataset.replySave);});
window.addEventListener('keydown' ,e=>{if(e.key==='Escape')$$('.modal-backdrop').forEach(m=>closeModal(m.id))});
renderAll();refresh();loadDiscoverySources();

document.addEventListener('change',async e=>{const el=e.target.closest('[data-reclassify]');if(!el)return;try{requireLiveWorkspace();await api('mail/messages/'+encodeURIComponent(el.dataset.reclassify)+'/classify',{method:'POST',body:JSON.stringify({classification:el.value})});await loadMailWorkspace()}catch(err){flash(err.message)}});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-verify-evidence],[data-delete-evidence]');if(!el)return;try{requireLiveWorkspace();const remove=Boolean(el.dataset.deleteEvidence);await api('market/evidence/'+encodeURIComponent(el.dataset.deleteEvidence||el.dataset.verifyEvidence),{method:remove?'DELETE':'PATCH',...(remove?{}:{body:JSON.stringify({status:'verified'})})});await loadCareerReport()}catch(err){flash(err.message)}});
