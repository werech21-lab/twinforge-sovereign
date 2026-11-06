import { NextResponse } from "next/server";
import {
  approveWithdrawalAction,
  rejectWithdrawalAction,
} from "@/app/actions/admin-withdrawals";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      adminKey?: string;
      id?: string;
      action?: "approve" | "reject";
      newValues?: Record<string, unknown>;
    };

    if (!body.adminKey || !body.id || !body.action) {
      return NextResponse.json(
        { error: "adminKey و id و action مطلوبة" },
        { status: 400 },
      );
    }

    if (body.action === "approve") {
      const result = await approveWithdrawalAction({
        adminKey: body.adminKey,
        id: body.id,
      });
      return NextResponse.json(result);
    }

    const result = await rejectWithdrawalAction({
      adminKey: body.adminKey,
      id: body.id,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل العملية";
    const status = message.includes("مشرف")
      ? 401
      : message.includes("تبريد")
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
