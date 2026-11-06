"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listPendingWithdrawalsAction,
  markWithdrawalProcessedAction,
  type WithdrawalRequestRow,
} from "@/app/actions/admin-withdrawals";

const ADMIN_PASSWORD = "twinforge2026";

export default function AdminWithdrawalsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [requests, setRequests] = useState<WithdrawalRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const getAdminKey = () =>
    sessionStorage.getItem("admin_activate_key") || password || ADMIN_PASSWORD;

  const loadRequests = useCallback(async (key?: string) => {
    setLoading(true);
    setStatus("");
    try {
      const adminKey = key || getAdminKey();
      const pending = await listPendingWithdrawalsAction(adminKey);
      setRequests(pending);
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPassword = async () => {
    if (password !== ADMIN_PASSWORD) {
      setStatus("كلمة المرور غير صحيحة");
      return;
    }
    setAuthenticated(true);
    sessionStorage.setItem("admin_auth", "true");
    sessionStorage.setItem("admin_activate_key", password);
    await loadRequests(password);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") {
      setAuthenticated(true);
      void loadRequests();
    }
  }, [loadRequests]);

  const markProcessed = async (id: string) => {
    const row = requests.find((r) => r.id === id);
    if (!row) return;

    try {
      await markWithdrawalProcessedAction({
        adminKey: getAdminKey(),
        id,
        newValues: row.new_values,
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "فشل التحديث");
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
            onKeyDown={(e) => e.key === "Enter" && void checkPassword()}
          />
          <button
            type="button"
            onClick={() => void checkPassword()}
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
    <div className="tf-container w-full space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
          طلبات السحب
        </h1>
        <button
          type="button"
          onClick={() => void loadRequests()}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:border-accent"
        >
          تحديث
        </button>
      </div>

      {status ? <p className="text-sm text-danger">{status}</p> : null}

      {loading ? (
        <p className="text-slate-300">جاري التحميل...</p>
      ) : requests.length === 0 ? (
        <p className="text-slate-300">لا توجد طلبات معلقة</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="tf-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {Number(req.new_values.amount)} Earned Gems
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {req.new_values.wise_email}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {new Date(req.created_at).toLocaleString("ar")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void markProcessed(req.id)}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg"
                >
                  تم التحويل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
