# مسار — حالة التسليم 2026-11-05

- الملفات البرمجية والتصميم وقاعدة البيانات وطابور التجربة موجودة.
- `npm test`: 10 اختبارات ناجحة.
- `npm run preflight`: فحص الملفات لمنع رفع أسرار العرض والملفات الحساسة.
- لم يُجرَ نشر Cloudflare، ولم يُربط حساب أو تُرسل طلبات وظائف.
- فرع GitHub لم يُنشأ من أداة المحادثة: GitHub أعاد `403 Resource not accessible by integration` رغم إمكان القراءة.
- المستودع المحدد: `Mj-aCRM/cloud-console-sample-build`. لا تستبدل محتوى المستودع القديم؛ ضع ملفات المشروع في المسار `masar/`.
- قبل النشر: أنشئ D1، عوّض `database_id` في wrangler.jsonc، احفظ `APP_TOKEN` في Cloudflare Secrets، طبق migrations، ثم اختبر Health وواجهة المستخدم ورفض API غير المصرح.
- لا تضع `CLOUDFLARE_API_TOKEN` ولا كلمات المرور في المستودع أو في محادثات GitHub Issues. ربط Cloudflare بـGitHub مباشرة يغني عن رمز GitHub Actions للنشر الاعتيادي.
- تذكير: `ENABLE_BROWSER_DEMO` معطّل افتراضيًا؛ تشغيل الاختبار يحتاج حصة Browser Rendering المتاحة في حسابك، ولا يوجد إرسال حقيقي في هذا الإصدار.
