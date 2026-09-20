// ─────────────────────────────────────────────────────────────
// RoleGuard — گارد نقش روی مسیرهای /client/* /specialist/* /admin/*
//
// رفتار:
//   unauthenticated        → /login
//   authenticated + نقش غلط → /403
//   authenticated + نقش درست → render
// احراز هویت/Loading توسط ProtectedRoute والد پوشش داده می‌شود؛
// بررسی داخلی فقط برای ایمنی استفاده‌ی مستقل نگه داشته شده است.
// ─────────────────────────────────────────────────────────────

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from '../components/ui/Loading'
import type { UserRole } from '../types/auth'

export interface RoleGuardProps {
  /** نقش(های) مجاز برای این شاخه‌ی مسیر */
  allow: UserRole | UserRole[]
}

export default function RoleGuard({ allow }: RoleGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <Loading fullScreen label="در حال بررسی دسترسی…" />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const allowed: UserRole[] = Array.isArray(allow) ? allow : [allow]
  if (!allowed.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
