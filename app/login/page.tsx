"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/PasswordField";
import { useLanguage } from "@/components/LanguageProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get("ref")?.trim();
    const wantSignup = params.get("signup") === "1";

    let activeRef = urlRef || "";
    if (urlRef) {
      try {
        localStorage.setItem("tf_ref", urlRef);
        document.cookie = `tf_ref=${encodeURIComponent(urlRef)}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {
        // Ignore storage errors
      }
    } else {
      try {
        activeRef = localStorage.getItem("tf_ref") || "";
      } catch {
        activeRef = "";
      }
    }

    if (wantSignup || urlRef) {
      setIsSignUp(true);
    }

    if (activeRef) {
      setReferralCode(activeRef);
      void (async () => {
        try {
          const res = await fetch(
            `/api/referral?validate=${encodeURIComponent(activeRef)}`,
          );
          const json = (await res.json()) as {
            valid?: boolean;
            referrerName?: string;
          };
          if (json.valid && json.referrerName) {
            setReferrerName(json.referrerName);
          }
        } catch {
          // Ignore lookup error
        }
      })();
    }
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setOk(false);
      setStatus(t("auth.needCredentials"));
      return;
    }

    setLoading(true);
    setStatus("");
    setOk(false);

    try {
      const supabase = createClient();

      if (isSignUp) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            referralCode: referralCode.trim() || undefined,
          }),
        });
        const json = (await res.json()) as {
          error?: string;
          ok?: boolean;
          referralRewarded?: boolean;
        };
        if (!res.ok) throw new Error(json.error || t("auth.registerFail"));

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (json.referralRewarded) {
          try {
            localStorage.removeItem("tf_ref");
          } catch {
            // Ignore
          }
          setStatus(
            "🎉 تم التسجيل بنجاح وإيداع +500 ForgeGold و +10 طاقة في محفظة توأمك!",
          );
        } else {
          setStatus(t("auth.registerOk"));
        }
        setOk(true);
        router.push("/twin/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push("/twin/dashboard");
        router.refresh();
      }
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
            SECURE ACCESS
          </p>
          <h1 className="tf-title-gold mt-2 text-4xl font-extrabold">
            {isSignUp ? t("auth.signupTitle") : t("auth.loginTitle")}
          </h1>
          <p className="mt-2 text-base font-medium text-slate-300">
            {t("auth.subtitle")}
          </p>
        </div>

        {referralCode ? (
          <div className="rounded-2xl border border-amber-400/45 bg-gradient-to-l from-amber-500/15 via-emerald-500/10 to-[#0d1522] p-4 text-center shadow-lg">
            <p className="text-sm font-extrabold text-amber-300">
              🎁 دعوة ملكية مفعّلة{" "}
              {referrerName ? `من «${referrerName}»` : `(${referralCode})`}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">
              عند إتمام التسجيل ستحصل أنت والداعي تلقائياً على +500 ForgeGold و
              +10 ⚡ طاقة لتوأمك الرقمي!
            </p>
          </div>
        ) : null}

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

          <PasswordField
            id="login-password"
            label={t("auth.password")}
            value={password}
            onChange={setPassword}
            onEnter={() => void handleSubmit()}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />

          {isSignUp ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                كود الدعوة (اختياري — يكسبك +500 ForgeGold فورية)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="مثال: founder"
                className="tf-input text-sm"
              />
            </div>
          ) : null}

          {!isSignUp ? (
            <div className="text-end">
              <Link
                href="/forgot-password"
                className="text-sm font-bold text-amber-300 hover:underline"
              >
                {t("auth.forgot")}
              </Link>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="tf-btn-gold w-full py-4 text-lg disabled:opacity-50"
        >
          {loading
            ? t("common.loading")
            : isSignUp
              ? t("auth.signupCta")
              : t("auth.loginCta")}
        </button>

        {status ? (
          <p
            className={`text-center text-base font-medium ${
              ok ? "text-emerald-400" : "text-amber-300"
            }`}
          >
            {status}
          </p>
        ) : null}

        <p className="text-center text-base font-medium text-slate-300">
          {isSignUp ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setStatus("");
              setOk(false);
            }}
            className="font-bold text-amber-300 hover:underline"
          >
            {isSignUp ? t("auth.loginTitle") : t("auth.signupTitle")}
          </button>
        </p>

        <p className="text-center">
          <Link
            href="/"
            className="text-base font-semibold text-slate-300 hover:text-white"
          >
            {t("auth.backHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
