/**
 * Ensure werech21@gmail.com exists, confirmed, password = azad777@, admin role.
 * Then verify password login via anon key.
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
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const email = (process.env.SEED_ADMIN_EMAIL || "werech21@gmail.com").toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || "azad777@";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase URL / SERVICE_ROLE / ANON key");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(target) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email || "").toLowerCase() === target,
    );
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  let user = await findUserByEmail(email);

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
    console.log("CREATED", user.id);
  } else {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), role: "admin" },
      app_metadata: { ...(user.app_metadata || {}), role: "admin" },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
    console.log("UPDATED_CONFIRMED", user.id);
  }

  await admin.from("users").upsert({
    id: user.id,
    email,
    full_name: "TwinForge Admin",
    role: "admin",
    updated_at: new Date().toISOString(),
  });

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: loginErr } =
    await client.auth.signInWithPassword({ email, password });
  if (loginErr) throw loginErr;

  console.log("LOGIN_OK", {
    email,
    userId: session.user?.id,
    emailConfirmed: !!session.user?.email_confirmed_at,
    hasAccessToken: !!session.session?.access_token,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
