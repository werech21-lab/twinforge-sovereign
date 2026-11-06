"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hireListingAction } from "@/app/actions/marketplace";
import Loading from "@/components/Loading";
import { useLanguage } from "@/components/LanguageProvider";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price_earned_gems: number;
  estimated_hours: number | null;
  twin_id: string;
  created_at: string;
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("writing");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hiringId, setHiringId] = useState<string | null>(null);
  const [myTwinId, setMyTwinId] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  const loadListings = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: twin } = await supabase
        .from("twins")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setMyTwinId(twin?.id || null);
    }

    const { data } = await supabase
      .from("service_listings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    setListings((data as Listing[]) || []);
    setLoading(false);
  }, []);

  const hireListing = async (listingId: string) => {
    setError(null);
    setHiringId(listingId);
    try {
      await hireListingAction(listingId);
      router.push("/approvals");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل طلب الخدمة");
    } finally {
      setHiringId(null);
    }
  };

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const createListing = async () => {
    setError(null);
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/marketplace");
        return;
      }

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

      const { error: insertError } = await supabase.from("service_listings").insert({
        twin_id: twin.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        price_earned_gems: parseFloat(price) || 0,
        is_active: true,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setTitle("");
      setDescription("");
      setPrice("");
      setShowForm(false);
      await loadListings();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="tf-container w-full space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
            {t("market.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-300">{t("market.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg"
        >
          {showForm ? t("common.cancel") : t("market.post")}
        </button>
      </div>

      {showForm ? (
        <div className="space-y-3 tf-card p-4">
          <input
            type="text"
            placeholder="عنوان الخدمة"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-bg px-3 py-2 outline-none focus:border-accent"
          />
          <textarea
            placeholder="وصف الخدمة"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-24 w-full rounded-xl border border-white/15 bg-bg px-3 py-2 outline-none focus:border-accent"
          />
          <div className="flex gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 rounded-xl border border-white/15 bg-bg px-3 py-2 outline-none focus:border-accent"
            >
              <option value="writing">كتابة</option>
              <option value="coding">برمجة</option>
              <option value="analysis">تحليل</option>
              <option value="design">تصميم</option>
            </select>
            <input
              type="number"
              placeholder="السعر (Gems)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-32 rounded-xl border border-white/15 bg-bg px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="button"
            onClick={createListing}
            disabled={!title.trim() || saving}
            className="w-full rounded-xl bg-accent py-2 font-medium text-bg disabled:opacity-50"
          >
            {saving ? t("common.loading") : t("market.post")}
          </button>
        </div>
      ) : null}

      {listings.length === 0 ? (
        <p className="text-slate-300">{t("market.empty")}</p>
      ) : (
        <div className="space-y-3">
          {listings.map((item) => (
            <div key={item.id} className="tf-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                  ) : null}
                  <span className="mt-2 inline-block text-xs text-accent">
                    {item.category}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-accent">
                    {Number(item.price_earned_gems)}
                  </p>
                  <p className="text-xs text-slate-300">Gems</p>
                  {myTwinId && item.twin_id !== myTwinId ? (
                    <button
                      type="button"
                      disabled={hiringId === item.id}
                      onClick={() => hireListing(item.id)}
                      className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-50"
                    >
                      {hiringId === item.id ? "..." : t("market.hire")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
