"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestWithdrawalAction } from "@/app/actions/withdraw";
import Loading from "@/components/Loading";
import { useLanguage } from "@/components/LanguageProvider";

interface Account {
  id: string;
  balance: number;
}

export default function WithdrawPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState("");
  const [wiseEmail, setWiseEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();

  const loadAccount = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/withdraw");
      return;
    }

    const { data: twin } = await supabase
      .from("twins")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!twin) {
      setPageLoading(false);
      return;
    }

    const { data } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("twin_id", twin.id)
      .eq("currency", "earned_gems")
      .maybeSingle();

    setAccount((data as Account | null) ?? null);
    setPageLoading(false);
  }, [router]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const requestWithdrawal = async () => {
    if (!account) return;

    setLoading(true);
    setStatus("");

    try {
      await requestWithdrawalAction({
        amount: parseFloat(amount),
        wiseEmail,
      });
      setStatus("تم إرسال طلب السحب. سيتم معالجته خلال 24-48 ساعة.");
      setAmount("");
      setWiseEmail("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل الطلب";
      setStatus("خطأ: " + message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <Loading />;
  }

  return (
    <div className="tf-container w-full max-w-none space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
          {t("withdraw.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-300">{t("withdraw.subtitle")}</p>
      </div>

      {!account ? (
        <p className="text-slate-300">{t("common.error")}</p>
      ) : (
        <>
          <div className="tf-card p-4">
            <p className="text-sm text-slate-300">{t("withdraw.available")}</p>
            <p className="text-3xl font-bold tabular-nums text-accent">
              {Number(account.balance).toFixed(2)}
            </p>
            <p className="text-xs text-slate-300">Earned Gems</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                {t("withdraw.amount")}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">
                {t("withdraw.wise")}
              </label>
              <input
                type="email"
                value={wiseEmail}
                onChange={(e) => setWiseEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-white/15 bg-bg px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={requestWithdrawal}
            disabled={loading || !amount || !wiseEmail}
            className="w-full rounded-xl bg-accent py-3 font-medium text-bg disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("withdraw.submit")}
          </button>

          <p className="text-center text-xs text-slate-300">
            فترة التبريد: 24-48 ساعة. الحد الأدنى للسحب: 10 Gems.
          </p>
        </>
      )}

      {status ? <p className="text-center text-sm text-slate-300">{status}</p> : null}
    </div>
  );
}
