import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureUserReferralCode,
  REFERRAL_REWARD_ENERGY,
  REFERRAL_REWARD_FORGE_GOLD,
  resolveReferrerByCode,
  settleViralReferral,
} from "@/lib/referral-engine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const validateCode = url.searchParams.get("validate")?.trim();
    const admin = createAdminClient();

    if (validateCode) {
      const resolved = await resolveReferrerByCode(admin, validateCode);
      if (!resolved) {
        return NextResponse.json({ ok: true, valid: false });
      }
      return NextResponse.json({
        ok: true,
        valid: true,
        referralCode: resolved.referralCode,
        referrerName: resolved.displayName,
        rewardForgeGold: REFERRAL_REWARD_FORGE_GOLD,
        rewardEnergy: REFERRAL_REWARD_ENERGY,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const referralCode = await ensureUserReferralCode(
      admin,
      user.id,
      user.email,
    );

    const [{ data: invitedRows }, { data: myInviteRow }] = await Promise.all([
      admin
        .from("referrals")
        .select(
          "id, referred_user_id, reward_forge_gold, reward_energy, referrer_ledger_id, status, created_at",
        )
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("referrals")
        .select("id, referral_code, reward_forge_gold, created_at")
        .eq("referred_user_id", user.id)
        .maybeSingle(),
    ]);

    const list = invitedRows || [];
    const totalGoldEarned = list.reduce(
      (sum, r) => sum + Number(r.reward_forge_gold || REFERRAL_REWARD_FORGE_GOLD),
      0,
    );
    const totalEnergyEarned = list.reduce(
      (sum, r) => sum + Number(r.reward_energy || REFERRAL_REWARD_ENERGY),
      0,
    );

    return NextResponse.json({
      ok: true,
      referralCode,
      rewardPerInviteGold: REFERRAL_REWARD_FORGE_GOLD,
      rewardPerInviteEnergy: REFERRAL_REWARD_ENERGY,
      stats: {
        invitesCount: list.length,
        totalGoldEarned,
        totalEnergyEarned,
        wasReferred: Boolean(myInviteRow),
      },
      referrals: list,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "تعذر تحميل بيانات الإحالة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const body = (await request.json()) as {
      claimCode?: string;
      customCode?: string;
    };

    const admin = createAdminClient();

    if (body.customCode !== undefined) {
      const cleaned = body.customCode
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      if (cleaned.length < 3 || cleaned.length > 24) {
        return NextResponse.json(
          { error: "يجب أن يتكون كود الدعوة من 3 إلى 24 حرفاً إنجليزياً أو رقماً" },
          { status: 400 },
        );
      }

      const { data: taken } = await admin
        .from("users")
        .select("id")
        .ilike("referral_code", cleaned)
        .neq("id", user.id)
        .maybeSingle();

      if (taken) {
        return NextResponse.json(
          { error: "كود الدعوة هذا مستخدم بالفعل، اختر اسماً آخر" },
          { status: 409 },
        );
      }

      await admin
        .from("users")
        .update({ referral_code: cleaned, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      return NextResponse.json({ ok: true, referralCode: cleaned });
    }

    if (body.claimCode) {
      const settled = await settleViralReferral({
        admin,
        referredUserId: user.id,
        referralCode: body.claimCode,
        referredDisplayHint:
          (user.user_metadata?.full_name as string | undefined) || user.email || "",
      });

      if (!settled.rewarded) {
        const msgMap: Record<string, string> = {
          already_rewarded: "تم استلام مكافأة الدعوة مسبقاً لهذا الحساب",
          invalid_code: "كود الدعوة غير صالح",
          self_referral: "لا يمكن استخدام كود الدعوة الخاص بك لنفسك",
        };
        return NextResponse.json(
          {
            error:
              msgMap[settled.reason || ""] || "تعذر تفعيل مكافأة الدعوة",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        ok: true,
        rewarded: true,
        rewardForgeGold: REFERRAL_REWARD_FORGE_GOLD,
        rewardEnergy: REFERRAL_REWARD_ENERGY,
        referrerLedgerId: settled.referrerLedgerId,
        referredLedgerId: settled.referredLedgerId,
      });
    }

    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "فشل تنفيذ عملية الإحالة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
