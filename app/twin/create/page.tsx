"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function CreateTwinPage() {
  const [name, setName] = useState("");
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const router = useRouter();
  const { t } = useLanguage();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecorded(true);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecorded(false);
      setStatus(t("create.recording"));
    } catch (err) {
      setStatus(t("create.camFail"));
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setStatus("تم التسجيل. جاهز للإنشاء");
    }
  };

  const createTwin = async () => {
    if (!name.trim()) {
      setStatus("أدخل اسم التوأم أولاً");
      return;
    }
    if (!recorded) {
      setStatus("أكمل تسجيلاً قصيراً قبل الإنشاء");
      return;
    }

    setLoading(true);
    setStatus("جاري إنشاء التوأم...");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("يجب تسجيل الدخول أولاً");
        setLoading(false);
        return;
      }

      await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email ?? `${user.id}@users.local`,
          full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
        },
        { onConflict: "id" },
      );

      const { data: twin, error } = await supabase
        .from("twins")
        .insert({
          user_id: user.id,
          name: name.trim(),
          personality_summary: "تم إنشاؤه من تسجيل أولي",
          energy: 100,
          mood: 70,
        })
        .select()
        .single();

      if (error) throw error;

      // الحسابات المالية تُنشأ تلقائياً عبر trigger create_twin_accounts

      const { error: memoryError } = await supabase.from("twin_memories").insert({
        twin_id: twin.id,
        content: `تم إنشاء التوأم باسم ${name.trim()} من تسجيل أولي للمستخدم.`,
        memory_type: "seed",
        importance: 0.8,
      });

      if (memoryError) throw memoryError;

      setStatus("تم إنشاء التوأم بنجاح!");
      setTimeout(() => router.push("/twin/dashboard"), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل الإنشاء";
      setStatus("خطأ: " + message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="tf-card tf-card-gold w-full max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-sm font-bold tracking-[0.25em] text-emerald-400">
            GENESIS
          </p>
          <h1 className="tf-title-gold mt-2 text-4xl font-extrabold">
            {t("create.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-300">{t("create.subtitle")}</p>
        </div>

        <div>
          <label className="mb-2 block text-base font-semibold text-white">
            {t("create.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: أحمد الرقمي"
            className="tf-input"
          />
        </div>

        <div className="space-y-3">
          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              className="tf-btn-emerald w-full py-4"
            >
              {t("create.record")}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full rounded-xl bg-danger py-4 text-lg font-bold text-white"
            >
              {t("create.stop")}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={createTwin}
          disabled={loading || !name.trim()}
          className="tf-btn-gold w-full py-4 text-lg disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("create.submit")}
        </button>

        {status ? (
          <p className="text-center text-base font-medium text-amber-300">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
