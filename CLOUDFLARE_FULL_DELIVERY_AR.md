# مسار — تسليم نسخة Cloudflare (إصدار تكميلي)

هذه نسخة من **نظام مسار السعودي للتوظيف**، ليست مشروع Lovable أو الصفحة المهنية القديمة.

## وظيفة كل جزء
- Cloudflare Worker: واجهة API، الفلترة، إعداد مسودات التقديم، ضوابط الوصول والحصص، واختبار متصفح وهمي.
- Workers Static Assets: واجهة عربية للجوال والكمبيوتر.
- Cloudflare D1: الملف المهني، الوظائف، الطلبات، إعدادات مصادر التوظيف وسجل التحديثات.
- Workers AI: تحليل ملاءمة الإعلان وتوليد مسودة نصية للمراجعة.
- Cron Triggers: ثلاثة مواعيد يوميًا (09:00، 12:00، 15:00 الرياض)؛ **معطل افتراضيًا** حتى يفعّل المالك `ENABLE_JOB_DISCOVERY=true`.
- R2: تخزين الملف الأصلي للسيرة **اختياري ومعطل افتراضيًا**؛ النص المستخرج يخزَّن في D1. التفعيل يحتاج إنشاء bucket وإضافة binding باسم `RESUME_BUCKET` وضبط `ENABLE_CV_FILE_STORAGE=true` بعد مراجعة السعر والحصص.
- GitHub: حفظ الكود وCI وأداة إطلاق نشر يدوي، وليس استضافة التطبيق.

## ما يعمل في الكود
1. إنشاء مصادر وظائف من **Greenhouse / Lever / Ashby** باستخدام رموز لوحات توظيف معروفة، لا مسح عشوائي للويب.
2. استيراد الوظائف المنشورة في الرياض أولًا ثم المدن السعودية. لا تُستورد الوظائف ذات الموقع غير المعروف أو خارج السعودية افتراضيًا.
3. كشف التكرار عبر رابط الوظيفة و`dedup_key`.
4. استخراج نص TXT/PDF/DOCX واستبدال نص السيرة الأصلي بعد طلب المستخدم مباشرة. حدود الملف: 2 MiB وPDF حتى 25 صفحة.
5. تحليل الوظائف وتجهيز المسودات بوساطة Workers AI (مع ضبط حصة AI الداخلية).
6. تسجيل تأكيدات الإرسال اليدوية فقط؛ أي إرسال فعلي على LinkedIn أو غيرها **غير مفعل**.
7. ضوابط يوم الرياض وحد LinkedIn اليومي تُختبر في SQL، وليست بديلاً عن موافقة المستخدم أو امتثال المنصة.

## إجراء النشر من GitHub
1. استخدم المستودع `Mehzm-xyz/Mjeed-Career-agent-` على الفرع `main` بعد نجاح مراجعة CI.
2. من GitHub Actions Secrets جهّز `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `APP_TOKEN`. **يجب تدوير أي توكن أُرسل في محادثة؛ لا تضعه في الكود أو التعليقات**.
3. افتح Actions → **Masar Cloudflare - inspect / deploy manually** وأدخل اسم **قاعدة D1 الموجودة** (ليس UUID)، و`deploy=false` أولًا.
4. إذا نجح البناء وفحص الحصص والترحيلات، نفذ `deploy=true` لتطبيق migrations بالتتابع ونشر Worker وحفظ APP_TOKEN كـ Worker Secret.
5. اختبر `/api/health` ثم رمز الإدارة، واستيراد TXT صغير، وإضافة لوحة وظائف عامة، ثم `discovery/run`.
6. لإتاحة البحث الدوري فعّل `ENABLE_JOB_DISCOVERY=true` وانشر مجددًا. لا تشغّل Cron إذا لم تضبط مصادر الوظائف أو إذا كانت حصص الخدمة غير مناسبة.
7. لا تضف R2 قبل مراجعة طلبه الفعلي وخطة حساب Cloudflare؛ **ليس شرطًا لتشغيل المنصة الأساسية**.

## التحقق والنواقص الصريحة
- اختبارات Node وSQLite/GitHub Actions لا تثبت أن Worker نُشر وأن PDF/DOCX فعليًا يعملان في Cloudflare؛ يلزم اختبار حقيقي بعد التفويض.
- لا توجد أي تكاملات تقديم حقيقي جاهزة على حسابات المواقع. الربط مع البريد أو ATS يحتاج صلاحيات صريحة؛ لا تُستخدم جلسات LinkedIn أو تجاوز CAPTCHA.
- البحث لا يبدأ قبل إضافة رموز لوحات جهات موظِّفة حقيقية. ليس محرك بحث شاملًا لكل إعلانات المملكة.
- لا تجعل R2 أو Browser Run خدمة مدفوعة أو ترفع خطة Cloudflare تلقائيًا.

## مراجع تقنية
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://docs.greenhouse.io/job-board.html
- https://github.com/lever/postings-api
- https://developers.ashbyhq.com/docs/public-job-posting-api
- https://github.com/unjs/unpdf
- https://github.com/mwilliamson/mammoth.js
- https://developers.cloudflare.com/r2/pricing/
