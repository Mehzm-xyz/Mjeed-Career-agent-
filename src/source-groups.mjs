/* مرشحون للدراسة؛ ليست هذه قائمة تكاملات عاملة أو تصنيفًا للشهرة. */
export const SOURCE_GROUPS = [
  {
    "id": "saudi-boards",
    "name": "لوحات الوظائف المستخدمة في السعودية",
    "items": [
      {
        "id": "linkedin",
        "name": "LinkedIn",
        "status": "discovery_candidate",
        "apply": "تقديم داخل LinkedIn غير مفعّل؛ الأتمتة الخارجية غير المصرح بها قد تقيد الحساب. روابط التقديم الخارجي تذهب لمسار الشركة.",
        "review": "لا يوجد ربط بحساب LinkedIn حتى الآن."
      },
      {
        "id": "bayt",
        "name": "بيت.كوم",
        "status": "needs_evaluation",
        "apply": "يحتاج اختبار تدفق الحساب والإرسال قبل اعتماده."
      },
      {
        "id": "gulftalent",
        "name": "GulfTalent",
        "status": "needs_evaluation",
        "apply": "يحتاج اختبار تدفق الحساب والإرسال قبل اعتماده."
      },
      {
        "id": "naukrigulf",
        "name": "Naukrigulf",
        "status": "needs_evaluation",
        "apply": "يحتاج اختبار تدفق الحساب والإرسال قبل اعتماده."
      },
      {
        "id": "tanqeeb",
        "name": "تنقيب",
        "status": "discovery_candidate",
        "apply": "مصدر اكتشاف مرشح؛ لا نفترض أنه قناة إرسال."
      }
    ]
  },
  {
    "id": "official-saudi",
    "name": "القطاع الحكومي والجهات الرسمية",
    "items": [
      {
        "id": "jadarat",
        "name": "جدارات",
        "status": "needs_owner_for_auth",
        "apply": "اكتشاف وتجهيز الطلب؛ اعتماد الإرسال الرسمي يتطلب مراجعة مسار الدخول والتفويض."
      },
      {
        "id": "agency-careers",
        "name": "بوابات توظيف الجهات الحكومية وشبه الحكومية",
        "status": "needs_evaluation",
        "apply": "قنوات منفصلة تحدد بعد رفع السيرة؛ لا نفترض أن بريد التواصل بديل للبوابة."
      }
    ]
  },
  {
    "id": "direct-companies",
    "name": "مواقع الشركات وأنظمة التوظيف",
    "items": [
      {
        "id": "company-direct",
        "name": "المواقع الرسمية للشركات",
        "status": "priority_poc",
        "apply": "الأولوية للاختبار على صفحة جهة فعلية بعد التفويض."
      },
      {
        "id": "workday",
        "name": "Workday",
        "status": "candidate_submit_engine",
        "apply": "مرشح لكود إرسال Playwright؛ يتطلب اختبار تسجيل الدخول وحقول الجهة."
      },
      {
        "id": "oracle",
        "name": "Oracle Recruiting",
        "status": "needs_evaluation",
        "apply": "مرشح لمراجعة الحسابات وتدفقات التسجيل الفعلية."
      },
      {
        "id": "successfactors",
        "name": "SAP SuccessFactors",
        "status": "needs_evaluation",
        "apply": "مرشح لمراجعة الحسابات وتدفقات التسجيل الفعلية."
      },
      {
        "id": "greenhouse",
        "name": "Greenhouse",
        "status": "candidate_submit_engine",
        "apply": "أكواد إرسال مرشحة في GitHub، غير مدمجة أو مختبرة في التطبيق."
      },
      {
        "id": "ashby",
        "name": "Ashby",
        "status": "candidate_submit_engine",
        "apply": "أكواد إرسال مرشحة في GitHub، غير مدمجة أو مختبرة في التطبيق."
      },
      {
        "id": "lever",
        "name": "Lever",
        "status": "candidate_submit_engine",
        "apply": "بعض النماذج تتطلب تحققًا بشريًا؛ غير مدمج أو مختبر."
      },
      {
        "id": "smartrecruiters",
        "name": "SmartRecruiters",
        "status": "needs_evaluation",
        "apply": "قناة مرشحة لفحص تسجيل الدخول وإرسال الطلبات."
      }
    ]
  },
  {
    "id": "fallback",
    "name": "قنوات احتياطية",
    "items": [
      {
        "id": "official-recruiting-email",
        "name": "بريد التوظيف المعلن رسميًا",
        "status": "optional_fallback",
        "apply": "يستخدم فقط إذا طلبت الجهة التقديم عبر البريد؛ ليس بديلًا لتقديم البوابة."
      }
    ]
  }
];
