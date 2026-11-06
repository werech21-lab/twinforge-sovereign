"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LOCALE_META } from "@/lib/i18n/translations";

type LearnedMemoryItem = {
  id: string;
  content: string;
  memory_type: string;
  created_at: string;
};

type DirectMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  speaker?: string;
  provider?: string;
  timestamp: string;
};

type CouncilOutput = {
  projectTitle: string;
  founderName: string;
  sonName: string;
  founderVerdict: {
    headline: string;
    strategicPillars: string[];
    financialOutlook: string;
    roiScore: number;
  };
  sonVerdict: {
    headline: string;
    automationWorkflows: string[];
    techStack: string;
    innovationScore: number;
  };
  synergyPlan: {
    executiveSummary: string;
    actionSteps: string[];
    estimatedGems: number;
    timeline: string;
  };
  learnedPreference: string;
};

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type Props = {
  activeTwin: {
    id: string;
    name: string;
    energy: number;
    mood: number;
  };
  onMemoryAdded?: (memory: LearnedMemoryItem) => void;
  onMissionCommissioned?: () => void;
};

const DIRECT_STARTERS = [
  "ما هي أسرع مهمة عالية الربح يمكنك إنجازها الليلة؟",
  "لخّص لي نقاط قوتي كمالك بناءً على ذاكرتك الحالية",
  "جهّز لي عرض خدمة احترافي لعميل مؤسسي VIP",
];

const COUNCIL_STARTERS = [
  "إطلاق وكالة أتمتة ذكاء اصطناعي للمطاعم والمتاجر في الخليج باشتراك شهري",
  "تحويل خدمات الاستشارات الإدارية إلى منتج SaaS يعمل بوكلاء مستقلين",
  "بناء منصة تقارير سوقية يومية مدفوعة لرواد الأعمال والمستثمرين",
];

export default function TwinCommandConsole({
  activeTwin,
  onMemoryAdded,
  onMissionCommissioned,
}: Props) {
  const { locale } = useLanguage();
  const [mode, setMode] = useState<"direct" | "council">("direct");
  const [input, setInput] = useState("");
  const [interimVoice, setInterimVoice] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [council, setCouncil] = useState<CouncilOutput | null>(null);
  const [commissioning, setCommissioning] = useState(false);
  const [commissionedOk, setCommissionedOk] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setVoiceSupported(false);
    }
    return () => {
      recognitionRef.current?.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  const speakText = useCallback(
    (id: string, text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setError("متصفحك لا يدعم القراءة الصوتية المباشرة");
        return;
      }
      if (speakingId === id) {
        stopSpeaking();
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const bcp47 = locale === "ar" ? "ar-SA" : LOCALE_META[locale].bcp47;
      utter.lang = bcp47;
      utter.rate = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const matched =
        voices.find((v) => v.lang?.toLowerCase().startsWith(bcp47.toLowerCase())) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith(locale));
      if (matched) utter.voice = matched;
      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utter);
    },
    [locale, speakingId, stopSpeaking],
  );

  const toggleVoiceMic = () => {
    setError(null);
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterimVoice("");
      return;
    }

    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechCtor) {
      setVoiceSupported(false);
      setError("التعرف الصوتي المجاني متاح على متصفحي Chrome و Edge و Safari.");
      return;
    }

    try {
      stopSpeaking();
      const rec = new SpeechCtor();
      rec.lang = locale === "ar" ? "ar-SA" : LOCALE_META[locale].bcp47;
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        let finalChunk = "";
        let interimChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const res = event.results[i];
          const text = res?.[0]?.transcript || "";
          if (res?.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }
        if (finalChunk) {
          setInput((prev) => (prev ? `${prev} ${finalChunk}`.trim() : finalChunk.trim()));
          setInterimVoice("");
        } else {
          setInterimVoice(interimChunk);
        }
      };

      rec.onerror = (ev) => {
        setListening(false);
        setInterimVoice("");
        if (ev.error && ev.error !== "no-speech" && ev.error !== "aborted") {
          setError(`تعذر التقاط المايكروفون (${ev.error}). تأكد من السماح بصلاحية المايك.`);
        }
      };

      rec.onend = () => {
        setListening(false);
        setInterimVoice("");
      };

      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      setError("تعذر بدء جلسة المايكروفون في هذا المتصفح");
    }
  };

  const handleSubmit = async (customPrompt?: string) => {
    const prompt = (customPrompt ?? input).trim();
    if (!prompt || busy) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    setBusy(true);
    setError(null);
    setCommissionedOk(false);

    if (!customPrompt) setInput("");

    if (mode === "direct") {
      const userMsg: DirectMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch("/api/twin/council", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "direct",
            twinId: activeTwin.id,
            prompt,
            locale,
            history: messages.slice(-4).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "فشل الاتصال بالتوأم");

        const twinMsg: DirectMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: json.reply,
          speaker: json.twinName || activeTwin.name,
          provider: json.provider,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, twinMsg]);

        if (json.learnedMemory && onMemoryAdded) {
          onMemoryAdded(json.learnedMemory as LearnedMemoryItem);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "تعذر إتمام المحادثة");
      } finally {
        setBusy(false);
      }
      return;
    }

    // وضع مجلس التوأمين المشترك
    try {
      const res = await fetch("/api/twin/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "council",
          twinId: activeTwin.id,
          prompt,
          locale,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل عقد المجلس المشترك");

      setCouncil(json.council as CouncilOutput);
      if (json.learnedMemory && onMemoryAdded) {
        onMemoryAdded(json.learnedMemory as LearnedMemoryItem);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذر عقد مجلس التوأمين");
    } finally {
      setBusy(false);
    }
  };

  const commissionCouncilPlan = async () => {
    if (!council || commissioning) return;
    setCommissioning(true);
    setError(null);
    try {
      const res = await fetch("/api/twin/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deploy",
          twinId: activeTwin.id,
          opportunity: {
            title: `خطة المجلس المشترك: ${council.projectTitle}`,
            description: council.synergyPlan.executiveSummary,
            category: "synergy_council",
            expectedSuccessRate: Math.round(
              (council.founderVerdict.roiScore +
                council.sonVerdict.innovationScore) /
                2,
            ),
            estimatedGems: council.synergyPlan.estimatedGems,
            aiStrategy: council.synergyPlan.actionSteps.join(" | "),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل اعتماد الخطة");

      setCommissionedOk(true);
      if (json.learnedMemory && onMemoryAdded) {
        onMemoryAdded(json.learnedMemory as LearnedMemoryItem);
      }
      if (onMissionCommissioned) onMissionCommissioned();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحويل الخطة إلى مهمة");
    } finally {
      setCommissioning(false);
    }
  };

  const starters = mode === "direct" ? DIRECT_STARTERS : COUNCIL_STARTERS;

  return (
    <section className="tf-card tf-card-gold space-y-5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-0.5 text-xs font-bold tracking-wider text-amber-300">
            ◈ SOVEREIGN VOICE & SYNERGY HUB
          </span>
          <h2 className="tf-title-gold mt-1.5 text-2xl font-extrabold lg:text-3xl">
            غرفة التخاطب الصوتي ومجلس التوائم المشترك
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            تحدث صوتياً أو كتابياً مجاناً، أو اجمع «توأم المؤسس» و«توأم الابن» لإصدار خطة تنفيذية مشتركة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/15 bg-[#090e18] p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("direct");
              setError(null);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              mode === "direct"
                ? "bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f5d061] text-[#1a1408] shadow-lg"
                : "text-slate-300 hover:text-amber-300"
            }`}
          >
            🎙️ التخاطب المباشر ({activeTwin.name.split("(")[0].trim()})
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("council");
              setError(null);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              mode === "council"
                ? "bg-gradient-to-l from-emerald-600 to-emerald-400 text-[#042f1e] shadow-lg"
                : "text-slate-300 hover:text-emerald-300"
            }`}
          >
            👑🚀 مجلس التوأمين المشترك
          </button>
        </div>
      </div>

      {/* Quick Starter Chips */}
      <div className="flex flex-wrap gap-2">
        {starters.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={busy}
            onClick={() => void handleSubmit(chip)}
            className="rounded-xl border border-white/15 bg-[#0b1220]/90 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-amber-400/60 hover:text-amber-200 disabled:opacity-50"
          >
            ✦ {chip}
          </button>
        ))}
      </div>

      {/* Command Input + Free Voice Mic */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={interimVoice ? `${input} ${interimVoice}`.trim() : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={
              mode === "direct"
                ? `وجّه أمرك المباشر أو تحدث بالمايكروفون مع «${activeTwin.name}»...`
                : "اطرح فكرة مشروع أو تحدٍ تجاري ليحلله توأم المؤسس وتوأم الابن معاً..."
            }
            rows={3}
            className="tf-input resize-none pe-4"
          />
          {listening ? (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
              <span className="inline-block size-2.5 animate-ping rounded-full bg-emerald-400" />
              <span>
                جارٍ الاستماع الصوتي المباشر ({locale === "ar" ? "ar-SA" : LOCALE_META[locale].bcp47})... تحدث الآن
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleVoiceMic}
            disabled={!voiceSupported || busy}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
              listening
                ? "border-red-400 bg-red-500/20 text-red-200 shadow-[0_0_24px_rgba(248,113,113,0.35)]"
                : "border-amber-400/45 bg-[#121a2a] text-amber-200 hover:border-amber-300"
            } disabled:opacity-40`}
          >
            <span>{listening ? "⏹" : "🎙️"}</span>
            <span>
              {listening ? "إيقاف المايكروفون" : "تحدث بالمايكروفون مجاناً"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || !(input.trim() || interimVoice.trim())}
            className={`flex-1 rounded-xl px-6 py-3 text-base font-extrabold transition disabled:opacity-50 ${
              mode === "council" ? "tf-btn-emerald" : "tf-btn-gold"
            }`}
          >
            {busy
              ? mode === "council"
                ? "جاري انعقاد مجلس التوأمين..."
                : "التوأم يفكّر ويحدّث ذاكرته..."
              : mode === "council"
                ? "👑🚀 عقد مجلس التوأمين وإصدار الخطة"
                : "⚡ إرسال الأمر للتوأم"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {/* Direct Chat Stream */}
      {mode === "direct" && messages.length > 0 ? (
        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#080d17]/90 p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl p-4 ${
                m.role === "user"
                  ? "ms-auto max-w-[88%] border border-amber-400/30 bg-amber-500/10 text-amber-50"
                  : "me-auto max-w-[94%] border border-emerald-400/30 bg-[#0f1928] text-slate-100"
              }`}
            >
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-amber-300">
                  {m.role === "user" ? "👑 المالك السيادي" : `◈ ${m.speaker}`}
                </span>
                {m.role === "assistant" ? (
                  <button
                    type="button"
                    onClick={() => speakText(m.id, m.content)}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-200 hover:border-amber-300"
                  >
                    {speakingId === m.id ? "⏹ إيقاف القراءة" : "🔊 قراءة الرد صوتياً"}
                  </button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7">{m.content}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Founder & Son Synergy Council Dual Card */}
      {mode === "council" && council ? (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/35 bg-[#0b1220] px-4 py-3">
            <div>
              <span className="text-xs font-bold tracking-widest text-emerald-400">
                SYNERGY VERDICT READY
              </span>
              <h3 className="text-lg font-extrabold text-amber-300">
                {council.projectTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                speakText(
                  "council-all",
                  `قرار مجلس التوأمين حول ${council.projectTitle}. رؤية توأم المؤسس: ${council.founderVerdict.headline}. ابتكار توأم الابن: ${council.sonVerdict.headline}. الخطة التنفيذية المشتركة: ${council.synergyPlan.executiveSummary}`,
                )
              }
              className="rounded-xl border border-amber-400/45 bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-200 hover:border-amber-300"
            >
              {speakingId === "council-all"
                ? "⏹ إيقاف الصوت"
                : "🔊 استماع لقرار المجلس كاملاً"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Founder Strategic Card */}
            <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-[#19150b] via-[#101622] to-[#0b101b] p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-amber-300">
                  👑 {council.founderName}
                </span>
                <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-0.5 text-xs font-extrabold text-amber-200">
                  جدوى مالية {council.founderVerdict.roiScore}%
                </span>
              </div>
              <p className="mt-3 text-base font-bold text-white">
                {council.founderVerdict.headline}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {council.founderVerdict.strategicPillars.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400">◆</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-black/30 p-3 text-xs leading-6 text-amber-100">
                <strong className="text-amber-300">التقدير المالي: </strong>
                {council.founderVerdict.financialOutlook}
              </div>
            </div>

            {/* Son AI & Automation Card */}
            <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-[#091c18] via-[#0f1824] to-[#0b101b] p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-emerald-300">
                  🚀 {council.sonName}
                </span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-extrabold text-emerald-200">
                  قوة الأتمتة {council.sonVerdict.innovationScore}%
                </span>
              </div>
              <p className="mt-3 text-base font-bold text-white">
                {council.sonVerdict.headline}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {council.sonVerdict.automationWorkflows.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400">⚡</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-black/30 p-3 text-xs leading-6 text-emerald-100">
                <strong className="text-emerald-300">معمارية التقنية: </strong>
                {council.sonVerdict.techStack}
              </div>
            </div>
          </div>

          {/* Joint Execution Synergy Card */}
          <div className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-l from-[#141d2b] via-[#0f1a1c] to-[#19150c] p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-lg font-extrabold text-amber-300">
                ⚡ الخطة التنفيذية المشتركة المعتمدة
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300">
                  💎 عائد متوقع +{council.synergyPlan.estimatedGems} Earned Gems
                </span>
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-200">
                  ⏱ {council.synergyPlan.timeline}
                </span>
              </div>
            </div>

            <p className="mt-2 text-sm leading-7 text-slate-200">
              {council.synergyPlan.executiveSummary}
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {council.synergyPlan.actionSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs font-semibold leading-6 text-slate-100"
                >
                  <span className="me-1.5 font-extrabold text-amber-300">
                    {idx + 1}.
                  </span>
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-emerald-300">
                🧠 تعلم المجلس: {council.learnedPreference}
              </p>
              <button
                type="button"
                disabled={commissioning || commissionedOk}
                onClick={() => void commissionCouncilPlan()}
                className="tf-btn-gold px-5 py-2.5 text-sm"
              >
                {commissionedOk
                  ? "✓ تم التكليف في المهام النشطة"
                  : commissioning
                    ? "جاري التكليف..."
                    : "🚀 تكليف التوأمين بتنفيذ الخطة فوراً"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
