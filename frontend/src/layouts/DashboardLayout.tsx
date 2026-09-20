// ─────────────────────────────────────────────────────────────
// DashboardLayout — سایدبار سمتی (RTL) + هدر + محتوای اصلی
// ناوبری بر اساس نقش کاربر (CLIENT/SPECIALIST/ADMIN)؛
// آیتم‌های بدون صفحه‌ی واقعی: غیرفعال با نشان «به‌زودی»
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Badge, roleBadge } from '../components/ui/Badge'
import { NAV_BY_ROLE } from '../utils/navigation'
import { cn } from '../utils/cn'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const role = user ? roleBadge(user.role) : null
  const navItems = user ? NAV_BY_ROLE[user.role] : []

  // بستن drawer با Escape برای دسترس‌پذیری
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          پ
        </span>
        <span className="text-xs font-bold text-slate-800">مارکت‌پلیس پروژه‌های نرم‌افزاری</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="ناوبری داشبورد">
        {navItems.map((item) =>
          item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end ?? false}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              {item.label}
            </NavLink>
          ) : (
            <span
              key={item.label}
              aria-disabled="true"
              title="در مایل‌استون‌های بعدی فعال می‌شود"
              className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400"
            >
              {item.label}
              <Badge variant="neutral">به‌زودی</Badge>
            </span>
          ),
        )}
      </nav>

      {/* ناحیه‌ی کاربر + خروج */}
      <div className="border-t border-slate-100 p-4">
        <p className="truncate text-xs font-medium text-slate-700" title={user?.email}>
          {user?.email}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {role && <Badge variant={role.variant}>{role.label}</Badge>}
          <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="خروج از حساب">
            خروج
          </Button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* سایدبار دسکتاپ — چسبیده به سمت راست (start در RTL) */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* سایدبار موبایل — drawer + overlay؛ بدون ایجاد overflow افقی */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="منوی داشبورد">
          <button
            type="button"
            aria-label="بستن منو"
            className="absolute inset-0 h-full w-full bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* دکمه‌ی منو — فقط موبایل */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="باز کردن منوی داشبورد"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-slate-800">داشبورد</h1>
          </div>

          <div className="flex items-center gap-2">
            {role && <Badge variant={role.variant}>{role.label}</Badge>}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
