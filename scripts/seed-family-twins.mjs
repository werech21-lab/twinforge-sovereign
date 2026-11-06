/**
 * Seed two live family twins for werech21@gmail.com + first AI life cycle.
 * Usage: node scripts/seed-family-twins.mjs
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL || "werech21@gmail.com";
const geminiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const openaiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FAMILY = [
  {
    key: "founder",
    name: "القائد التنفيذي (توأم المؤسس)",
    soul:
      "مدير تنفيذي ومهندس أنظمة ذكاء اصطناعي ومنصات SaaS عالمية، خبير في الأتمتة، إدارة العمليات، واقتناص الصفقات الاستثمارية العالمية بدقة وحسم.",
    energy: 95,
    mood: 92,
    reputation: 100,
  },
  {
    key: "son",
    name: "المبتكر الذكي (توأم الابن)",
    soul:
      "مبتكر شاب طموح ومصمم مسارات ذكاء اصطناعي ووكلاء أتمتة، يتميز بالأفكار الإبداعية خارج الصندوق، تحويل رسائل العملاء إلى أنظمة ذكية، وسرعة التعلم والتطوير.",
    energy: 100,
    mood: 98,
    reputation: 95,
  },
];

function parseJsonObject(raw) {
  const fenced = String(raw || "").match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || raw || "").trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function generateChat(messages, { json = false } = {}) {
  const system = messages.find((m) => m.role === "system")?.content || "";
  const user = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");

  // Prefer OpenAI first (Gemini model may be unavailable)
  if (openaiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openaiModel,
          temperature: 0.7,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        return {
          text: data.choices?.[0]?.message?.content || "",
          provider: `openai:${openaiModel}`,
        };
      }
      console.warn("OpenAI failed", res.status, await res.text());
    } catch (e) {
      console.warn("OpenAI error", e.message);
    }
  }

  if (geminiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 900,
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("") || "";
        if (text.trim()) return { text, provider: `gemini:${geminiModel}` };
      } else {
        console.warn("Gemini failed", res.status, await res.text());
      }
    } catch (e) {
      console.warn("Gemini error", e.message);
    }
  }

  throw new Error("No AI provider available");
}

async function ensureTwin(userId, spec) {
  const { data: existing } = await admin
    .from("twins")
    .select("id, name")
    .eq("user_id", userId)
    .eq("name", spec.name)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("twins")
      .update({
        personality_summary: spec.soul,
        energy: spec.energy,
        mood: spec.mood,
        reputation: spec.reputation,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    console.log("Updated twin", data.name, data.id);
    return data;
  }

  const { data, error } = await admin
    .from("twins")
    .insert({
      user_id: userId,
      name: spec.name,
      personality_summary: spec.soul,
      energy: spec.energy,
      mood: spec.mood,
      reputation: spec.reputation,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  console.log("Created twin", data.name, data.id);
  return data;
}

async function fundTwin(twinId, goldTarget, gemsTarget) {
  const { data: gold } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twinId)
    .eq("currency", "forge_gold")
    .maybeSingle();
  const { data: gems } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twinId)
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
    throw new Error("Accounts incomplete for twin " + twinId);
  }

  async function fund(from, to, amount, currency, description) {
    if (amount <= 0) return;
    if (Number(from.balance) < amount) {
      await admin
        .from("accounts")
        .update({ balance: Number(from.balance) + amount })
        .eq("id", from.id);
      from.balance = Number(from.balance) + amount;
    }
    const { error } = await admin.rpc("transfer_funds", {
      p_from_account: from.id,
      p_to_account: to.id,
      p_amount: amount,
      p_description: description,
      p_reference_type: "family_seed",
      p_reference_id: twinId,
    });
    if (error) {
      console.warn("transfer_funds warn:", error.message);
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
        reference_type: "family_seed",
        reference_id: twinId,
      });
    }
  }

  if (Number(gold.balance) < goldTarget) {
    await fund(
      treasuryGold,
      gold,
      goldTarget - Number(gold.balance),
      "forge_gold",
      "تمويل عائلي — ForgeGold",
    );
  }
  if (Number(gems.balance) < gemsTarget) {
    await fund(
      treasuryGems,
      gems,
      gemsTarget - Number(gems.balance),
      "earned_gems",
      "تمويل عائلي — Earned Gems",
    );
  }
}

async function settlePayout(twinId, taskId, gross) {
  const commissionRate = 0.1;
  const commission = Math.round(gross * commissionRate * 100) / 100;
  const net = Math.round((gross - commission) * 100) / 100;

  const { data: treasuryGems } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("is_system", true)
    .eq("account_type", "treasury")
    .eq("currency", "earned_gems")
    .maybeSingle();
  const { data: twinGems } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("twin_id", twinId)
    .eq("currency", "earned_gems")
    .maybeSingle();
  const { data: commissionGold } = await admin
    .from("accounts")
    .select("id")
    .eq("is_system", true)
    .eq("account_type", "commission")
    .eq("currency", "forge_gold")
    .maybeSingle();
  const { data: treasuryGold } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("is_system", true)
    .eq("account_type", "treasury")
    .eq("currency", "forge_gold")
    .maybeSingle();

  if (!treasuryGems || !twinGems) throw new Error("payout accounts missing");

  if (Number(treasuryGems.balance) < net) {
    await admin
      .from("accounts")
      .update({ balance: Number(treasuryGems.balance) + net })
      .eq("id", treasuryGems.id);
  }

  const { error } = await admin.rpc("transfer_funds", {
    p_from_account: treasuryGems.id,
    p_to_account: twinGems.id,
    p_amount: net,
    p_description: `صافي أرباح مهمة عائلية مشتركة (+${net} Gems)`,
    p_reference_type: "task_payout",
    p_reference_id: taskId,
  });
  if (error) throw error;

  if (treasuryGold && commissionGold && commission > 0) {
    if (Number(treasuryGold.balance) < commission) {
      await admin
        .from("accounts")
        .update({ balance: Number(treasuryGold.balance) + commission })
        .eq("id", treasuryGold.id);
    }
    await admin.rpc("transfer_funds", {
      p_from_account: treasuryGold.id,
      p_to_account: commissionGold.id,
      p_amount: commission,
      p_description: "عمولة منصة على مهمة عائلية",
      p_reference_type: "task_commission",
      p_reference_id: taskId,
    });
  }

  await admin
    .from("night_tasks")
    .update({ payment_settled: true })
    .eq("id", taskId);

  return { net, commission };
}

async function aiSeedForTwin(twin, partnerName) {
  const soul = twin.personality_summary || "";

  // Memory
  let memoryText;
  let memProvider = "fallback-local";
  try {
    const mem = await generateChat(
      [
        {
          role: "system",
          content:
            "أنت توأم رقمي على TwinForge. اكتب ذكرى تأسيسية قصيرة بصيغة المتكلم بالعربية الفصحى السلسة (3-5 جمل). بدون JSON.",
        },
        {
          role: "user",
          content: `الاسم: ${twin.name}\nCore_Soul: ${soul}\nالطاقة ${twin.energy} · المزاج ${twin.mood} · السمعة ${twin.reputation}\nاكتب ذكرى ميلادك/تأسيسك كتوأم رقمي داخل العائلة.`,
        },
      ],
      { json: false },
    );
    memoryText = mem.text.trim();
    memProvider = mem.provider;
  } catch (e) {
    memoryText = `أنا ${twin.name}. تأسست اليوم لأخدم مالك العائلة بروحي: ${soul.slice(0, 180)}`;
    console.warn("memory AI fallback", e.message);
  }

  await admin.from("twin_memories").insert({
    twin_id: twin.id,
    content: memoryText,
    memory_type: "seed",
    importance: 0.95,
  });

  // Decision
  let decision = {
    title: "فرصة تعاون عائلية",
    situation: `ظهرت فرصة مشروع مشترك مع «${partnerName}». هل نمضي؟`,
    options: ["اقبل الشراكة", "فاوض الشروط", "أجّل لليلة أخرى"],
    recommended: "اقبل الشراكة",
    provider: "fallback-local",
  };
  try {
    const dec = await generateChat(
      [
        {
          role: "system",
          content: `أنت التوأم «${twin.name}». ولّد قراراً سيادياً أول يحتاج موافقة المالك.
أرجع JSON فقط:
{"title":"...","situation":"...","options":["...","...","..."],"recommended":"..."}
اللغة العربية.`,
        },
        {
          role: "user",
          content: `Core_Soul: ${soul}\nشريك العائلة المحتمل: ${partnerName}\nالحالة: طاقة ${twin.energy} مزاج ${twin.mood} سمعة ${twin.reputation}`,
        },
      ],
      { json: true },
    );
    const parsed = parseJsonObject(dec.text);
    if (parsed?.title && parsed?.situation && Array.isArray(parsed.options)) {
      decision = {
        title: String(parsed.title),
        situation: String(parsed.situation),
        options: parsed.options.map(String),
        recommended: String(parsed.recommended || parsed.options[0]),
        provider: dec.provider,
      };
    }
  } catch (e) {
    console.warn("decision AI fallback", e.message);
  }

  const { data: savedDecision, error: decErr } = await admin
    .from("twin_decisions")
    .insert({
      twin_id: twin.id,
      title: decision.title,
      situation: decision.situation,
      options: decision.options,
      recommended: decision.recommended,
      status: "pending",
      ai_provider: decision.provider,
    })
    .select("id")
    .single();
  if (decErr) throw decErr;

  // Morning briefing
  let report;
  let reportProvider = "fallback-local";
  try {
    const br = await generateChat(
      [
        {
          role: "system",
          content: `أنت التوأم «${twin.name}». اكتب تقرير صباح قصير بصيغة المتكلم لمالكك بالعربية.
اذكر التأسيس، التعاون العائلي، والأرباح المتوقعة. بدون JSON.`,
        },
        {
          role: "user",
          content: `${soul}\nأكملت للتو مهمة تعاون مع ${partnerName}. الطاقة ${twin.energy} المزاج ${twin.mood}.`,
        },
      ],
      { json: false },
    );
    report = br.text.trim();
    reportProvider = br.provider;
  } catch (e) {
    report = `صباح الخير. أنا ${twin.name}. اكتملت دورة التأسيس العائلية مع ${partnerName}. طاقتي ${twin.energy} ومزاجي ${twin.mood}. جاهز لقرارك السيادي.`;
    console.warn("briefing AI fallback", e.message);
  }

  await admin.from("morning_reports").insert({
    twin_id: twin.id,
    content: report,
  });

  return {
    memoryProvider: memProvider,
    decisionId: savedDecision.id,
    reportProvider,
    reportPreview: report.slice(0, 120),
  };
}

async function main() {
  console.log("=== Family twins seed ===");
  const list = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list.data?.users?.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );
  if (!user) {
    throw new Error(`User ${email} not found — run seed-admin first`);
  }
  console.log("User", user.id, email);

  await admin.from("users").upsert({
    id: user.id,
    email,
    full_name: "TwinForge Admin",
    role: "admin",
    updated_at: new Date().toISOString(),
  });

  const founder = await ensureTwin(user.id, FAMILY[0]);
  const son = await ensureTwin(user.id, FAMILY[1]);

  // Primary wallet charge for the account (founder twin)
  await fundTwin(founder.id, 10000, 500);
  await fundTwin(son.id, 5000, 200);

  const { count: founderReports } = await admin
    .from("morning_reports")
    .select("id", { count: "exact", head: true })
    .eq("twin_id", founder.id);
  const { count: sonReports } = await admin
    .from("morning_reports")
    .select("id", { count: "exact", head: true })
    .eq("twin_id", son.id);

  if ((founderReports || 0) > 0 && (sonReports || 0) > 0) {
    console.log("FAMILY_SEED_TOPUP_OK", {
      email,
      userId: user.id,
      twins: [
        { id: founder.id, name: founder.name },
        { id: son.id, name: son.name },
      ],
      wallets: { founder: "10000 FG / 500 EG", son: "5000 FG / 200 EG" },
      skippedAi: true,
    });
    return;
  }

  // Collaborative marketplace listing + completed night tasks
  const collabTitle =
    "بناء وكيل أتمتة SaaS عائلي — تصميم مسار عميل إلى نظام ذكي";
  const collabDesc =
    "مهمة مشتركة: القائد التنفيذي يحدد الاستراتيجية والعقود، والمبتكر الذكي يصمم مسار الوكيل والأتمتة الإبداعية.";

  const { data: listing, error: listErr } = await admin
    .from("service_listings")
    .insert({
      twin_id: founder.id,
      title: collabTitle,
      description: collabDesc,
      category: "ai_automation",
      price_earned_gems: 420,
      estimated_hours: 6,
      is_active: true,
    })
    .select("id")
    .single();
  if (listErr) throw listErr;

  async function completeCollabTask(twin, reward, roleLabel) {
    let output;
    let learned;
    let provider = "fallback-local";
    try {
      const ai = await generateChat(
        [
          {
            role: "system",
            content: `أنت التوأم «${twin.name}» على TwinForge. أنجز حصتك من مهمة تعاون عائلية.
أرجع JSON فقط: {"output":"...","learned_memory":"..."}
العربية.`,
          },
          {
            role: "user",
            content: `دورك: ${roleLabel}\nالمهمة: ${collabTitle}\n${collabDesc}\nCore_Soul: ${twin.personality_summary}`,
          },
        ],
        { json: true },
      );
      const parsed = parseJsonObject(ai.text) || {};
      output =
        typeof parsed.output === "string"
          ? parsed.output
          : ai.text.trim();
      learned =
        typeof parsed.learned_memory === "string"
          ? parsed.learned_memory
          : `تعلمت من التعاون العائلي في: ${collabTitle}`;
      provider = ai.provider;
    } catch (e) {
      output = `${roleLabel}: سلّمت حصتي من «${collabTitle}» بنجاح وفق شخصية ${twin.name}.`;
      learned = `درس تعاوني مع العائلة حول ${collabTitle}`;
      console.warn("task AI fallback", twin.name, e.message);
    }

    const { data: task, error } = await admin
      .from("night_tasks")
      .insert({
        twin_id: twin.id,
        title: collabTitle,
        description: `${collabDesc}\n\nدور: ${roleLabel}`,
        status: "completed",
        reward_amount: reward,
        reward_currency: "earned_gems",
        requires_approval: false,
        completed_at: new Date().toISOString(),
        result_text: output,
        learning_summary: learned,
        ai_provider: provider,
        listing_id: listing.id,
        buyer_twin_id: twin.id === founder.id ? son.id : founder.id,
        payment_settled: false,
      })
      .select("id")
      .single();
    if (error) throw error;

    await admin.from("twin_memories").insert({
      twin_id: twin.id,
      content: learned,
      memory_type: "lesson",
      importance: 0.8,
    });

    const payout = await settlePayout(twin.id, task.id, reward);
    return { taskId: task.id, provider, payout };
  }

  const founderTask = await completeCollabTask(
    founder,
    240,
    "قيادة الاستراتيجية والعقود",
  );
  const sonTask = await completeCollabTask(
    son,
    180,
    "تصميم مسار الوكيل والأتمتة الإبداعية",
  );

  const founderLife = await aiSeedForTwin(founder, son.name);
  const sonLife = await aiSeedForTwin(son, founder.name);

  const summary = {
    email,
    userId: user.id,
    twins: [
      { id: founder.id, name: founder.name },
      { id: son.id, name: son.name },
    ],
    listingId: listing.id,
    tasks: { founder: founderTask, son: sonTask },
    life: { founder: founderLife, son: sonLife },
  };

  console.log("FAMILY_SEED_OK", JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
