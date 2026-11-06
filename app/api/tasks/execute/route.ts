import { NextResponse } from "next/server";
import { completeTaskAction } from "@/app/actions/tasks";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { taskId?: string };
    if (!body.taskId) {
      return NextResponse.json({ error: "taskId مطلوب" }, { status: 400 });
    }

    const result = await completeTaskAction(body.taskId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل تنفيذ المهمة";
    const status =
      message.includes("اشتراك") || message.includes("حد الاستدلال")
        ? 402
        : message.includes("موافقة")
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
