"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LOCALE_META } from "@/lib/i18n/translations";

type Props = {
  text: string | null | undefined;
  voice?: "onyx" | "alloy";
};

export default function BriefingAudioPlayer({ text, voice = "onyx" }: Props) {
  const { t, locale } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState<"idle" | "openai" | "webspeech">("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cleanupAudio = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  };

  const stopAll = () => {
    cleanupAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utterRef.current = null;
    setSpeaking(false);
    setMode("idle");
  };

  useEffect(() => () => stopAll(), []);

  const speakWebSpeech = (content: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      throw new Error(t("audio.webspeechMissing"));
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(content);
    const bcp47 = LOCALE_META[locale].bcp47;
    utter.lang = bcp47;
    utter.rate = 1;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const prefix = locale === "zh" ? "zh" : locale;
    const matched =
      voices.find((v) => v.lang?.toLowerCase().startsWith(bcp47.toLowerCase())) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ||
      voices.find((v) =>
        v.lang?.toLowerCase().includes(prefix === "zh" ? "zh" : prefix),
      );
    if (matched) utter.voice = matched;
    utter.onend = () => {
      setSpeaking(false);
      setMode("idle");
    };
    utter.onerror = () => {
      setSpeaking(false);
      setMode("idle");
      setError(t("audio.localFail"));
    };
    utterRef.current = utter;
    setMode("webspeech");
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const play = async () => {
    const content = (text || "").trim();
    if (!content) {
      setError(t("audio.noText"));
      return;
    }

    if (speaking) {
      stopAll();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/twin/briefing-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, voice, locale }),
      });

      const ctype = res.headers.get("content-type") || "";
      if (res.ok && ctype.includes("audio")) {
        cleanupAudio();
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setSpeaking(false);
          setMode("idle");
        };
        audio.onerror = () => {
          setSpeaking(false);
          speakWebSpeech(content);
        };
        setMode("openai");
        setSpeaking(true);
        await audio.play();
        return;
      }

      speakWebSpeech(content);
    } catch {
      try {
        speakWebSpeech(content);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("audio.playFail"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        disabled={busy || !text}
        onClick={() => void play()}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#c9a227]/40 bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f0d878] px-4 py-3 text-sm font-semibold text-[#1a1408] shadow-[0_0_24px_rgba(212,175,55,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="relative z-10">
          {speaking
            ? t("audio.stop")
            : busy
              ? t("audio.preparing")
              : t("audio.listen")}
        </span>
      </button>

      {(speaking || mode !== "idle") && (
        <div className="flex items-end justify-center gap-1 rounded-xl border border-[#c9a227]/25 bg-[#121a17] px-3 py-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`wave-bar inline-block w-1.5 rounded-full bg-gradient-to-t from-[#3dd68c] to-[#d4af37] ${
                speaking ? "animate-wave" : "opacity-40"
              }`}
              style={{
                height: `${10 + ((i * 7) % 18)}px`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
          <span className="ms-2 text-xs text-[#c9a227]">
            {mode === "openai"
              ? "OpenAI TTS"
              : mode === "webspeech"
                ? `Web Speech · ${LOCALE_META[locale].bcp47}`
                : ""}
          </span>
        </div>
      )}

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
