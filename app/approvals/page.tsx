"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { respondToApprovalAction } from "@/app/actions/approvals";
import Loading from "@/components/Loading";
import { useLanguage } from "@/components/LanguageProvider";

interface Approval {
  id: string;
  twin_id: string;
  approval_type: string;
  status: string;
  details: Record<string, unknown>;
  requested_at: string;
  response_note: string | null;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t, locale } = useLanguage();
  const typeLabels: Record<string, string> = {
    task_execution: t("approvals.type.task"),
    high_value_transfer: t("approvals.type.transfer"),
    contract: t("approvals.type.contract"),
    delivery_acceptance: t("approvals.type.delivery"),
  };

  const loadApprovals = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/approvals");
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
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("owner_approvals")
      .select("*")
      .eq("twin_id", twin.id)
      .order("requested_at", { ascending: false })
      .limit(30);

    setApprovals((data as Approval[]) || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  const respond = async (
    id: string,
    status: "approved" | "rejected",
    note?: string,
  ) => {
    setError(null);
    try {
      await respondToApprovalAction(id, status, note);
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status, response_note: note || null } : a,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحديث الموافقة");
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="tf-container w-full space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
          {t("approvals.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-300">{t("approvals.subtitle")}</p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {approvals.length === 0 ? (
        <p className="text-slate-300">{t("approvals.empty")}</p>
      ) : (
        <div className="space-y-3">
          {approvals.map((item) => (
            <div
              key={item.id}
              className="tf-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {typeLabels[item.approval_type] || item.approval_type}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {new Date(item.requested_at).toLocaleString(locale)}
                  </p>
                  {item.details && Object.keys(item.details).length > 0 ? (
                    <pre className="mt-2 rounded-lg border border-white/15 bg-bg p-2 text-xs text-slate-300">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    item.status === "approved"
                      ? "bg-accent/20 text-accent"
                      : item.status === "rejected"
                        ? "bg-danger/20 text-danger"
                        : "bg-warn/20 text-warn"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              {item.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(item.id, "approved")}
                    className="flex-1 rounded-xl bg-accent py-2 text-sm font-medium text-bg"
                  >
                    {t("approvals.approve")}
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(item.id, "rejected")}
                    className="flex-1 rounded-xl bg-danger/80 py-2 text-sm font-medium text-fg"
                  >
                    {t("approvals.reject")}
                  </button>
                </div>
              ) : null}

              {item.response_note ? (
                <p className="mt-2 text-xs text-slate-300">
                  ملاحظة: {item.response_note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
