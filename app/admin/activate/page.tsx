"use client";

import { useEffect, useState } from "react";
import { activateSubscriptionAction } from "@/app/actions/subscriptions";

// كلمة المرور البسيطة (غيّرها) — للواجهة فقط؛ التفعيل الحقيقي يتحقق من ADMIN_ACTIVATE_KEY في الخادم
const ADMIN_PASSWORD = "twinforge2026";

export default function ActivateSubscriptionPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [planName, setPlanName] = useState("pro");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") setAuthenticated(true);
  }, []);

  const checkPassword = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      sessionStorage.setItem("admin_activate_key", password);
      setStatus("");
    } else {
      setStatus("كلمة المرور غير صحيحة");
    }
  };

  const activate = async () => {
    if (!email.trim()) {
      setStatus("أدخل البريد الإلكتروني");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const adminKey =
        sessionStorage.getItem("admin_activate_key") || password || ADMIN_PASSWORD;

      await activateSubscriptionAction({
        email,
        planName,
        adminKey,
      });

      setStatus("تم تفعيل الاشتراك بنجاح");
      setEmail("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل التفعيل";
      setStatus("خطأ: " + message);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm space-y-4 tf-card p-5">
          <h1 className="text-center font-[family-name:var(--font-display)] text-xl font-bold text-accent">
            دخول المشرف
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
            onKeyDown={(e) => e.key === "Enter" && checkPassword()}
          />
          <button
            type="button"
            onClick={checkPassword}
            className="w-full rounded-xl bg-accent py-3 font-medium text-bg"
          >
            دخول
          </button>
          {status ? (
            <p className="text-center text-sm text-danger">{status}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
        تفعيل اشتراك
      </h1>
      <p className="text-sm text-slate-300">
        استخدم هذه الصفحة بعد استلام دفعة Wise لتفعيل الاشتراك يدوياً.
      </p>

      <div className="space-y-4 tf-card p-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">الباقة</label>
          <select
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
          >
            <option value="starter">باقة البداية</option>
            <option value="pro">باقة المحترفين</option>
            <option value="vip">باقة النخبة</option>
            <option value="syndicate">باقة الشركات</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={activate}
        disabled={loading || !email.trim()}
        className="w-full rounded-xl bg-accent py-3 font-medium text-bg disabled:opacity-50"
      >
        {loading ? "جاري التفعيل..." : "تفعيل الاشتراك"}
      </button>

      {status ? <p className="text-center text-sm text-slate-300">{status}</p> : null}
    </div>
  );
}
