/**
 * Apply supabase/migrations/*.sql in order via DATABASE_URL or DIRECT_URL
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import pg from "pg";

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

const candidates = [
  process.env.DATABASE_URL,
  process.env.DIRECT_URL,
  process.env.SUPABASE_DB_URL,
].filter(Boolean);

if (!candidates.length) {
  console.error("Missing DATABASE_URL / DIRECT_URL");
  process.exit(1);
}

let connectionString = candidates[0];

const dir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let client = null;
let lastErr = null;
for (const cs of candidates) {
  try {
    const c = new pg.Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    });
    await c.connect();
    client = c;
    connectionString = cs;
    console.log("Connected via", cs.replace(/:[^:@/]+@/, ":****@"));
    break;
  } catch (e) {
    lastErr = e;
    console.warn("Connect failed:", e.message);
  }
}
if (!client) {
  console.error("All DB URLs failed:", lastErr?.message);
  process.exit(1);
}
console.log("Applying", files.length, "migrations…");

await client.query(`
  CREATE TABLE IF NOT EXISTS public._migrations_applied (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

let ok = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const { rows } = await client.query(
    "SELECT 1 FROM public._migrations_applied WHERE filename = $1",
    [file],
  );
  if (rows.length) {
    console.log("SKIP", file);
    skipped++;
    continue;
  }

  const sql = readFileSync(join(dir, file), "utf8");
  console.log("APPLY", file);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO public._migrations_applied(filename) VALUES ($1)",
      [file],
    );
    await client.query("COMMIT");
    console.log("OK", file);
    ok++;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("FAIL", file, err.message);
    // بعض الملفات قد تفشل جزئياً إن كانت الكائنات موجودة — نحاول متابعة بعد أخطاء IF NOT EXISTS شائعة
    const msg = String(err.message || "");
    if (
      /already exists/i.test(msg) ||
      /duplicate/i.test(msg) ||
      /policy .* already exists/i.test(msg)
    ) {
      await client.query(
        "INSERT INTO public._migrations_applied(filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [file],
      );
      console.log("MARKED (already exists)", file);
      ok++;
    } else {
      failed++;
      // لا نتوقف فوراً على 0001 إن كان schema جزئياً؛ لكن نسجّل الفشل
    }
  }
}

// تحقق سريع من الجداول الأساسية
const check = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = ANY($1::text[])
  ORDER BY 1
`, [
  [
    "users",
    "twins",
    "accounts",
    "ledger_entries",
    "twin_memories",
    "night_tasks",
    "twin_decisions",
    "owner_approvals",
    "subscriptions",
    "service_listings",
  ],
]);
console.log(
  "TABLES:",
  check.rows.map((r) => r.table_name).join(", ") || "(none)",
);

await client.end();
console.log(JSON.stringify({ ok, skipped, failed }));
process.exit(failed > 0 && ok === 0 ? 1 : 0);
