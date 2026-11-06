import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      newPassword?: string;
      password?: string;
    };

    const email = (body.email || "").trim().toLowerCase();
    const newPassword = body.newPassword || body.password || "";

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "البريد وكلمة المرور الجديدة مطلوبان" },
        { status: 400 },
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    let page = 1;
    let user = null as { id: string } | null;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw error;
      const hit = data.users.find(
        (u) => (u.email || "").toLowerCase() === email,
      );
      if (hit) {
        user = hit;
        break;
      }
      if (data.users.length < 200) break;
      page += 1;
    }

    if (!user) {
      return NextResponse.json(
        { error: "لا يوجد حساب بهذا البريد" },
        { status: 404 },
      );
    }

    const updated = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    });
    if (updated.error) {
      return NextResponse.json(
        { error: updated.error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "تم تحديث كلمة المرور وتأكيد البريد بنجاح",
      userId: user.id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "فشل تحديث كلمة المرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
