import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { fulfillCheckout } from "@/lib/billing/fulfill";

export const runtime = "nodejs";

function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;

  const signed = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = request.headers.get("stripe-signature");

    if (webhookSecret) {
      if (!verifyStripeSignature(payload, sig, webhookSecret)) {
        return NextResponse.json({ error: "توقيع غير صالح" }, { status: 400 });
      }
    } else if (process.env.STRIPE_SECRET_KEY) {
      // في الإنتاج يجب ضبط STRIPE_WEBHOOK_SECRET
      console.warn("STRIPE_WEBHOOK_SECRET missing — accepting event unsafely");
    }

    const event = JSON.parse(payload) as {
      type?: string;
      data?: {
        object?: {
          id?: string;
          metadata?: Record<string, string>;
          client_reference_id?: string;
          payment_status?: string;
        };
      };
    };

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true, ignored: event.type });
    }

    const session = event.data?.object;
    if (!session?.id) {
      return NextResponse.json({ error: "جلسة ناقصة" }, { status: 400 });
    }

    const sku = session.metadata?.sku;
    const userId =
      session.metadata?.user_id || session.client_reference_id || "";
    const twinId = session.metadata?.twin_id || null;

    if (!sku || !userId) {
      return NextResponse.json(
        { error: "metadata ناقصة (sku/user_id)" },
        { status: 400 },
      );
    }

    const result = await fulfillCheckout({
      userId,
      twinId,
      sku,
      sessionId: session.id,
      source: "stripe",
    });

    return NextResponse.json({ received: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "webhook failed";
    console.error("billing webhook:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
