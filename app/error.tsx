"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold text-red-400">حدث خطأ</h1>
        <p className="text-zinc-400">
          عذراً، حدث خطأ غير متوقع. حاول مرة أخرى.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-amber-600 px-5 py-2 text-sm hover:bg-amber-500"
          >
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="rounded-lg bg-zinc-800 px-5 py-2 text-sm hover:bg-zinc-700"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
