/**
 * إنشاء مشرف تجريبي + توأم + رصيد تأسيسي
 * يتطلب: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY في البيئة
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL || "werech21@gmail.com";
const password = process.env.SEED_ADMIN_PASSWORD || "azad777@";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // ابحث عن مستخدم موجود أو أنشئه
  const list = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list.data?.users?.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "TwinForge Admin", role: "admin" },
      app_metadata: { role: "admin" },
    });
    if (created.error) throw created.error;
    user = created.data.user;
    console.log("Created auth user", user.id);
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { ...(user.app_metadata || {}), role: "admin" },
      user_metadata: { ...(user.user_metadata || {}), role: "admin" },
    });
    console.log("Updated existing auth user", user.id);
  }

  await admin.from("users").upsert({
    id: user.id,
    email,
    full_name: "TwinForge Admin",
    role: "admin",
    updated_at: new Date().toISOString(),
  });

  let { data: twin } = await admin
    .from("twins")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!twin) {
    const ins = await admin
      .from("twins")
      .insert({
        user_id: user.id,
        name: "توأم الأدمن",
        personality_summary:
          "توأم إداري سيادي لتجربة TwinForge — طاقة عالية وسمعة قوية.",
        energy: 100,
        mood: 80,
        reputation: 10,
        status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    twin = ins.data;
    console.log("Created twin", twin.id);
  }

  const { data: gold } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twin.id)
    .eq("currency", "forge_gold")
    .maybeSingle();
  const { data: gems } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twin.id)
    .eq("currency", "earned_gems")
    .maybeSingle();
  const { data: treasuryGold } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("is_system", true)
    .eq("account_type", "treasury")
    .eq("currency", "forge_gold")
    .maybeSingle();
  const { data: treasuryGems } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("is_system", true)
    .eq("account_type", "treasury")
    .eq("currency", "earned_gems")
    .maybeSingle();

  if (!gold || !gems || !treasuryGold || !treasuryGems) {
    throw new Error("Accounts incomplete — run migrations first");
  }

  async function fund(from, to, amount, currency, description) {
    if (Number(from.balance) < amount) {
      await admin
        .from("accounts")
        .update({ balance: Number(from.balance) + amount })
        .eq("id", from.id);
      from.balance = Number(from.balance) + amount;
    }
    const { data: ledgerId, error } = await admin.rpc("transfer_funds", {
      p_from_account: from.id,
      p_to_account: to.id,
      p_amount: amount,
      p_description: description,
      p_reference_type: "admin_seed",
      p_reference_id: null,
    });
    if (error) {
      await admin
        .from("accounts")
        .update({ balance: Number(to.balance) + amount })
        .eq("id", to.id);
      await admin.from("ledger_entries").insert({
        debit_account_id: from.id,
        credit_account_id: to.id,
        amount,
        currency,
        description,
        reference_type: "admin_seed",
      });
      console.warn("RPC fallback for", currency, error.message);
    } else {
      console.log("Ledger", currency, ledgerId);
    }
  }

  // لا نضاعف الرصيد إن كان كافياً مسبقاً
  if (Number(gold.balance) < 10000) {
    await fund(
      treasuryGold,
      gold,
      10000 - Number(gold.balance),
      "forge_gold",
      "رصيد تأسيسي مشرف — ForgeGold",
    );
  }
  if (Number(gems.balance) < 500) {
    await fund(
      treasuryGems,
      gems,
      500 - Number(gems.balance),
      "earned_gems",
      "رصيد تأسيسي مشرف — Earned Gems",
    );
  }

  await admin.from("audit_log").insert({
    user_id: user.id,
    twin_id: twin.id,
    action: "admin_seed",
    entity_type: "users",
    new_values: {
      email,
      role: "admin",
      forge_gold_target: 10000,
      earned_gems_target: 500,
    },
  });

  console.log("SEED_OK", { userId: user.id, twinId: twin.id, email });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
