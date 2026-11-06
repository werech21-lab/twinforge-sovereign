import Link from "next/link";

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="tf-container w-full space-y-8">
        <h1 className="text-3xl font-bold text-amber-400">للمطورين</h1>

        <p className="text-zinc-400">
          TwinForge مبني على Next.js و Supabase. هذه نظرة سريعة على البنية.
        </p>

        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold text-amber-400">المكدس التقني</h2>
          <ul className="space-y-1 text-sm text-zinc-400">
            <li>• Next.js (App Router)</li>
            <li>• Supabase (PostgreSQL + Auth + RLS)</li>
            <li>• pgvector (ذاكرة التوأم)</li>
            <li>• Tailwind CSS</li>
          </ul>
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold text-amber-400">الجداول الرئيسية</h2>
          <ul className="space-y-1 text-sm text-zinc-400">
            <li>
              • <code className="text-amber-300">twins</code> — بيانات التوأم
            </li>
            <li>
              • <code className="text-amber-300">accounts</code> — الحسابات
              المالية
            </li>
            <li>
              • <code className="text-amber-300">ledger_entries</code> — دفتر
              الأستاذ
            </li>
            <li>
              • <code className="text-amber-300">night_tasks</code> — المهام
              الليلية
            </li>
            <li>
              • <code className="text-amber-300">subscriptions</code> —
              الاشتراكات
            </li>
            <li>
              • <code className="text-amber-300">owner_approvals</code> —
              الموافقات
            </li>
          </ul>
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold text-amber-400">الدوال الرئيسية</h2>
          <ul className="space-y-1 text-sm text-zinc-400">
            <li>
              • <code className="text-amber-300">transfer_funds()</code> — تحويل
              ذري
            </li>
            <li>
              • <code className="text-amber-300">applyEnergyRecovery()</code> —
              استعادة الطاقة
            </li>
            <li>
              • <code className="text-amber-300">deductPropertyCost()</code> —
              خصم تكلفة العقار
            </li>
            <li>
              • <code className="text-amber-300">checkInferenceBudget()</code> —
              فحص حد الاستدلال
            </li>
          </ul>
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold text-amber-400">الأمان</h2>
          <ul className="space-y-1 text-sm text-zinc-400">
            <li>• Row-Level Security على كل الجداول</li>
            <li>• دفتر الأستاذ غير قابل للتعديل</li>
            <li>• Middleware لحماية الصفحات</li>
            <li>• سجل تدقيق غير قابل للتعديل</li>
          </ul>
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
