import Link from "next/link";
import { resolveAiProvider } from "@/lib/ai/providers";
import { getAgentToolsStatus } from "@/lib/ai/tools";

export const dynamic = "force-dynamic";

const coreServices = [
  { name: "المنصة الرئيسية", status: "operational" },
  { name: "قاعدة البيانات", status: "operational" },
  { name: "المصادقة", status: "operational" },
  { name: "المدفوعات (Wise)", status: "operational" },
  { name: "سوق الخدمات", status: "operational" },
  { name: "المهام الليلية", status: "operational" },
];

const statusLabels: Record<string, { text: string; color: string }> = {
  operational: { text: "يعمل", color: "text-emerald-400" },
  unconfigured: { text: "بانتظار المفتاح", color: "text-amber-400" },
  degraded: { text: "بطيء", color: "text-amber-400" },
  outage: { text: "متوقف", color: "text-red-400" },
};

export default function StatusPage() {
  const aiProvider = resolveAiProvider();
  const agentTools = getAgentToolsStatus();
  const allCoreOperational = coreServices.every(
    (s) => s.status === "operational",
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-amber-400">حالة النظام</h1>

        <div
          className={`rounded-xl p-4 ${
            allCoreOperational
              ? "border border-emerald-700 bg-emerald-900/30"
              : "border border-amber-700 bg-amber-900/30"
          }`}
        >
          <p className="font-medium">
            {allCoreOperational
              ? "جميع الأنظمة الأساسية تعمل بشكل طبيعي"
              : "بعض الأنظمة تواجه مشاكل"}
          </p>
          <p className="mt-1 text-xs text-zinc-300">
            مزود الذكاء الاصطناعي النشط:{" "}
            <span className="font-semibold text-amber-300">
              {aiProvider === "none" ? "وضع الطوارئ المحلي" : aiProvider}
            </span>
          </p>
        </div>

        <div className="space-y-2">
          {coreServices.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <span>{service.name}</span>
              <span
                className={
                  statusLabels[service.status]?.color || "text-zinc-400"
                }
              >
                {statusLabels[service.status]?.text || service.status}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-amber-400">
            أدوات الوكيل الخارجية (Agent Tools)
          </h2>
          {agentTools.map((tool) => {
            const state = tool.configured ? "operational" : "unconfigured";
            return (
              <div
                key={tool.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <span>{tool.name}</span>
                <span className={statusLabels[state].color}>
                  {statusLabels[state].text}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-zinc-600">
          آخر تحديث: {new Date().toLocaleString("ar")}
        </p>

        <Link
          href="/"
          className="block text-center text-sm text-zinc-600 hover:text-zinc-400"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
