import Link from "next/link";

const changes = [
  {
    version: "2.0",
    date: "نوفمبر 2026",
    items: [
      "إطلاق النسخة المعدلة (MVP)",
      "دفتر أستاذ غير قابل للتعديل",
      "نظام العملتين (ForgeGold / Earned Gems)",
      "سوق الخدمات الليلي",
      "موافقات المالك (Human-in-the-Loop)",
      "العقارات الافتراضية واستعادة الطاقة",
      "حد الاستدلال اليومي حسب الباقة",
      "طلب سحب الأرباح عبر Wise",
      "تقرير الصباح التلقائي",
    ],
  },
  {
    version: "1.0",
    date: "أكتوبر 2026",
    items: ["التصميم الأولي للمشروع", "وثيقة الدستور التأسيسي"],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="tf-container w-full space-y-8">
        <h1 className="text-3xl font-bold text-amber-400">سجل التغييرات</h1>

        <div className="space-y-6">
          {changes.map((change) => (
            <div
              key={change.version}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  الإصدار {change.version}
                </h2>
                <span className="text-sm text-zinc-500">{change.date}</span>
              </div>
              <ul className="space-y-1 text-sm text-zinc-400">
                {change.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="inline-block rounded-lg bg-zinc-800 px-5 py-2 text-sm hover:bg-zinc-700"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
