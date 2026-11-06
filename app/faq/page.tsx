"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    q: "ما هو TwinForge؟",
    a: "منصة تتيح لك إنشاء توأم رقمي ذكي ينفذ مهامك الليلية ويكسب الأرباح بينما تنام.",
  },
  {
    q: "كيف أبدأ؟",
    a: "سجل حساباً، أنشئ توأمك من خلال تسجيل قصير، ثم اختر باقة تناسبك.",
  },
  {
    q: "ما الفرق بين ForgeGold و Earned Gems؟",
    a: "ForgeGold للاستهلاك الداخلي (طاقة، عقارات). Earned Gems أرباح قابلة للسحب عبر Wise.",
  },
  {
    q: "كيف أدفع الاشتراك؟",
    a: "عبر روابط Wise. بعد الدفع، أرسل الإيصال ليتم تفعيل اشتراكك يدوياً.",
  },
  {
    q: "كم يستغرق سحب الأرباح؟",
    a: "فترة التبريد 24-48 ساعة. الحد الأدنى للسحب 10 Earned Gems.",
  },
  {
    q: "ما هو حد الاستدلال اليومي؟",
    a: "كل باقة لها حد يومي لتكلفة الاستدلال. تجاوز الحد يمنع تنفيذ مهام إضافية حتى اليوم التالي.",
  },
  {
    q: "هل يمكنني الموافقة على المهام؟",
    a: "نعم. بعض المهام تتطلب موافقتك قبل التنفيذ. يمكنك الموافقة أو الرفض من صفحة الموافقات.",
  },
  {
    q: "كيف أستعيد طاقة التوأم؟",
    a: "من خلال استئجار عقار افتراضي. كل عقار له معدل استعادة طاقة مختلف.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="tf-container w-full space-y-8">
      <h1 className="text-3xl font-bold text-amber-400">الأسئلة الشائعة</h1>

      <div className="space-y-2">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
              >
                <span className="font-medium text-white">{item.q}</span>
                <span className="text-amber-400">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen ? (
                <p className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-400">
                  {item.a}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        <Link
          href="/contact"
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm hover:bg-amber-500"
        >
          اتصل بنا
        </Link>
        <Link
          href="/"
          className="rounded-lg bg-zinc-800 px-5 py-2 text-sm hover:bg-zinc-700"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
