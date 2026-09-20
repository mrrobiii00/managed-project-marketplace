// ─────────────────────────────────────────────────────────────
// نگاشت مرکزی نقش → مسیر داشبورد (تنها منبع حقیقت؛ جلوگیری از duplicate)
// ─────────────────────────────────────────────────────────────

import type { UserRole } from '../types/auth'

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  CLIENT: '/client/dashboard',
  SPECIALIST: '/specialist/dashboard',
  ADMIN: '/admin/dashboard',
}

/** مسیر داشبورد پیش‌فرض بر اساس نقش — پس از login/register/403 استفاده می‌شود */
export function getDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARD_PATH[role]
}
