import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="tf-container w-full space-y-8">
      <h1 className="text-3xl font-bold text-amber-400">الشروط والأحكام</h1>

      <div className="space-y-4 text-sm text-zinc-400">
        <section>
          <h2 className="mb-2 font-semibold text-white">1. القبول</h2>
          <p>باستخدامك لمنصة TwinForge، فإنك توافق على هذه الشروط والأحكام.</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">2. الحساب</h2>
          <p>
            أنت مسؤول عن الحفاظ على سرية بيانات حسابك. أي نشاط يتم من خلال حسابك
            يقع تحت مسؤوليتك.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">3. الاشتراكات والمدفوعات</h2>
          <p>
            الاشتراكات تُدفع عبر Wise. التفعيل يتم يدوياً بعد استلام الدفعة. لا
            يوجد استرداد بعد التفعيل إلا في حالات استثنائية.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">4. الأرباح والسحب</h2>
          <p>
            Earned Gems هي أرباح قابلة للسحب بعد فترة تبريد. الحد الأدنى للسحب
            10 Gems. المعالجة تتم خلال 24-48 ساعة.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">5. المهام والموافقات</h2>
          <p>
            بعض المهام تتطلب موافقتك قبل التنفيذ. أنت مسؤول عن مراجعة المهام
            الحساسة قبل الموافقة عليها.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">6. حدود الاستدلال</h2>
          <p>
            كل باقة لها حد يومي للاستدلال. تجاوز الحد يمنع تنفيذ مهام إضافية حتى
            اليوم التالي.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">7. إخلاء المسؤولية</h2>
          <p>
            المنصة تقدم خدمات &quot;كما هي&quot;. لا نضمن نتائج محددة من المهام
            المنفذة بواسطة التوأم الرقمي.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">8. التعديلات</h2>
          <p>
            نحتفظ بحق تعديل هذه الشروط في أي وقت. استمرارك في استخدام المنصة يعني
            قبولك للتعديلات.
          </p>
        </section>
      </div>

      <p className="text-xs text-zinc-600">آخر تحديث: نوفمبر 2026</p>

      <Link
        href="/"
        className="inline-block rounded-lg bg-zinc-800 px-5 py-2 text-sm hover:bg-zinc-700"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
