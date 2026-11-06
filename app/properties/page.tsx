"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Loading from "@/components/Loading";
import { applyEnergyRecovery } from "@/lib/energy-recovery";

interface Property {
  id: string;
  name: string;
  property_type: string;
  energy_recovery_rate: number;
  daily_cost_forge_gold: number;
  description: string | null;
}

interface Rental {
  id: string;
  property_id: string;
  status: string;
  started_at: string;
}

const typeLabels: Record<string, string> = {
  room: "غرفة",
  apartment: "شقة",
  villa: "فيلا",
  office: "مكتب",
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeRental, setActiveRental] = useState<Rental | null>(null);
  const [twinId, setTwinId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/properties");
      return;
    }

    const { data: props } = await supabase
      .from("virtual_properties")
      .select("*")
      .eq("is_available", true);

    setProperties((props as Property[]) || []);

    const { data: twin } = await supabase
      .from("twins")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (twin) {
      setTwinId(twin.id);
      const { data: rental } = await supabase
        .from("twin_property_rentals")
        .select("*")
        .eq("twin_id", twin.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      setActiveRental((rental as Rental | null) ?? null);
    } else {
      setTwinId(null);
      setActiveRental(null);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rentProperty = async (propertyId: string) => {
    setError(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: twin } = await supabase
        .from("twins")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!twin) {
        setError("يجب إنشاء توأم أولاً");
        return;
      }

      if (activeRental) {
        setError("لديك عقار مستأجر حالياً");
        return;
      }

      const { error: insertError } = await supabase
        .from("twin_property_rentals")
        .insert({
          twin_id: twin.id,
          property_id: propertyId,
          status: "active",
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await loadData();
    } finally {
      setBusy(false);
    }
  };

  const recoverEnergy = async () => {
    if (!twinId) return;
    setBusy(true);
    setRecoveryMsg(null);
    setError(null);
    try {
      const result = await applyEnergyRecovery(twinId);
      if ("reason" in result && result.recovered === 0 && result.reason) {
        setRecoveryMsg(
          result.reason === "no_active_rental"
            ? "لا يوجد استئجار نشط"
            : result.reason === "nothing_to_recover"
              ? "لا توجد طاقة جديدة للاستعادة بعد"
              : String(result.reason),
        );
      } else {
        setRecoveryMsg(
          `استعادة +${result.recovered} · الطاقة الآن ${result.newEnergy} (خلال ${result.hoursElapsed} ساعة)`,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const endRental = async () => {
    if (!activeRental) return;
    setError(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("twin_property_rentals")
        .update({
          status: "ended",
          ends_at: new Date().toISOString(),
        })
        .eq("id", activeRental.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setActiveRental(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="tf-container w-full space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
        العقارات الافتراضية
      </h1>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {activeRental ? (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
          <p className="font-medium">لديك عقار مستأجر حالياً</p>
          <p className="mt-1 text-sm text-slate-300">
            بدأ في: {new Date(activeRental.started_at).toLocaleString("ar")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={recoverEnergy}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
            >
              تطبيق استعادة الطاقة
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={endRental}
              className="rounded-xl bg-danger/80 px-4 py-2 text-sm disabled:opacity-50"
            >
              إنهاء الاستئجار
            </button>
          </div>
          {recoveryMsg ? (
            <p className="mt-2 text-sm text-slate-300">{recoveryMsg}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="tf-card p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{prop.name}</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {typeLabels[prop.property_type] || prop.property_type}
                  </p>
                  {prop.description ? (
                    <p className="mt-1 text-sm text-slate-300">{prop.description}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-accent">
                    استعادة الطاقة: +{Number(prop.energy_recovery_rate)} / ساعة
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-warn">
                    {Number(prop.daily_cost_forge_gold)}
                  </p>
                  <p className="text-xs text-slate-300">ForgeGold / يوم</p>
                </div>
              </div>

              {!activeRental ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => rentProperty(prop.id)}
                  className="mt-3 w-full rounded-xl bg-accent py-2 text-sm font-medium text-bg disabled:opacity-50"
                >
                  استئجار
                </button>
              ) : null}
            </div>
          ))}
      </div>
    </div>
  );
}
