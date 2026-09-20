// ─────────────────────────────────────────────────────────────
// PublicLayout — پوسته‌ی صفحات عمومی (Landing): هدر + فوتر
// ─────────────────────────────────────────────────────────────

import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2" aria-label="صفحه‌ی اصلی">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              پ
            </span>
            <span className="text-sm font-bold text-slate-800">مارکت‌پلیس پروژه‌های نرم‌افزاری</span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="ناوبری اصلی">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm">
                  ورود به داشبورد
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    ورود
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    ثبت‌نام
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-xs text-slate-500 sm:flex-row">
          <p>مارکت‌پلیس پروژه‌های نرم‌افزاری — از ثبت نیاز تا تحویل</p>
          {user && <p>کاربر جاری: {user.email}</p>}
        </div>
      </footer>
    </div>
  )
}
