"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/PasswordField";
import { useLanguage } from "@/components/LanguageProvider";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"direct" | "email">("direct");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);

  const sendEmailLink = async () => {
    if (!email.trim()) {
      setOk(false);
      setStatus(t("auth.needEmail"));
      return;
    }
    setLoading(true);
    setStatus("");
    setOk(false);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${origin}/reset-password` },
      );
      if (error) throw error;
      setOk(true);
      setStatus(t("auth.resetEmailSent"));
    } catch (err: unknown) {
      setOk(false);
      setStatus(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const directReset = async () => {
    if (!email.trim() || !newPassword.trim()) {
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
        body: JSON.stringify({
          email: email.trim(),
          newPassword,
        }),
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
          <p className="text-sm font-bold tracking-[0.25em] text-emerald-400">
            RECOVERY
          </p>
          <h1 className="tf-title-gold mt-2 text-4xl font-extrabold">
            {t("auth.forgotTitle")}
          </h1>
          <p className="mt-2 text-base font-medium text-slate-300">
            {t("auth.forgotSub")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("direct")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              mode === "direct"
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-slate-300"
            }`}
          >
            {t("auth.directReset")}
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              mode === "email"
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-slate-300"
            }`}
          >
            {t("auth.emailReset")}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-base font-semibold text-white">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="tf-input"
              autoComplete="email"
            />
          </div>

          {mode === "direct" ? (
            <PasswordField
              id="new-password"
              label={t("auth.newPassword")}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              onEnter={() => void directReset()}
            />
          ) : null}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            void (mode === "direct" ? directReset() : sendEmailLink())
          }
          className="tf-btn-gold w-full py-4 text-lg disabled:opacity-50"
        >
          {loading
            ? t("common.loading")
            : mode === "direct"
              ? t("auth.updatePasswordNow")
              : t("auth.sendResetLink")}
        </button>

        {status ? (
          <p
            className={`rounded-xl border px-4 py-3 text-center text-base font-semibold ${
              ok
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {status}
          </p>
        ) : null}

        <p className="text-center">
          <Link
            href="/login"
            className="text-base font-bold text-amber-300 hover:underline"
          >
            {t("auth.backLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
