# مسار — نشر Cloudflare بأمر من GitHub (دون تعديل الملفات أو إرسال أسرار في المحادثة)

1. المستودع: `Mehzm-xyz/Mjeed-Career-agent-`.
2. من `Settings → Secrets and variables → Actions` جهّز 3 أسرار: `CLOUDFLARE_API_TOKEN` و`CLOUDFLARE_ACCOUNT_ID` و`APP_TOKEN` (عشوائي 24+ حرفًا). لا تنشر قيمها في GitHub Issues أو ملفات المشروع. استبدل التوكن السابق المتداول بالمحادثة بتوكن محدود الصلاحية.
3. من تبويب `Actions` اختر `Masar Cloudflare - inspect / deploy manually`، واضغط `Run workflow`، وحدد **اسم قاعدة D1 الموجودة بالفعل** (مثل الاسم الفعلي الذي أنشأته في لوحة Cloudflare)، واترك `deploy=false` أولًا.
4. سيفحص سير العمل وجود القاعدة عبر `wrangler d1 list --json` ويستخرج `database_id` لحظيًا، ثم ينشئ إعداد Wrangler **مؤقتًا في سيرفر GitHub** ولا يرفع المعرف إلى المستودع، ويشغّل الاختبارات و`wrangler deploy --dry-run`.
5. بعد نجاح فحص Dry-run، شغّل نفس الإجراء مع `deploy=true` لتطبيق D1 migrations ونشر Worker وحفظ `APP_TOKEN` داخل Cloudflare Worker Secrets. لا توجد عملية إنشاء D1 أو حذف موارد أو إرسال وظائف في هذه الأداة.
6. راقب نتائج `Actions` وURL المنشور من سجل تنفيذ Wrangler. اختبر `/api/health` ثم سجّل الدخول بالرمز الذي حفظته في `APP_TOKEN`.

**حماية:** النشر ليس تلقائيًا عند `push` أو `pull_request`. لا تفعّل `deploy=true` قبل مراجعة PR الإصلاحات الخمسة ودمجه. النسخة الحالية لا ترسل طلبات توظيف حقيقية.

المراجع الرسمية:
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/d1/wrangler-commands/
