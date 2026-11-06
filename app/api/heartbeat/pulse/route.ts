import { NextResponse } from "next/server";
import { pulseHeartbeatAction } from "@/app/actions/heartbeat";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { twinId?: string };
    if (!body.twinId) {
      return NextResponse.json({ error: "twinId مطلوب" }, { status: 400 });
    }

    const result = await pulseHeartbeatAction(body.twinId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "فشل توليد نبضة الحياة";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
