import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="space-y-4 text-center">
        <h1 className="text-6xl font-bold text-amber-400">404</h1>
        <p className="text-xl text-zinc-400">الصفحة غير موجودة</p>
        <p className="text-sm text-zinc-500">ربما تم نقلها أو حذفها</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-3 hover:bg-amber-500"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
