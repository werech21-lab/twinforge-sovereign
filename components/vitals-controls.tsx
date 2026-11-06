"use client";

import { useState, useTransition } from "react";
import { update_twin_vitals } from "@/lib/actions/twins";

type Props = {
  twinId: string;
  energy: number;
  mood: number;
};

export function VitalsControls({ twinId, energy, mood }: Props) {
  const [energyValue, setEnergyValue] = useState(energy);
  const [moodValue, setMoodValue] = useState(mood);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await update_twin_vitals({
        twin_id: twinId,
        energy: energyValue,
        mood: moodValue,
      });
      setMessage(result.ok ? "تم تحديث الطاقة والمزاج" : result.error);
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-bg-elevated p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">الحالة الحيوية</h2>

      <label className="block space-y-2 text-sm">
        <span className="flex justify-between text-muted">
          الطاقة <strong className="text-fg">{energyValue.toFixed(0)}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={energyValue}
          onChange={(e) => setEnergyValue(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="flex justify-between text-muted">
          المزاج <strong className="text-fg">{moodValue.toFixed(0)}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={moodValue}
          onChange={(e) => setMoodValue(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : "تحديث الطاقة والمزاج"}
      </button>

      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
