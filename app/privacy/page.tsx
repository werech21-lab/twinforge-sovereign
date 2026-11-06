import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="tf-container w-full space-y-8">
      <h1 className="text-3xl font-bold text-amber-400">سياسة الخصوصية</h1>

      <div className="space-y-4 text-sm text-zinc-400">
        <section>
          <h2 className="mb-2 font-semibold text-white">1. البيانات التي نجمعها</h2>
          <p>
            نجمع بيانات الحساب (البريد والاسم)، بيانات التوأم والذكريات، وسجلات
            المعاملات المالية اللازمة لتشغيل المنصة.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">2. كيف نستخدم البيانات</h2>
          <p>
            تُستخدم البيانات لتشغيل التوائم الرقمية، توليد التقارير، التسوية
            المحاسبية، وتحسين تجربة المالك. لا نبيع بياناتك الشخصية.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">3. الأمان</h2>
          <p>
            تُشفَّر الجلسات وتُحمى قواعد البيانات عبر سياسات RLS في Supabase.
            الوصول الإداري إلى الخزينة محمي بمفتاح مشرف.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">4. الاحتفاظ والحذف</h2>
          <p>
            يمكنك طلب حذف حسابك وبيانات التوأم المرتبطة. قد تُحتفظ بسجلات دفتر
            الأستاذ لأغراض الامتثال المحاسبي.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-white">5. التواصل</h2>
          <p>
            للاستفسارات حول الخصوصية تواصل عبر صفحة{" "}
            <Link href="/contact" className="text-amber-400 hover:underline">
              اتصل بنا
            </Link>
            .
          </p>
        </section>
      </div>

      <Link href="/" className="text-amber-400 hover:underline">
        ← العودة للرئيسية
      </Link>
    </div>
  );
}
