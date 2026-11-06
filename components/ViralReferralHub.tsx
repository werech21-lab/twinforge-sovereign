"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ReferralStats = {
  invitesCount: number;
  totalGoldEarned: number;
  totalEnergyEarned: number;
  wasReferred: boolean;
};

type Props = {
  mode?: "dashboard" | "public";
  twinId: string;
  twinName: string;
  initialReferralCode?: string;
  reputation?: number;
};

export default function ViralReferralHub({
  mode = "dashboard",
  twinId,
  twinName,
  initialReferralCode,
  reputation = 5.0,
}: Props) {
  const [origin, setOrigin] = useState("https://twinforge-indol.vercel.app");
  const [referralCode, setReferralCode] = useState(
    initialReferralCode || "founder",
  );
  const [stats, setStats] = useState<ReferralStats>({
    invitesCount: 0,
    totalGoldEarned: 0,
    totalEnergyEarned: 0,
    wasReferred: false,
  });
  const [copiedType, setCopiedType] = useState<"invite" | "card" | null>(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [slugMsg, setSlugMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const loadReferralInfo = useCallback(async () => {
    if (mode !== "dashboard") return;
    try {
      const res = await fetch("/api/referral");
      const json = (await res.json()) as {
        ok?: boolean;
        referralCode?: string;
        stats?: ReferralStats;
      };
      if (res.ok && json.ok) {
        if (json.referralCode) {
          setReferralCode(json.referralCode);
          setCustomSlug(json.referralCode);
        }
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch {
      // Graceful fallback
    }
  }, [mode]);

  useEffect(() => {
    void loadReferralInfo();
  }, [loadReferralInfo]);

  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
    }
  }, [initialReferralCode]);

  const inviteUrl = `${origin}/login?signup=1&ref=${encodeURIComponent(referralCode)}`;
  const twinCardUrl = `${origin}/u/${encodeURIComponent(twinId)}?ref=${encodeURIComponent(referralCode)}`;
  const shareTargetUrl = mode === "public" ? twinCardUrl : inviteUrl;

  const marketingCopy = `⚡ تعرّف على التوأم الرقمي «${twinName}» (السمعة ★${Number(reputation).toFixed(1)}) على منصة TwinForge السيادية! يعمل بالذكاء الاصطناعي ويكسب ليلاً أثناء نوم مالكه.\n🎁 سجّل الآن عبر رابط الدعوة واحصل فوراً على +500 ForgeGold و +10 طاقة مجاناً:`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${marketingCopy}\n${shareTargetUrl}`)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(shareTargetUrl)}&text=${encodeURIComponent(marketingCopy)}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(marketingCopy)}&url=${encodeURIComponent(shareTargetUrl)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareTargetUrl)}`;

  const copyText = async (text: string, kind: "invite" | "card") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(kind);
      setTimeout(() => setCopiedType(null), 2600);
    } catch {
      // Fallback
    }
  };

  const saveCustomSlug = async () => {
    setSlugMsg(null);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customCode: customSlug }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        referralCode?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.referralCode) {
        setSlugMsg(json.error || "تعذر حفظ الكود");
        return;
      }
      setReferralCode(json.referralCode);
      setEditingSlug(false);
      setSlugMsg("✓ تم تحديث رابط الدعوة المخصص بنجاح");
    } catch {
      setSlugMsg("تعذر تحديث الكود حالياً");
    }
  };

  if (mode === "public") {
    return (
      <section className="rounded-3xl border border-amber-400/35 bg-gradient-to-br from-[#0e1626] via-[#0a101b] to-[#131107] p-6 shadow-[0_0_45px_rgba(212,175,55,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-400">
              ONE-CLICK VIRAL SHARE
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-amber-300">
              🚀 شارك بطاقة التوأم واكسب +500 ForgeGold
            </h2>
          </div>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-200">
            كود الإحالة: ?ref={referralCode}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-3 text-xs font-extrabold text-emerald-200 transition hover:bg-emerald-500/25 sm:text-sm"
          >
            <span>💬</span> WhatsApp
          </a>
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-3 text-xs font-extrabold text-sky-200 transition hover:bg-sky-500/25 sm:text-sm"
          >
            <span>✈️</span> Telegram
          </a>
          <a
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-xs font-extrabold text-white transition hover:bg-white/20 sm:text-sm"
          >
            <span>𝕏</span> X (Twitter)
          </a>
          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/15 px-3 py-3 text-xs font-extrabold text-blue-200 transition hover:bg-blue-500/25 sm:text-sm"
          >
            <span>💼</span> LinkedIn
          </a>
          <button
            type="button"
            onClick={() =>
              void copyText(`${marketingCopy}\n${twinCardUrl}`, "card")
            }
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f5d061] px-3 py-3 text-xs font-extrabold text-[#161004] shadow-lg transition hover:brightness-105 sm:col-span-1 sm:text-sm"
          >
            {copiedType === "card" ? "✓ تم النسخ!" : "🪪 نسخ بطاقة التوأم"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-400/35 bg-gradient-to-br from-[#0e1626] via-[#0a101d] to-[#141106] p-6 shadow-[0_0_50px_rgba(212,175,55,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-400">
            VIRAL GROWTH ENGINE · INVITE & EARN
          </p>
          <h2 className="tf-title-gold mt-1 text-2xl font-extrabold lg:text-3xl">
            🌍 محرك الإحالة والانتشار الفيروسي
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            شارك رابطك الخاص أو بطاقة توأمك العامة: يحصل كل صديق يسجل عبرك وأنت
            معاً على{" "}
            <strong className="text-amber-300">+500 ForgeGold</strong> و{" "}
            <strong className="text-emerald-300">+10 ⚡ طاقة</strong> بقيد فوري
            في دفتر الأستاذ!
          </p>
        </div>

        <Link
          href={`/u/${twinId}?ref=${encodeURIComponent(referralCode)}`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-4 py-2 text-xs font-extrabold text-emerald-200 transition hover:bg-emerald-500/25 sm:text-sm"
        >
          <span>🌐 استعراض صفحة التوأم العامة (/u/{twinId.slice(0, 6)}…)</span>
        </Link>
      </div>

      {/* KPI Row */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#070b13]/80 p-4">
          <p className="text-xs font-semibold text-slate-400">
            الأعضاء المنضمون عبرك
          </p>
          <p className="mt-1 text-2xl font-extrabold text-white">
            {stats.invitesCount} عضو
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/25 bg-[#070b13]/80 p-4">
          <p className="text-xs font-semibold text-slate-400">
            مكافآت الذهب المكتسبة
          </p>
          <p className="mt-1 text-2xl font-extrabold text-amber-300">
            +{stats.totalGoldEarned.toLocaleString("en-US")} ForgeGold
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-400/25 bg-[#070b13]/80 p-4">
          <p className="text-xs font-semibold text-slate-400">
            دفعات الطاقة المكتسبة
          </p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-300">
            +{stats.totalEnergyEarned} ⚡ Energy
          </p>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="mt-5 rounded-2xl border border-amber-400/30 bg-[#070a10]/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-300">
            🔗 رابط الدعوة الخاص بك (?ref={referralCode})
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingSlug((v) => !v);
              setCustomSlug(referralCode);
            }}
            className="text-xs font-semibold text-slate-300 underline hover:text-amber-300"
          >
            {editingSlug ? "إلغاء التخصيص" : "تخصيص اسم الكود"}
          </button>
        </div>

        {editingSlug ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              placeholder="founder"
              className="flex-1 rounded-xl border border-amber-400/40 bg-[#0e1524] px-3 py-2 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={() => void saveCustomSlug()}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-[#161004]"
            >
              حفظ الكود
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <code className="block max-w-full truncate text-xs text-slate-200 sm:text-sm" dir="ltr">
              {inviteUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyText(inviteUrl, "invite")}
              className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-1.5 text-xs font-extrabold text-amber-200 hover:bg-amber-500/25"
            >
              {copiedType === "invite" ? "✓ تم النسخ!" : "📋 نسخ الرابط"}
            </button>
          </div>
        )}
        {slugMsg ? (
          <p className="mt-2 text-xs font-semibold text-emerald-300">{slugMsg}</p>
        ) : null}
      </div>

      {/* One-Click Viral Share Buttons */}
      <div className="mt-5">
        <p className="mb-2.5 text-xs font-bold tracking-wider text-slate-300">
          ⚡ مشاركة فورية بضغطة زر واحدة (نص تسويقي جاهز + رابط بطاقة التوأم):
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-3 text-xs font-extrabold text-emerald-200 transition hover:bg-emerald-500/25 sm:text-sm"
          >
            <span>💬</span> WhatsApp
          </a>
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-3 text-xs font-extrabold text-sky-200 transition hover:bg-sky-500/25 sm:text-sm"
          >
            <span>✈️</span> Telegram
          </a>
          <a
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-xs font-extrabold text-white transition hover:bg-white/20 sm:text-sm"
          >
            <span>𝕏</span> X (Twitter)
          </a>
          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/15 px-3 py-3 text-xs font-extrabold text-blue-200 transition hover:bg-blue-500/25 sm:text-sm"
          >
            <span>💼</span> LinkedIn
          </a>
          <button
            type="button"
            onClick={() =>
              void copyText(`${marketingCopy}\n${twinCardUrl}`, "card")
            }
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f5d061] px-3 py-3 text-xs font-extrabold text-[#161004] shadow-lg transition hover:brightness-105 sm:col-span-1 sm:text-sm"
          >
            {copiedType === "card" ? "✓ تم النسخ!" : "🪪 نسخ بطاقة التوأم"}
          </button>
        </div>
      </div>
    </section>
  );
}
