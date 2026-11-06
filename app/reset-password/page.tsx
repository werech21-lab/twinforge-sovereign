"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/PasswordField";
import { useLanguage } from "@/components/LanguageProvider";

/** Email-link recovery landing — also offers direct API reset. */
export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);

  const updateFromSession = async () => {
    if (!password.trim()) {
      setOk(false);
      setStatus(t("auth.needPassword"));
      return;
    }
    setLoading(true);
    setStatus("");
    setOk(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk(true);
      setStatus(t("auth.resetOk"));
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: unknown) {
      setOk(false);
      setStatus(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const directReset = async () => {
    if (!email.trim() || !password.trim()) {
      setOk(false);
      setStatus(t("auth.needCredentials"));
      return;
    }
    setLoading(true);
    setStatus("");
    setOk(false);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), newPassword: password }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || t("auth.resetFail"));
      setOk(true);
      setStatus(json.message || t("auth.resetOk"));
    } catch (err: unknown) {
      setOk(false);
      setStatus(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-10">
      <div className="tf-card tf-card-gold w-full max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="tf-title-gold text-4xl font-extrabold">
            {t("auth.resetTitle")}
          </h1>
          <p className="mt-2 text-base text-slate-300">{t("auth.resetSub")}</p>
        </div>

        <div>
          <label className="mb-2 block text-base font-semibold text-white">
            {t("auth.email")} ({t("auth.optionalSession")})
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="tf-input"
            placeholder="you@example.com"
          />
        </div>

        <PasswordField
          id="reset-password"
          label={t("auth.newPassword")}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void updateFromSession()}
            className="tf-btn-ghost w-full py-3 disabled:opacity-50"
          >
            {t("auth.updateFromLink")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void directReset()}
            className="tf-btn-gold w-full py-3 disabled:opacity-50"
          >
            {t("auth.updatePasswordNow")}
          </button>
        </div>

        {status ? (
          <p
            className={`rounded-xl border px-4 py-3 text-center text-base font-semibold ${
              ok
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-400/30 text-amber-200"
            }`}
          >
            {status}
          </p>
        ) : null}

        <p className="text-center">
          <Link href="/login" className="font-bold text-amber-300 hover:underline">
            {t("auth.backLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
