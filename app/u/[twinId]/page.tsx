import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserReferralCode } from "@/lib/referral-engine";
import { resolveDynamicSiteUrl } from "@/lib/site-url";
import { LOCALES } from "@/lib/i18n/translations";
import ViralReferralHub from "@/components/ViralReferralHub";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PublicTwinBundle = {
  twin: {
    id: string;
    user_id: string;
    name: string;
    personality_summary: string | null;
    energy: number;
    mood: number;
    reputation: number;
    status: string;
    daily_inference_limit: number;
    created_at: string;
  };
  referralCode: string;
  completedTasksCount: number;
  services: Array<{
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    price_earned_gems: number;
  }>;
};

async function fetchPublicTwin(twinIdOrSlug: string): Promise<PublicTwinBundle | null> {
  try {
    const admin = createAdminClient();
    let twinRow: Record<string, unknown> | null = null;

    if (UUID_RE.test(twinIdOrSlug)) {
      const { data } = await admin
        .from("twins")
        .select(
          "id, user_id, name, personality_summary, energy, mood, reputation, status, daily_inference_limit, created_at",
        )
        .eq("id", twinIdOrSlug)
        .maybeSingle();
      twinRow = (data as Record<string, unknown> | null) ?? null;
    } else {
      const { data: userBySlug } = await admin
        .from("users")
        .select("id")
        .ilike("referral_code", twinIdOrSlug)
        .maybeSingle();

      if (userBySlug?.id) {
        const { data } = await admin
          .from("twins")
          .select(
            "id, user_id, name, personality_summary, energy, mood, reputation, status, daily_inference_limit, created_at",
          )
          .eq("user_id", userBySlug.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        twinRow = (data as Record<string, unknown> | null) ?? null;
      }
    }

    if (!twinRow?.id) return null;

    const twinId = String(twinRow.id);
    const userId = String(twinRow.user_id);

    const [referralCode, { count: completedCount }, { data: listings }] =
      await Promise.all([
        ensureUserReferralCode(admin, userId),
        admin
          .from("night_tasks")
          .select("id", { count: "exact", head: true })
          .eq("twin_id", twinId)
          .eq("status", "completed"),
        admin
          .from("service_listings")
          .select("id, title, description, category, price_earned_gems")
          .eq("twin_id", twinId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    return {
      twin: {
        id: twinId,
        user_id: userId,
        name: String(twinRow.name || "التوأم السيادي"),
        personality_summary: (twinRow.personality_summary as string | null) ?? null,
        energy: Number(twinRow.energy ?? 100),
        mood: Number(twinRow.mood ?? 80),
        reputation: Number(twinRow.reputation ?? 5),
        status: String(twinRow.status || "active"),
        daily_inference_limit: Number(twinRow.daily_inference_limit ?? 50),
        created_at: String(twinRow.created_at || new Date().toISOString()),
      },
      referralCode,
      completedTasksCount: completedCount ?? 0,
      services: ((listings || []) as Array<Record<string, unknown>>).map((s) => ({
        id: String(s.id),
        title: String(s.title || ""),
        description: (s.description as string | null) ?? null,
        category: (s.category as string | null) ?? null,
        price_earned_gems: Number(s.price_earned_gems ?? 0),
      })),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ twinId: string }>;
}): Promise<Metadata> {
  const { twinId } = await params;
  const siteUrl = await resolveDynamicSiteUrl();
  const bundle = await fetchPublicTwin(twinId);

  if (!bundle) {
    return {
      title: "التوأم الرقمي — TwinForge",
      description: "اصنع توأمك الرقمي مجاناً ليعمل ويكسب ليلاً عبر منصة TwinForge",
    };
  }

  const title = `${bundle.twin.name} — بطاقة التوأم الرقمي السيادي | TwinForge`;
  const description =
    bundle.twin.personality_summary?.slice(0, 155) ||
    `تعرّف على التوأم الرقمي «${bundle.twin.name}» على منصة TwinForge. سجّل الآن واحصل على +500 ForgeGold و +10 طاقة مجاناً!`;
  const canonical = `${siteUrl}/u/${bundle.twin.id}`;
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[loc] = `${canonical}?hl=${loc}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "TwinForge",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicTwinProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ twinId: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { twinId } = await params;
  const sp = await searchParams;
  const bundle = await fetchPublicTwin(twinId);

  if (!bundle) {
    notFound();
  }

  const { twin, services, completedTasksCount } = bundle;
  const activeReferralCode = sp.ref?.trim() || bundle.referralCode;
  const joinHref = `/login?signup=1&ref=${encodeURIComponent(activeReferralCode)}`;

  return (
    <div className="tf-container w-full space-y-8 pb-10">
      {/* Hero Sovereign Identity Card */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-400/45 bg-gradient-to-br from-[#0c1322] via-[#070a12] to-[#171206] p-7 shadow-[0_0_60px_rgba(212,175,55,0.16)] lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-1 text-xs font-extrabold tracking-[0.2em] text-emerald-300">
              <span>●</span> SOVEREIGN DIGITAL TWIN · VERIFIED
            </div>
            <h1 className="tf-title-gold text-4xl font-extrabold lg:text-5xl">
              {twin.name}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300">
              {twin.personality_summary ||
                "توأم رقمي مستقل يعمل بالذكاء الاصطناعي المتقدم وينفّذ المهام والخدمات المربحة في الاقتصاد الليلي لمنصة TwinForge."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span className="rounded-full border border-amber-400/45 bg-amber-500/15 px-4 py-1.5 text-sm font-extrabold text-amber-200">
              الحالة: {twin.status} · قدرة استدلال ${twin.daily_inference_limit.toFixed(0)}/يوم
            </span>
            <Link
              href={joinHref}
              className="rounded-2xl bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f5d061] px-6 py-3 text-sm font-extrabold text-[#161004] shadow-[0_0_28px_rgba(212,175,55,0.3)] transition hover:brightness-105"
            >
              🎁 انضم عبر هذا التوأم (+500 ForgeGold مجاناً)
            </Link>
          </div>
        </div>

        {/* Twin Live Metrics */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold text-slate-400">السمعة الموثقة</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-300">
              ★ {twin.reputation.toFixed(1)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold text-slate-400">الطاقة الحيوية</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-400">
              ⚡ {Math.round(twin.energy)}%
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold text-slate-400">المزاج التشغيلي</p>
            <p className="mt-1 text-2xl font-extrabold text-sky-300">
              {Math.round(twin.mood)}%
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold text-slate-400">المهام الليلية المنجزة</p>
            <p className="mt-1 text-2xl font-extrabold text-white">
              {completedTasksCount} مهمة
            </p>
          </div>
        </div>
      </section>

      {/* Active Twin Services */}
      {services.length > 0 ? (
        <section className="space-y-4">
          <h2 className="tf-title-gold text-2xl font-extrabold">
            ☾ الخدمات الذكية المتاحة من {twin.name}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="flex flex-col justify-between rounded-2xl border border-white/15 bg-[#0c1322]/90 p-5 shadow-lg"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-300">
                      {srv.category || "ai_service"}
                    </span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {srv.price_earned_gems.toFixed(0)} Earned Gems
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {srv.title}
                  </h3>
                  {srv.description ? (
                    <p className="mt-1.5 text-xs leading-6 text-slate-300">
                      {srv.description}
                    </p>
                  ) : null}
                </div>
                <Link
                  href="/marketplace"
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/10 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20"
                >
                  توظيف الخدمة في السوق الليلي ←
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* One-Click Viral Share Hub */}
      <ViralReferralHub
        mode="public"
        twinId={twin.id}
        twinName={twin.name}
        initialReferralCode={activeReferralCode}
        reputation={twin.reputation}
      />

      {/* Interactive Luxury Viral Footer Banner */}
      <Link
        href={joinHref}
        className="group block overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-l from-[#1a1304] via-[#0b131e] to-[#081a14] p-7 text-center shadow-[0_0_55px_rgba(212,175,55,0.22)] transition hover:scale-[1.01] hover:border-amber-300"
      >
        <p className="text-xs font-extrabold tracking-[0.25em] text-emerald-400">
          TWINFORGE SOVEREIGN NIGHT ECONOMY · +500 FORGEGOLD BONUS
        </p>
        <p className="mt-2 text-xl font-extrabold leading-relaxed text-amber-200 sm:text-2xl lg:text-3xl">
          ⚡ هذا التوأم الرقمي يعمل ويكسب ليلاً عبر منصة TwinForge — اصنع توأمك الرقمي مجاناً الآن!
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f5d061] px-7 py-3 text-base font-extrabold text-[#161004] shadow-xl group-hover:brightness-110">
          🚀 ابدأ مجاناً واستلم 500 ForgeGold + 10 طاقة فورية
        </span>
      </Link>
    </div>
  );
}
