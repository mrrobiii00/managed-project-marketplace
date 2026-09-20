// ─────────────────────────────────────────────────────────────
// navigation — منبع واحد ناوبری نقش‌محور (M14-G §4)
// آیتم‌های بدون صفحه/endpoint واقعی به‌صورت soon نمایش داده
// می‌شوند (لینک نیستند — §3/§5: لینک جعلی ساخته نمی‌شود).
// استفاده: DashboardLayout (سایدبار) — نقش از AuthContext.
// ─────────────────────────────────────────────────────────────

import type { UserRole } from '../types/auth'
import { ROLE_DASHBOARD_PATH } from './roles'

export interface NavItem {
  label: string
  /** مسیر واقعی — نبود آن یعنی صفحه هنوز ساخته نشده (soon) */
  to?: string
  /** فعال‌سازی فقط با تطابق دقیق (داشبوردها و «ایجاد پروژه») */
  end?: boolean
}

/** ناوبری هر نقش — داشبورد همیشه اولین آیتم فعال است */
export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  CLIENT: [
    { label: 'داشبورد', to: ROLE_DASHBOARD_PATH.CLIENT, end: true },
    { label: 'پروژه‌های من', to: '/client/projects' },
    { label: 'ایجاد پروژه', to: '/client/projects/new', end: true },
    { label: 'پروفایل' }, // صفحه‌ی پروفایل کارفرما هنوز وجود ندارد
  ],
  SPECIALIST: [
    { label: 'داشبورد', to: ROLE_DASHBOARD_PATH.SPECIALIST, end: true },
    { label: 'پروژه‌های پیشنهادی', to: '/specialist/recommended-projects' },
    { label: 'پروژه‌های من' }, // endpoint فهرست پروژه‌های متخصص وجود ندارد
    { label: 'وظایف' }, // endpoint فهرست وظایف متخصص وجود ندارد
    { label: 'پروفایل', to: '/specialist/profile' },
  ],
  ADMIN: [
    { label: 'داشبورد', to: ROLE_DASHBOARD_PATH.ADMIN, end: true },
    { label: 'پروژه‌ها' }, // صفحه‌ی مدیریت پروژه‌ها وجود ندارد
    { label: 'بررسی Matching' }, // صفحه‌ی بررسی تطبیق وجود ندارد
    { label: 'تیم‌ها' }, // صفحه‌ی مدیریت تیم‌ها وجود ندارد
    { label: 'کاربران' }, // صفحه‌ی مدیریت کاربران وجود ندارد
    { label: 'پروفایل' }, // صفحه‌ی پروفایل مدیر وجود ندارد
  ],
}
