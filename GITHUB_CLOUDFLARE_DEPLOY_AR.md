# نشر «مسار» من منظمة محزم إلى Cloudflare — دليل الجوال

## تم إنجازه
المشروع مرفوع ومُدمج في الفرع الرئيسي:
https://github.com/Mehzm-xyz/Mjeed-Career-agent-

- **جذر المشروع هو المستودع نفسه `.`**، وليس مجلدًا باسم `masar`.
- Worker المعرّف في `wrangler.jsonc` اسمه **`saudi-job-copilot`**.
- الاختبارات المحلية: **10/10 ناجحة**. لا يوجد إرسال وظائف فعلي أو ربط حسابات في هذا الإصدار.
- المستودع **عام**. لا تنشر CV أو كلمات مرور أو الرموز داخله.

## الخطوة 1 — إنشاء قاعدة D1 (قبل نشر Worker)
1. ادخل https://dash.cloudflare.com/ بحسابك، واختر حساب Cloudflare المناسب.
2. من **Storage & databases / D1** أنشئ قاعدة باسم `saudi-job-copilot-db`.
3. انسخ قيمة **Database ID** (معرّف غير سري بحد ذاته).
4. في GitHub افتح `wrangler.jsonc` من المستودع أعلاه، ثم Edit، واستبدل القيمة `REPLACE_WITH_D1_DATABASE_ID` بمعرّف قاعدة D1، واحفظ التعديل في `main`.
5. طبّق ملفَي قاعدة البيانات `migrations/0001_init.sql` و`migrations/0002_dispatch.sql` على D1 من بيئة موثوقة، بالترتيب، أو بأمر `npx wrangler d1 migrations apply JOBS_DB --remote` بعد إعداد الربط المناسب.

**تنبيه:** لا تنشر قبل تغيير المعرّف؛ الإعداد الحالي غير مكتمل.

## الخطوة 2 — ربط GitHub بـCloudflare
1. من **Workers & Pages → Create application → GitHub**، صرّح لتطبيق Cloudflare بالوصول إلى منظمة `Mehzm-xyz`، والمستودع `Mjeed-Career-agent-`.
2. اختر المستودع `Mehzm-xyz/Mjeed-Career-agent-` والفرع `main`.
3. اضبط **Root directory: `.`** واسم Worker: `saudi-job-copilot`.
4. عند طلب أمر النشر، استخدم `npx wrangler deploy`، وأكمل فقط بعد التأكد من عدم وجود خطة أو خدمات مدفوعة.
5. بعدها افتح عنوان `workers.dev` الناتج من Cloudflare واختبر `/api/health` والواجهة.

المرجع الرسمي: https://developers.cloudflare.com/workers/ci-cd/builds/

## الخطوة 3 — الأسرار والصلاحيات
- داخل إعدادات Worker في Cloudflare، أنشئ **Secret** باسم `APP_TOKEN` بقيمة عشوائية قوية (24 حرفًا أو أكثر). لا تضفه لملفات GitHub.
- مع الربط المباشر من Cloudflare إلى GitHub لا تحتاج إلى `CLOUDFLARE_API_TOKEN` في GitHub Actions.
- إن اخترت Actions لاحقًا: خزّن رمزًا *جديدًا محدود الصلاحيات* في GitHub Actions Secrets، مع `CLOUDFLARE_ACCOUNT_ID`. لا تضع الأسرار في ملفات المشروع.
- Repository Secrets تخص المستودع؛ Organization Secrets يمكن مشاركتها مع مستودعات مختارة وفق خطة GitHub وإعداداتها.
- اترك `ENABLE_BROWSER_DEMO=false` حتى اختبار Browser Run على نموذج `public/try-form.html` الوهمي.

المرجع: https://developers.cloudflare.com/workers/configuration/secrets/

## ما لم يُنفّذ بعد
- نشر Cloudflare واختبار البيئة السحابية
- إنشاء D1 وتطبيق migrations وحفظ APP_TOKEN
- ربط Gmail أو LinkedIn أو حسابات مواقع التوظيف
- استيراد CV بصيغة PDF/DOCX
- إرسال طلب توظيف حقيقي

**السياسة:** تكلفة صفر، ولا إرسال تلقائي على مواقع فعلية قبل اختبار التكاملات والتحقق من الصلاحيات ونتائج الإرسال.
