// ─────────────────────────────────────────────────────────────
// AuthLayout — پوسته‌ی مینیمال صفحات ورود/ثبت‌نام (کارت مرکزی)
// عمداً جدا از PublicLayout: بدون ناوبری سایت، تمرکز روی فرم
// ─────────────────────────────────────────────────────────────

import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <Link
        to="/"
        className="mb-6 flex items-center gap-2"
        aria-label="بازگشت به صفحه‌ی اصلی"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          پ
        </span>
        <span className="text-sm font-bold text-slate-800">مارکت‌پلیس پروژه‌های نرم‌افزاری</span>
      </Link>

      {/* کارت فرم — عرض محدود برای موبایل و دسکتاپ */}
      <div className="w-full max-w-md">
        <Outlet />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        <Link to="/" className="hover:text-slate-600">
          بازگشت به صفحه‌ی اصلی
        </Link>
      </p>
    </div>
  )
}
