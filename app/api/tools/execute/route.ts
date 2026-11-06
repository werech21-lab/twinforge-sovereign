import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAiProvider } from "@/lib/ai/providers";
import {
  executeAgentToolByName,
  getAgentToolsStatus,
  getAllClaudeTools,
} from "@/lib/ai/tools";
import { checkInferenceBudget } from "@/lib/inference-budget";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ExecuteToolSchema = z.object({
  tool: z.enum([
    "perplexity_market_research",
    "firecrawl_scrape_menu",
    "playwright_portal_snapshot",
    "GMAIL_SEND_EMAIL",
    "GOOGLESHEETS_BATCH_UPDATE",
    "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
  ]),
  args: z.record(z.unknown()).default({}),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول أولاً" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    activeAiProvider: resolveAiProvider(),
    services: getAgentToolsStatus(),
    availableTools: getAllClaudeTools({ allowExternalMutations: true }).map(
      (t) => ({
        name: t.name,
        description: t.description,
      }),
    ),
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 },
      );
    }

    const budget = await checkInferenceBudget(user.id, 0.02);
    if (!budget.allowed) {
      return NextResponse.json(
        {
          error:
            budget.reason === "daily_limit_exceeded"
              ? "تم تجاوز حد الاستدلال اليومي. حاول غداً أو رقِّ باقتك."
              : "لا يوجد اشتراك نشط.",
        },
        { status: 402 },
      );
    }

    const rawBody = await request.json();
    const parsed = ExecuteToolSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات الأداة غير صالحة", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const output = await executeAgentToolByName(
      parsed.data.tool,
      parsed.data.args,
      {
        allowExternalMutations: true,
        userId: user.id,
      },
    );

    return NextResponse.json({
      ok: true,
      tool: output.toolName,
      summary: output.summaryText,
      citations: output.citations || [],
      estimatedCostUsd: output.estimatedCostUsd,
      data: output.rawResult,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "فشل تنفيذ الأداة الخارجية";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
