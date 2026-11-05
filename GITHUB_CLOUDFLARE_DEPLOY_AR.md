# نشر مسار من GitHub إلى Cloudflare — دليل الهاتف

## حالة هذه النسخة
هذه نسخة MVP تجريبية. محرك تقديم طلبات الوظائف الحقيقي غير مفعل؛ الاختبار المتاح للمتصفح يعمل على نموذج وهمي فقط. لا تدخل السيرة الحقيقية قبل ضبط APP_TOKEN والتحكم في الوصول.

## 1. وضع المشروع في GitHub
المستودع المحدد: `Mj-aCRM/cloud-console-sample-build`.
حافظ على الملفات القديمة في الجذر؛ أضف ملفات هذا المشروع في مجلد `masar/` (بحيث يكون `masar/wrangler.jsonc` موجودا).
الربط الآلي من هذه المحادثة اصطدم بصلاحية GitHub integration (HTTP 403) ولم يتم رفع أي ملف. يمكن استخدام GitHub Codespaces في المتصفح لإضافة المجلد من ملفات ZIP ثم commit/push، أو تمكين موصل GitHub بصلاحية إنشاء الفروع والكتابة.

## 2. إعداد Cloudflare (بدون حفظ رمز Cloudflare في GitHub)
1. افتح Cloudflare Dashboard > Workers & Pages > D1، وأنشئ قاعدة اسمها `saudi-job-copilot-db` على الخطة المجانية بعد التحقق من عدم وجود رسوم إضافية.
2. خذ `database_id` الخاص بها وضعه مكان `REPLACE_WITH_D1_DATABASE_ID` في `masar/wrangler.jsonc`، ثم commit؛ لا تعدّل البيانات السرية في الملف.
3. أنشئ Worker جديدا باسم `saudi-job-copilot` من Workers & Pages > Create application، واختر GitHub كموفر المصدر.
4. اختر المستودع `Mj-aCRM/cloud-console-sample-build` والفرع الذي يحتوي على المجلد `masar`، وحدد **Root directory: `masar`**.
5. أمر النشر المقترح: `npx wrangler deploy`. عند استخدام Workers Builds غالبا تنشئ Cloudflare رمز بناء خاصا بها تلقائيا؛ لا يلزم GitHub Actions ولا وضع CF_API_TOKEN في GitHub لهذه الطريقة.
6. قبل التشغيل الحقيقي، طبّق ترحيلات قاعدة D1 على البعيد: `npx wrangler d1 migrations apply JOBS_DB --remote` من بيئة عمل موثوقة أو بيئة إصدار مُعتمدة، بعد مراجعة المخطط.
7. داخل Worker > Settings > Variables and Secrets، أضف Secret باسم `APP_TOKEN` بقيمة عشوائية قوية (لا تضعه في GitHub أو في المحادثة).
8. اترك `ENABLE_BROWSER_DEMO=false` إلى أن يكون حسابك على Free وحصة Browser Run مؤكدة، ثم اختبر فقط النموذج الوهمي.

قد تتغير خطوات لوحة Cloudflare؛ المرجع: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ و https://developers.cloudflare.com/workers/configuration/secrets/

## 3. سياسة الأسرار
- `APP_TOKEN`: Cloudflare Worker runtime secret؛ لكل Worker/بيئة حسب الحاجة.
- `CLOUDFLARE_API_TOKEN`: لا حاجة له مع Git integration المباشرة. إذا استخدمت GitHub Actions لاحقا، خزنه في GitHub Actions Secrets للمستودع المخصص، مع `CLOUDFLARE_ACCOUNT_ID`.
- `Gmail`: يتطلب ربط موافقة مستقل؛ لا تحفظ كلمة مرور Google في كود المشروع.
- GitHub Repository Secrets تخص المستودع فقط. Organization Secrets يمكن توزيعها على مستودعات محددة في مؤسسة، لكن لا تتوفر للمستودعات الخاصة تحت GitHub Free. لم يُنشأ أي سر في GitHub في هذه الجلسة.
- راجع حدود Cloudflare Free قبل أي نشر؛ توقف عند انتهاء الحصص ولا تفعّل خطة مدفوعة.

## 4. التحقق بعد النشر
- زيارة الصفحة العامة -> صفحة واجهة مسار تظهر.
- API بدون APP_TOKEN -> يرفض الطلبات المحمية.
- تطبيق migrations على D1 -> الجداول موجودة.
- اختبار نموذج المتصفح الوهمي فقط -> لا يرسل طلب توظيف حقيقي.
- اختبار `npm test` محليا -> عشرة اختبارات ناجحة بتاريخ 2026-11-05.

**غير منفّذ بعد:** الاتصال الفعلي بالحساب، تطبيق migrations البعيدة، تشغيل Browser Run السحابي، ربط Gmail، رفع CV، أو تقديم وظيفة.
