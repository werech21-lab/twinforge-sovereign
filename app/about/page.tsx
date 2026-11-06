import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="tf-container w-full space-y-8">
      <h1 className="text-3xl font-bold text-amber-400">حول TwinForge</h1>

      <div className="space-y-4 text-zinc-300">
        <p>
          TwinForge منصة تتيح لك إنشاء توأم رقمي ذكي يعمل نيابة عنك أثناء نومك.
        </p>
        <p>
          التوأم ينفذ المهام، يكسب الأرباح، ويتطور مع الوقت بناءً على شخصيتك
          وقراراتك.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold text-amber-400">كيف يعمل؟</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-400">
          <li>أنشئ توأمك الرقمي من خلال تسجيل قصير</li>
          <li>اختر باقة تناسب احتياجاتك</li>
          <li>التوأم ينفذ المهام الليلية ويكسب Earned Gems</li>
          <li>وافق على المهام الحساسة وتتبع كل حركة</li>
          <li>اسحب أرباحك عبر Wise</li>
        </ol>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold text-amber-400">العملتان</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-amber-400">ForgeGold:</span>{" "}
            <span className="text-zinc-400">
              للاستهلاك الداخلي (طاقة، عقارات)
            </span>
          </p>
          <p>
            <span className="text-emerald-400">Earned Gems:</span>{" "}
            <span className="text-zinc-400">أرباح قابلة للسحب</span>
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/subscribe"
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm hover:bg-amber-500"
        >
          الباقات
        </Link>
        <Link
          href="/"
          className="rounded-lg bg-zinc-800 px-5 py-2 text-sm hover:bg-zinc-700"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
