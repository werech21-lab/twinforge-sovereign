import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getCatalogItem } from "@/lib/billing/catalog";
import { fulfillCheckout } from "@/lib/billing/fulfill";

export const runtime = "nodejs";

function appOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function createStripeCheckoutSession(input: {
  sku: string;
  name: string;
  description: string;
  priceUsd: number;
  userId: string;
  twinId: string | null;
  origin: string;
}) {
  const key = process.env.STRIPE_SECRET_KEY!;
  const unitAmount = Math.round(input.priceUsd * 100);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${input.origin}/balances?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${input.origin}/subscribe?billing=cancel`);
  params.set("client_reference_id", input.userId);
  params.set("metadata[sku]", input.sku);
  params.set("metadata[user_id]", input.userId);
  if (input.twinId) params.set("metadata[twin_id]", input.twinId);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
  params.set("line_items[0][price_data][product_data][name]", input.name);
  params.set(
    "line_items[0][price_data][product_data][description]",
    input.description,
  );

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = (await res.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!res.ok || !json.url || !json.id) {
    throw new Error(json.error?.message || "فشل إنشاء جلسة Stripe");
  }

  return { id: json.id, url: json.url };
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مضبوط — أضف مفاتيح المشروع في .env.local" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { sku?: string };
    const sku = (body.sku || "").trim();
    const item = getCatalogItem(sku);
    if (!item) {
      return NextResponse.json({ error: "SKU غير صالح" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const { data: twin } = await supabase
      .from("twins")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (item.forgeGold > 0 && !twin) {
      return NextResponse.json(
        { error: "أنشئ توأماً أولاً قبل الشحن أو الاشتراك بمكافأة ذهب" },
        { status: 400 },
      );
    }

    const origin = appOrigin(request);
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (stripeKey) {
      const session = await createStripeCheckoutSession({
        sku: item.sku,
        name: item.name,
        description: item.description,
        priceUsd: item.priceUsd,
        userId: user.id,
        twinId: twin?.id || null,
        origin,
      });
      return NextResponse.json({
        mode: "stripe",
        sessionId: session.id,
        url: session.url,
      });
    }

    // Instant Sandbox Checkout
    const sessionId = `sandbox_${randomUUID()}`;
    const result = await fulfillCheckout({
      userId: user.id,
      twinId: twin?.id || null,
      sku: item.sku,
      sessionId,
      source: "sandbox",
    });

    return NextResponse.json({
      mode: "sandbox",
      sessionId,
      fulfilled: result,
      redirect:
        item.kind === "subscription"
          ? "/subscribe?billing=sandbox_ok"
          : "/balances?billing=sandbox_ok",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل الدفع";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    mode: process.env.STRIPE_SECRET_KEY ? "stripe" : "sandbox",
  });
}
