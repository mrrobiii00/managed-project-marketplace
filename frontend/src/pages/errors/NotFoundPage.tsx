// ─────────────────────────────────────────────────────────────
// NotFoundPage — 404 با مسیر بازگشت
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
      <p className="text-6xl font-bold text-indigo-600">۴۰۴</p>
      <h1 className="text-lg font-bold text-slate-800">صفحه‌ی موردنظر یافت نشد</h1>
      <p className="max-w-sm text-sm leading-6 text-slate-500">
        نشانی‌ای که وارد کرده‌اید وجود ندارد یا جابه‌جا شده است.
      </p>
      <Link to="/">
        <Button variant="primary">بازگشت به صفحه‌ی اصلی</Button>
      </Link>
    </div>
  )
}
