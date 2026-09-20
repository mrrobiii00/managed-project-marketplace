// ─────────────────────────────────────────────────────────────
// ForbiddenPage (403) — احراز هویت شده ولی مجوز این بخش را ندارد
// ─────────────────────────────────────────────────────────────

import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { getDashboardPath } from '../../utils/roles'

export default function ForbiddenPage() {
  const { isAuthenticated, isLoading, user } = useAuth()

  // کاربر لاگین‌نشده نباید 403 ببیند → login
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
      <p className="text-6xl font-bold text-rose-500">۴۰۳</p>
      <h1 className="text-lg font-bold text-slate-800">دسترسی غیرمجاز</h1>
      <p className="max-w-sm text-sm leading-6 text-slate-500">
        شما وارد حساب خود شده‌اید، اما اجازه‌ی دسترسی به این بخش را ندارید.
      </p>
      {user && (
        <Link to={getDashboardPath(user.role)}>
          <Button variant="primary">بازگشت به داشبورد من</Button>
        </Link>
      )}
    </div>
  )
}
