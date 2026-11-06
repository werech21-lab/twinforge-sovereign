"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  openSovereignAuditPdf,
  openSovereignDashboardPdf,
  type SovereignAuditReportInput,
} from "@/lib/sovereign-pdf";

type DashboardModeProps = {
  mode: "dashboard";
  twin: {
    id: string;
    name: string;
    status: string;
    energy: number;
    mood: number;
    reputation: number;
    personality_summary?: string | null;
  };
  dailyLimitUsd: number;
  remainingUsd: number;
  morningReport: string | null;
  memories: Array<{
    id: string;
    content: string;
    memory_type: string;
    created_at: string;
  }>;
};

type AuditModeProps = {
  mode: "audit";
  auditData: SovereignAuditReportInput | null;
};

type Props = DashboardModeProps | AuditModeProps;

export default function SovereignReportButton(props: Props) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (props.mode === "audit") {
      if (!props.auditData) return;
      openSovereignAuditPdf(props.auditData);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const twinId = props.twin.id;

      const [
        { data: accounts },
        { data: allDecisions },
        { data: marketTasks },
      ] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, currency, balance")
          .eq("twin_id", twinId),
        supabase
          .from("twin_decisions")
          .select(
            "id, title, situation, chosen_option, recommended, status, created_at",
          )
          .eq("twin_id", twinId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("marketplace_tasks")
          .select(
            "id, title, reward_gems, expected_success_rate, status, created_at",
          )
          .eq("twin_id", twinId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const forgeGold = Number(
        accounts?.find((a) => a.currency === "forge_gold")?.balance ?? 0,
      );
      const earnedGems = Number(
        accounts?.find((a) => a.currency === "earned_gems")?.balance ?? 0,
      );

      const accountIds = (accounts || []).map((a) => a.id);
      let ledgerRows: Array<{
        id: string;
        amount: number;
        currency: string;
        description: string | null;
        reference_type: string | null;
        created_at: string;
      }> = [];

      if (accountIds.length > 0) {
        const orFilter = accountIds
          .map((id) => `debit_account_id.eq.${id},credit_account_id.eq.${id}`)
          .join(",");
        const { data: entries } = await supabase
          .from("ledger_entries")
          .select(
            "id, amount, currency, description, reference_type, created_at",
          )
          .or(orFilter)
          .order("created_at", { ascending: false })
          .limit(15);
        ledgerRows = (entries || []).map((e) => ({
          id: String(e.id),
          amount: Number(e.amount || 0),
          currency: String(e.currency || ""),
          description: (e.description as string | null) ?? null,
          reference_type: (e.reference_type as string | null) ?? null,
          created_at: String(e.created_at || ""),
        }));
      }

      openSovereignDashboardPdf({
        twin: props.twin,
        dailyLimitUsd: props.dailyLimitUsd,
        remainingUsd: props.remainingUsd,
        forgeGold,
        earnedGems,
        morningReport: props.morningReport,
        decisions: (allDecisions || []) as Array<{
          id: string;
          title: string;
          situation: string;
          chosen_option?: string | null;
          recommended?: string | null;
          status: string;
          created_at?: string;
        }>,
        memories: props.memories,
        ledger: ledgerRows,
        marketplaceTasks: (marketTasks || []) as Array<{
          id: string;
          title: string;
          reward_gems: number;
          expected_success_rate: number;
          status: string;
          created_at?: string;
        }>,
      });
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || (props.mode === "audit" && !props.auditData);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void handleExport()}
      className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f3d97d] px-4 py-2 text-sm font-extrabold text-[#161105] shadow-[0_0_24px_rgba(212,175,55,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>{busy ? "⏳ جاري تجهيز الوثيقة..." : "📄 تصدير التقرير السيادي (PDF)"}</span>
    </button>
  );
}
