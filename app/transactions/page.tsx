"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Loading from "@/components/Loading";

interface LedgerEntry {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  reference_type: string | null;
  created_at: string;
  debit_account_id: string;
  credit_account_id: string;
}

export default function TransactionsPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadEntries = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/transactions");
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

    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("twin_id", twin.id);

    if (!accounts || accounts.length === 0) {
      setAccountIds([]);
      setEntries([]);
      setLoading(false);
      return;
    }

    const ids = accounts.map((a) => a.id);
    setAccountIds(ids);

    const { data } = await supabase
      .from("ledger_entries")
      .select("*")
      .or(
        `debit_account_id.in.(${ids.join(",")}),credit_account_id.in.(${ids.join(",")})`,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    setEntries((data as LedgerEntry[]) || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const isIncoming = (entry: LedgerEntry) =>
    accountIds.includes(entry.credit_account_id);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="tf-container w-full space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
        سجل المعاملات
      </h1>

      {entries.length === 0 ? (
        <p className="text-slate-300">لا توجد معاملات بعد</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const incoming = isIncoming(entry);
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 tf-card p-4"
              >
                <div>
                  <p className="font-medium">
                    {entry.description || entry.reference_type || "تحويل"}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {new Date(entry.created_at).toLocaleString("ar")}
                  </p>
                  <span className="text-xs text-slate-300">{entry.currency}</span>
                </div>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    incoming ? "text-accent" : "text-danger"
                  }`}
                >
                  {incoming ? "+" : "-"}
                  {Number(entry.amount)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
