import type { SupabaseClient } from "@supabase/supabase-js";

export const REFERRAL_REWARD_FORGE_GOLD = 500;
export const REFERRAL_REWARD_ENERGY = 10;
export const REF_COOKIE_NAME = "tf_ref";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function ensureUserReferralCode(
  admin: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<string> {
  const { data: existing } = await admin
    .from("users")
    .select("id, email, referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.referral_code) {
    return String(existing.referral_code);
  }

  const isFounderEmail =
    (email || existing?.email || "").trim().toLowerCase() ===
    "werech21@gmail.com";
  let candidate = isFounderEmail
    ? "founder"
    : `tf-${userId.replace(/-/g, "").slice(0, 8).toLowerCase()}`;

  const { data: conflict } = await admin
    .from("users")
    .select("id")
    .eq("referral_code", candidate)
    .neq("id", userId)
    .maybeSingle();

  if (conflict) {
    candidate = `tf-${userId.replace(/-/g, "").slice(0, 10).toLowerCase()}`;
  }

  await admin
    .from("users")
    .update({ referral_code: candidate, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return candidate;
}

export async function resolveReferrerByCode(
  admin: SupabaseClient,
  rawCode: string,
): Promise<{
  userId: string;
  referralCode: string;
  displayName: string;
} | null> {
  const code = (rawCode || "").trim();
  if (!code) return null;

  const { data: bySlug } = await admin
    .from("users")
    .select("id, full_name, email, referral_code")
    .ilike("referral_code", code)
    .limit(1)
    .maybeSingle();

  if (bySlug?.id) {
    return {
      userId: String(bySlug.id),
      referralCode: String(bySlug.referral_code || code.toLowerCase()),
      displayName:
        String(bySlug.full_name || "").trim() ||
        String(bySlug.email || "").split("@")[0] ||
        "مؤسس TwinForge",
    };
  }

  if (UUID_RE.test(code)) {
    const { data: twin } = await admin
      .from("twins")
      .select("id, name, user_id")
      .eq("id", code)
      .maybeSingle();

    if (twin?.user_id) {
      const refSlug = await ensureUserReferralCode(admin, String(twin.user_id));
      return {
        userId: String(twin.user_id),
        referralCode: refSlug,
        displayName: String(twin.name || "توأم TwinForge"),
      };
    }

    const { data: directUser } = await admin
      .from("users")
      .select("id, full_name, email, referral_code")
      .eq("id", code)
      .maybeSingle();

    if (directUser?.id) {
      const refSlug =
        directUser.referral_code ||
        (await ensureUserReferralCode(
          admin,
          String(directUser.id),
          directUser.email,
        ));
      return {
        userId: String(directUser.id),
        referralCode: String(refSlug),
        displayName:
          String(directUser.full_name || "").trim() ||
          String(directUser.email || "").split("@")[0] ||
          "عضو TwinForge",
      };
    }
  }

  return null;
}

export async function ensureStarterTwinAndSubscription(
  admin: SupabaseClient,
  userId: string,
  displayHint?: string,
): Promise<{ id: string; name: string; energy: number }> {
  // Ensure Sovereign $50/day subscription exists for smooth onboarding
  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .maybeSingle();

  if (!existingSub) {
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("id")
      .eq("is_active", true)
      .order("max_daily_inference_usd", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (plan?.id) {
      const now = new Date();
      const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      await admin.from("subscriptions").insert({
        user_id: userId,
        plan_id: plan.id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: nextYear.toISOString(),
      });
    }
  }

  const { data: twins } = await admin
    .from("twins")
    .select("id, name, energy")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (twins && twins.length > 0) {
    return {
      id: String(twins[0].id),
      name: String(twins[0].name),
      energy: Number(twins[0].energy ?? 90),
    };
  }

  const cleanHint = (displayHint || "").split("@")[0].trim() || "النخبة";
  const twinName = `توأم ${cleanHint}`;

  const { data: createdTwin, error } = await admin
    .from("twins")
    .insert({
      user_id: userId,
      name: twinName,
      personality_summary:
        "توأم رقمي ذكي انضم عبر دعوة السيادة الفيروسية — جاهز للأتمتة والعمل الليلي.",
      energy: 90,
      mood: 85,
      reputation: 5.0,
      status: "active",
      daily_inference_limit: 50.0,
    })
    .select("id, name, energy")
    .single();

  if (error || !createdTwin) {
    throw new Error(error?.message || "تعذر تهيئة التوأم التلقائي للمدعو");
  }

  await admin.from("twin_memories").insert({
    twin_id: createdTwin.id,
    content: `انضم التوأم «${twinName}» إلى شبكة TwinForge عبر دعوة إحالة وحصل على مكافأة الانطلاق.`,
    memory_type: "seed",
    importance: 0.85,
  });

  return {
    id: String(createdTwin.id),
    name: String(createdTwin.name),
    energy: Number(createdTwin.energy ?? 90),
  };
}

async function ensureForgeGoldAccount(
  admin: SupabaseClient,
  twinId: string,
): Promise<string> {
  const { data: acc } = await admin
    .from("accounts")
    .select("id")
    .eq("twin_id", twinId)
    .eq("currency", "forge_gold")
    .maybeSingle();

  if (acc?.id) return String(acc.id);

  const { data: inserted, error } = await admin
    .from("accounts")
    .insert({
      twin_id: twinId,
      account_type: "twin",
      currency: "forge_gold",
      balance: 0,
      is_system: false,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "تعذر إنشاء محفظة ForgeGold للتوأم");
  }
  return String(inserted.id);
}

async function ensureTreasuryGoldAccount(
  admin: SupabaseClient,
  requiredAmount: number,
): Promise<string> {
  const { data: treasury } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("account_type", "treasury")
    .eq("currency", "forge_gold")
    .eq("is_system", true)
    .limit(1)
    .maybeSingle();

  if (!treasury?.id) {
    const { data: created, error } = await admin
      .from("accounts")
      .insert({
        account_type: "treasury",
        currency: "forge_gold",
        is_system: true,
        balance: Math.max(1000000, requiredAmount * 100),
      })
      .select("id")
      .single();
    if (error || !created) {
      throw new Error(error?.message || "حساب الخزينة غير متوفر");
    }
    return String(created.id);
  }

  if (Number(treasury.balance) < requiredAmount) {
    await admin
      .from("accounts")
      .update({ balance: Number(treasury.balance) + 1000000 })
      .eq("id", treasury.id);
  }

  return String(treasury.id);
}

export async function settleViralReferral(params: {
  admin: SupabaseClient;
  referredUserId: string;
  referralCode: string;
  referredDisplayHint?: string;
}): Promise<{
  rewarded: boolean;
  reason?: string;
  referrerTwinId?: string;
  referredTwinId?: string;
  referrerLedgerId?: string | null;
  referredLedgerId?: string | null;
}> {
  const { admin, referredUserId, referralCode, referredDisplayHint } = params;

  const { data: existingRef } = await admin
    .from("referrals")
    .select("id, status, referrer_ledger_id, referred_ledger_id")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();

  if (existingRef?.status === "completed") {
    return {
      rewarded: false,
      reason: "already_rewarded",
      referrerLedgerId: existingRef.referrer_ledger_id,
      referredLedgerId: existingRef.referred_ledger_id,
    };
  }

  const referrer = await resolveReferrerByCode(admin, referralCode);
  if (!referrer) {
    return { rewarded: false, reason: "invalid_code" };
  }

  if (referrer.userId === referredUserId) {
    return { rewarded: false, reason: "self_referral" };
  }

  const [referrerTwin, referredTwin] = await Promise.all([
    ensureStarterTwinAndSubscription(admin, referrer.userId, referrer.displayName),
    ensureStarterTwinAndSubscription(admin, referredUserId, referredDisplayHint),
  ]);

  const [treasuryId, referrerAccId, referredAccId] = await Promise.all([
    ensureTreasuryGoldAccount(admin, REFERRAL_REWARD_FORGE_GOLD * 2),
    ensureForgeGoldAccount(admin, referrerTwin.id),
    ensureForgeGoldAccount(admin, referredTwin.id),
  ]);

  // 1. Atomic double-entry ledger transfer -> Referrer (+500 ForgeGold)
  const { data: refLedgerId, error: refLedgerErr } = await admin.rpc(
    "transfer_funds",
    {
      p_from_account: treasuryId,
      p_to_account: referrerAccId,
      p_amount: REFERRAL_REWARD_FORGE_GOLD,
      p_description: `مكافأة إحالة فيروسية (+${REFERRAL_REWARD_FORGE_GOLD} ForgeGold) لدعوة عضو جديد عبر كود ${referrer.referralCode}`,
      p_reference_type: "referral_bonus",
      p_reference_id: referredUserId,
    },
  );
  if (refLedgerErr) {
    throw new Error(refLedgerErr.message);
  }

  // 2. Atomic double-entry ledger transfer -> Invitee (+500 ForgeGold)
  const { data: invLedgerId, error: invLedgerErr } = await admin.rpc(
    "transfer_funds",
    {
      p_from_account: treasuryId,
      p_to_account: referredAccId,
      p_amount: REFERRAL_REWARD_FORGE_GOLD,
      p_description: `مكافأة ترحيب الانضمام عبر دعوة ${referrer.displayName} (+${REFERRAL_REWARD_FORGE_GOLD} ForgeGold)`,
      p_reference_type: "referral_welcome",
      p_reference_id: referrer.userId,
    },
  );
  if (invLedgerErr) {
    throw new Error(invLedgerErr.message);
  }

  // 3. Boost +10 Energy on both twins (capped at 100 per DB constraint)
  const newReferrerEnergy = Math.min(
    100,
    Number(referrerTwin.energy) + REFERRAL_REWARD_ENERGY,
  );
  const newReferredEnergy = Math.min(
    100,
    Number(referredTwin.energy) + REFERRAL_REWARD_ENERGY,
  );

  await Promise.all([
    admin
      .from("twins")
      .update({
        energy: newReferrerEnergy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referrerTwin.id),
    admin
      .from("twins")
      .update({
        energy: newReferredEnergy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referredTwin.id),
    admin
      .from("users")
      .update({
        referred_by: referrer.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referredUserId),
    admin.from("twin_memories").insert([
      {
        twin_id: referrerTwin.id,
        content: `نجحت حملة الانتشار الفيروسي: انضم مستخدم جديد عبر رابط دعوتك وحصلت على +${REFERRAL_REWARD_FORGE_GOLD} ForgeGold و +${REFERRAL_REWARD_ENERGY} طاقة!`,
        memory_type: "event",
        importance: 0.9,
      },
      {
        twin_id: referredTwin.id,
        content: `انضممت عبر دعوة «${referrer.displayName}» واستلمت مكافأة +${REFERRAL_REWARD_FORGE_GOLD} ForgeGold و +${REFERRAL_REWARD_ENERGY} طاقة في المحفظة.`,
        memory_type: "event",
        importance: 0.9,
      },
    ]),
  ]);

  await admin.from("referrals").upsert(
    {
      referrer_user_id: referrer.userId,
      referrer_twin_id: referrerTwin.id,
      referred_user_id: referredUserId,
      referred_twin_id: referredTwin.id,
      referral_code: referrer.referralCode,
      reward_forge_gold: REFERRAL_REWARD_FORGE_GOLD,
      reward_energy: REFERRAL_REWARD_ENERGY,
      referrer_ledger_id: (refLedgerId as string) || null,
      referred_ledger_id: (invLedgerId as string) || null,
      status: "completed",
    },
    { onConflict: "referred_user_id" },
  );

  return {
    rewarded: true,
    referrerTwinId: referrerTwin.id,
    referredTwinId: referredTwin.id,
    referrerLedgerId: (refLedgerId as string) || null,
    referredLedgerId: (invLedgerId as string) || null,
  };
}
