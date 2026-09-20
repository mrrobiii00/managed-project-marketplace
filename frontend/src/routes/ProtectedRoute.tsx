// ─────────────────────────────────────────────────────────────
// ProtectedRoute — گارد مسیرهای احراز‌هویت‌شده
//
// نکته‌ی معماری: نقش از water user خوانده می‌شود؛ برای
// ClientRoute/SpecialistRoute/AdminRoute کافی است wrapper جدیدی
// با شرط user.role اضافه شود (الگوی همان Component + role prop).
// ─────────────────────────────────────────────────────────────

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from '../components/ui/Loading'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // تا پایان بررسی اولیه‌ی توکن صبر کن تا redirect اشتباه رخ ندهد
  if (isLoading) {
    return <Loading fullScreen label="در حال بررسی نشست شما…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
