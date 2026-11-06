"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("أدخل جميع الحقول");
      return;
    }

    setLoading(true);
    setStatus("");

    // في المرحلة الحالية: عرض رسالة فقط
    setTimeout(() => {
      setStatus("تم إرسال رسالتك. سنتواصل معك قريباً.");
      setName("");
      setEmail("");
      setMessage("");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-xl space-y-6">
      <h1 className="text-3xl font-bold text-amber-400">اتصل بنا</h1>

      <p className="text-sm text-zinc-400">
        لديك سؤال أو اقتراح؟ أرسل لنا رسالة.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">الاسم</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">الرسالة</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="h-32 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-lg bg-amber-600 py-3 font-medium hover:bg-amber-500 disabled:opacity-50"
      >
        {loading ? "جاري الإرسال..." : "إرسال"}
      </button>

      {status ? (
        <p className="text-center text-sm text-zinc-400">{status}</p>
      ) : null}

      <Link
        href="/"
        className="block text-center text-sm text-zinc-600 hover:text-zinc-400"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
