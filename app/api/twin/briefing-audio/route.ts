import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_VOICES = new Set([
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      voice?: string;
    };

    const text = (body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text مطلوب" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY غير مضبوط", fallback: true },
        { status: 503 },
      );
    }

    const voiceRaw = (body.voice || "onyx").toLowerCase();
    const voice = ALLOWED_VOICES.has(voiceRaw) ? voiceRaw : "onyx";
    // حد حماية للميزانية
    const clipped = text.slice(0, 3500);

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice,
        input: clipped,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {
          error: `TTS فشل (${res.status}): ${errText.slice(0, 200)}`,
          fallback: true,
        },
        { status: 502 },
      );
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="morning-briefing.mp3"',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل توليد الصوت";
    return NextResponse.json(
      { error: message, fallback: true },
      { status: 500 },
    );
  }
}
