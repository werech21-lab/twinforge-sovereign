"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export default function PwaInstallButton({
  fullWidth = false,
}: {
  fullWidth?: boolean;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register Service Worker safely
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) {
      setInstalled(true);
    }

    const ua = window.navigator.userAgent || "";
    setIsIos(/iphone|ipad|ipod/i.test(ua));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setGuideOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
          setDeferredPrompt(null);
        }
        return;
      } catch {
        // Fallback to manual install guide
      }
    }
    setGuideOpen((prev) => !prev);
  };

  if (installed) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 ${
          fullWidth ? "w-full py-2.5 text-sm" : ""
        }`}
      >
        ✓ التطبيق مثبّت
      </span>
    );
  }

  return (
    <div className={`relative ${fullWidth ? "w-full" : "shrink-0"}`}>
      <button
        type="button"
        onClick={() => void handleInstallClick()}
        className={`flex items-center justify-center gap-1.5 rounded-2xl border border-amber-400/50 bg-gradient-to-l from-[#8a6a12] via-[#d4af37] to-[#f5d77f] px-3.5 py-2 text-xs font-extrabold text-[#161004] shadow-[0_0_20px_rgba(212,175,55,0.25)] transition hover:brightness-105 sm:text-sm ${
          fullWidth ? "w-full py-3 text-base" : ""
        }`}
      >
        <span>📲 تثبيت التطبيق</span>
      </button>

      {guideOpen ? (
        <div className="absolute end-0 z-[70] mt-2 w-[min(92vw,330px)] rounded-2xl border border-amber-400/40 bg-[#0b101b] p-4 text-start text-slate-100 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-amber-300">
              📲 تثبيت تطبيق TwinForge مجاناً
            </p>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="rounded-lg px-2 py-0.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          {isIos ? (
            <ol className="list-decimal space-y-1.5 ps-4 text-xs leading-6 text-slate-300">
              <li>اضغط زر المشاركة (Share ⬆️) أسفل متصفح Safari.</li>
              <li>اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</li>
              <li>اضغط «إضافة» ليظهر شعار TwinForge الذهبي كتطبيق مستقل.</li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-1.5 ps-4 text-xs leading-6 text-slate-300">
              <li>
                في متصفح Chrome أو Edge، اضغط أيقونة التثبيت (⊕ أو 📲) في يسار شريط العنوان بالأعلى.
              </li>
              <li>
                أو افتح قائمة المتصفح (⋮) واختر «تثبيت تطبيق TwinForge» ليظهر على سطح المكتب أو الجوال.
              </li>
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
