"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TwinBrief } from "@/lib/active-twin";

type Props = {
  twins: TwinBrief[];
  activeId: string | null;
  onSelect: (twinId: string) => void;
  compact?: boolean;
};

function twinIcon(name: string) {
  if (/ابن|son|مبتكر/i.test(name)) return "🚀";
  if (/قائد|مؤسس|founder|تنفيذي/i.test(name)) return "👑";
  return "◈";
}

export default function TwinSwitcher({
  twins,
  activeId,
  onSelect,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const active = twins.find((t) => t.id === activeId) || twins[0] || null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!twins.length) {
    return (
      <Link
        href="/twin/create"
        className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-200"
      >
        + إنشاء توأم جديد
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-2xl border border-emerald-400/35 bg-[#0f1624]/95 font-bold text-white shadow-lg transition hover:border-emerald-300 ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-base">{active ? twinIcon(active.name) : "◈"}</span>
        <span className="max-w-[160px] truncate lg:max-w-[220px]">
          {active?.name || "اختر توأماً"}
        </span>
        {active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-extrabold text-emerald-300">
            ⚡ {Math.round(Number(active.energy))}
          </span>
        ) : null}
        <span className="text-xs opacity-70">▾</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute end-0 z-[70] mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0b1220] shadow-2xl"
        >
          <div className="border-b border-white/10 px-3 py-2 text-xs font-bold tracking-widest text-amber-300">
            MULTI-TWIN SWITCHER
          </div>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto p-2">
            {twins.map((twin) => {
              const selected = twin.id === active?.id;
              return (
                <button
                  key={twin.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(twin.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition ${
                    selected
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "text-slate-100 hover:bg-white/10"
                  }`}
                >
                  <span className="text-xl">{twinIcon(twin.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {twin.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                      <span>⚡ {Math.round(Number(twin.energy))}</span>
                      {twin.mood != null ? (
                        <span>♥ {Math.round(Number(twin.mood))}</span>
                      ) : null}
                      {twin.status ? <span>· {twin.status}</span> : null}
                    </span>
                  </span>
                  {selected ? (
                    <span className="text-emerald-300">✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <Link
            href="/twin/create"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/10"
          >
            + إنشاء توأم جديد
          </Link>
        </div>
      ) : null}
    </div>
  );
}
