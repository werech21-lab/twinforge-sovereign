import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureStarterTwinAndSubscription,
  ensureUserReferralCode,
  REF_COOKIE_NAME,
  REFERRAL_REWARD_ENERGY,
  REFERRAL_REWARD_FORGE_GOLD,
  settleViralReferral,
} from "@/lib/referral-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      referralCode?: string;
    };

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const fullName = (body.fullName || "").trim();

    const jar = await cookies();
    const cookieRef = jar.get(REF_COOKIE_NAME)?.value?.trim() || "";
    const incomingRef = (body.referralCode || cookieRef || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد وكلمة المرور مطلوبان" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email.split("@")[0],
        role: "user",
      },
      app_metadata: { role: "user" },
    });

    if (created.error) {
      const msg = created.error.message || "فشل إنشاء الحساب";
      if (/already|registered|exists/i.test(msg)) {
        const listed = await admin.auth.admin.listUsers({ perPage: 200 });
        const existing = listed.data.users.find(
          (u) => (u.email || "").toLowerCase() === email,
        );
        if (!existing) {
          return NextResponse.json({ error: msg }, { status: 400 });
        }
        const updated = await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
        });
        if (updated.error) {
          return NextResponse.json(
            { error: updated.error.message },
            { status: 400 },
          );
        }
        await admin.from("users").upsert({
          id: existing.id,
          email,
          full_name: fullName || existing.user_metadata?.full_name || "",
          updated_at: new Date().toISOString(),
        });
        await ensureUserReferralCode(admin, existing.id, email);

        let referralRewarded = false;
        if (incomingRef) {
          try {
            const settled = await settleViralReferral({
              admin,
              referredUserId: existing.id,
              referralCode: incomingRef,
              referredDisplayHint: fullName || email,
            });
            referralRewarded = settled.rewarded;
          } catch {
            // Non-blocking if referral already settled
          }
        }

        return NextResponse.json({
          ok: true,
          userId: existing.id,
          confirmed: true,
          existed: true,
          referralRewarded,
        });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const user = created.data.user;
    if (!user) {
      return NextResponse.json({ error: "لم يُرجع مستخدم" }, { status: 500 });
    }

    await admin.from("users").upsert({
      id: user.id,
      email,
      full_name: fullName || email.split("@")[0],
      updated_at: new Date().toISOString(),
    });
    await ensureUserReferralCode(admin, user.id, email);
    await ensureStarterTwinAndSubscription(admin, user.id, fullName || email);

    let referralRewarded = false;
    if (incomingRef) {
      try {
        const settled = await settleViralReferral({
          admin,
          referredUserId: user.id,
          referralCode: incomingRef,
          referredDisplayHint: fullName || email,
        });
        referralRewarded = settled.rewarded;
      } catch {
        // Non-blocking fallback
      }
    }

    const res = NextResponse.json({
      ok: true,
      userId: user.id,
      confirmed: true,
      existed: false,
      referralRewarded,
      rewardForgeGold: referralRewarded ? REFERRAL_REWARD_FORGE_GOLD : 0,
      rewardEnergy: referralRewarded ? REFERRAL_REWARD_ENERGY : 0,
    });

    if (referralRewarded) {
      res.cookies.delete(REF_COOKIE_NAME);
    }

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل التسجيل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
